from datetime import date as ddate, datetime, timedelta, timezone
from typing import List, Optional, Union
import uuid

from fastapi import FastAPI, Depends, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import and_

from .db import Base, engine, get_db
from .models import Task, Project, Goal, Habit, PriorityEnum, HabitLog
from .schemas import (
    # tasks
    TaskCreate, TaskRead, TaskUpdate,
    # projects
    ProjectCreate, ProjectRead, ProjectUpdate,
    # goals/habits
    GoalCreate, GoalRead, GoalUpdate,
    HabitCreate, HabitRead, HabitUpdate,
    # habit logs
    HabitLogCreate, HabitProgressRead
)

# ───────────────── init ─────────────────
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Organizer API (Projects & Goals)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ───────────────── helpers ─────────────────
def _combine(date_obj, time_obj) -> datetime:
    """date+time → UTC datetime (bez przesunięć TZ)."""
    return datetime.combine(date_obj, time_obj).replace(tzinfo=timezone.utc)

def _append_task_order(db: Session, t: Task):
    # ustaw order na koniec w ramach danego project_id (łącznie z None)
    last = (
        db.query(Task)
        .filter(Task.project_id == t.project_id)
        .order_by(Task.order.desc()).first()
    )
    t.order = (last.order or 0) + 1 if last else 0

def _append_habit_order(db: Session, h: Habit):
    last = (
        db.query(Habit)
        .filter(Habit.goal_id == h.goal_id)
        .order_by(Habit.order.desc()).first()
    )
    h.order = (last.order or 0) + 1 if last else 0

def _days_to_mask(days: List[int]) -> int:
    mask = 0
    for d in days or []:
        if d < 0 or d > 6:
            raise ValueError("repeat_days musi zawierać wartości 0..6")
        mask |= (1 << d)  # 0=Pn … 6=Nd
    return mask

def _mask_to_days(mask: int) -> List[int]:
    return [d for d in range(7) if mask & (1 << d)]


# ───────────────── TASKS ─────────────────
@app.post("/tasks", response_model=Union[TaskRead, List[TaskRead]], status_code=201)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """
    • project_id jest opcjonalne (task może być „luźny”).
    • Bez repeat_days/repeat_until:
        - jeśli date & time są podane → zaplanowane,
        - jeśli oba puste → bez terminu (time=NULL).
    • Z repeat_days + repeat_until → seria (wymagane date & time).
    """
    # jeżeli ktoś poda project_id – upewnij się, że projekt istnieje
    if task_in.project_id is not None:
        proj = db.query(Project).filter(Project.id == task_in.project_id).first()
        if proj is None:
            raise HTTPException(404, "Project not found")

    has_series = bool(task_in.repeat_days and task_in.repeat_until)

    def _build_one(when: Optional[datetime], series_id: Optional[str]) -> Task:
        t = Task(
            series_id=series_id,
            title=task_in.title,
            description=task_in.description,
            priority=PriorityEnum(task_in.priority) if task_in.priority is not None else PriorityEnum.NOT_URGENT_NOT_IMPORTANT,
            color=task_in.color or "#CCCCCC",
            status=False,
            time=when,                       # może być None
            duration=task_in.duration,
            project_id=task_in.project_id,   # może być None
            pomodoro_count=task_in.pomodoro_count or 0,
        )
        _append_task_order(db, t)
        return t

    if has_series:
        if not (task_in.date and task_in.time):
            raise HTTPException(400, "Seria wymaga jednocześnie pól date i time.")
        if task_in.repeat_until < task_in.date:
            raise HTTPException(400, "repeat_until musi być ≥ date")

        sid = str(uuid.uuid4())
        created: List[Task] = []
        curr = task_in.date
        while curr <= task_in.repeat_until:
            if curr.weekday() in task_in.repeat_days:
                t = _build_one(_combine(curr, task_in.time), sid)
                db.add(t); created.append(t)
            curr += timedelta(days=1)

        if not created:
            raise HTTPException(400, "Brak dopasowanych dni (repeat_days).")

        db.commit()
        for t in created:
            db.refresh(t)
        return created

    when = _combine(task_in.date, task_in.time) if (task_in.date and task_in.time) else None
    t = _build_one(when, None)
    db.add(t); db.commit(); db.refresh(t)
    return t


@app.get("/tasks", response_model=List[TaskRead])
def read_tasks(
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date:   Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    q = db.query(Task)
    if start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            end_dt   = datetime.strptime(end_date,   "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(400, "Daty w formacie YYYY-MM-DD")
        q = q.filter(Task.time.between(start_dt, end_dt))
        return q.order_by(Task.time).all()
    return q.order_by(Task.time.is_(None), Task.time).all()


@app.get("/tasks/all", response_model=List[TaskRead])
def read_all_tasks(db: Session = Depends(get_db)):
    return db.query(Task).order_by(Task.time.is_(None), Task.time).all()


@app.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    series: bool = Query(False, description="Edytuj całą serię (jeśli ma series_id)"),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    data = task_update.dict(exclude_unset=True)
    targets = (
        db.query(Task).filter(Task.series_id == task.series_id).all()
        if series and task.series_id
        else [task]
    )

    for t in targets:
        # termin: ustaw/wyczyść
        if "date" in data or "time" in data:
            if ("date" in data and data["date"] is None) and ("time" in data and data["time"] is None):
                t.time = None
            else:
                new_date = data.get("date")
                new_time = data.get("time")
                if new_date and new_time:
                    t.time = _combine(new_date, new_time)
                elif bool(new_date) ^ bool(new_time):
                    raise HTTPException(400, "Podaj jednocześnie date i time, albo wyczyść oba (null).")

        for field in [
            "title","description","duration","color","status",
            "priority","project_id","scheduled_for","order",
            "pomodoro_count",
        ]:
            if field in data:
                setattr(t, field, data[field])

    db.commit(); db.refresh(task); return task


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    series: bool = Query(False, description="Usuń całą serię (jeśli ma series_id)"),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    if series and task.series_id:
        db.query(Task).filter(Task.series_id == task.series_id).delete(synchronize_session=False)
    else:
        db.delete(task)
    db.commit()


# ───────────────── PROJECTS ─────────────────
@app.post("/projects", response_model=ProjectRead, status_code=201)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    proj = Project(**project_in.dict())
    db.add(proj); db.commit(); db.refresh(proj)
    return proj

@app.get("/projects", response_model=List[ProjectRead])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@app.patch("/projects/{project_id}/reorder", response_model=ProjectRead)
def reorder_tasks(
    project_id: int,
    task_ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    current_ids = {t.id for t in tasks}
    if set(task_ids) != current_ids:
        raise HTTPException(400, "Lista task_ids nie pokrywa się z zadaniami projektu")

    id_to_task = {t.id: t for t in tasks}
    for idx, tid in enumerate(task_ids):
        id_to_task[tid].order = idx

    db.commit(); db.refresh(proj); return proj


# ───────────────── GOALS / HABITS ─────────────────
@app.post("/goals", response_model=GoalRead, status_code=201)
def create_goal(goal_in: GoalCreate, db: Session = Depends(get_db)):
    goal = Goal(**goal_in.dict())
    db.add(goal); db.commit(); db.refresh(goal)
    return goal

@app.get("/goals", response_model=List[GoalRead])
def list_goals(db: Session = Depends(get_db)):
    return db.query(Goal).all()

@app.put("/goals/{goal_id}", response_model=GoalRead)
def update_goal(goal_id: int, upd: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    for k, v in upd.dict(exclude_unset=True).items():
        setattr(goal, k, v)
    db.commit(); db.refresh(goal); return goal

@app.delete("/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    db.delete(goal); db.commit()


@app.post("/habits", response_model=HabitRead, status_code=201)
def create_habit(h_in: HabitCreate, db: Session = Depends(get_db)):
    tod = datetime.combine(h_in.start_date, h_in.time_of_day).replace(tzinfo=timezone.utc)
    h = Habit(
        title=h_in.title,
        description=h_in.description,
        color=h_in.color or "#CCCCCC",
        active=True,
        start_date=h_in.start_date,
        time_of_day=tod,
        duration=h_in.duration,
        days_mask=_days_to_mask(h_in.repeat_days),
        repeat_until=h_in.repeat_until,
        goal_id=h_in.goal_id,
    )
    _append_habit_order(db, h)
    db.add(h); db.commit(); db.refresh(h)
    return HabitRead(
        id=h.id,
        title=h.title,
        description=h.description,
        color=h.color,
        active=h.active,
        goal_id=h.goal_id,
        order=h.order,
        start_date=h.start_date,
        time_of_day=h.time_of_day.time(),
        duration=h.duration,
        repeat_until=h.repeat_until,
        repeat_days=_mask_to_days(h.days_mask),
    )


@app.get("/habits", response_model=List[HabitRead])
def list_habits(goal_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Habit)
    if goal_id:
        q = q.filter(Habit.goal_id == goal_id)
    items = q.order_by(Habit.goal_id, Habit.order).all()
    result: List[HabitRead] = []
    for h in items:
        result.append(HabitRead(
            id=h.id, title=h.title, description=h.description,
            color=h.color, active=h.active, goal_id=h.goal_id, order=h.order,
            start_date=h.start_date, time_of_day=h.time_of_day.time(),
            duration=h.duration, repeat_until=h.repeat_until,
            repeat_days=_mask_to_days(h.days_mask),
        ))
    return result


@app.patch("/habits/{habit_id}", response_model=HabitRead)
def update_habit(habit_id: int, upd: HabitUpdate, db: Session = Depends(get_db)):
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h:
        raise HTTPException(404, "Habit not found")

    data = upd.dict(exclude_unset=True)

    # aktualizacja czasu (jeśli podany)
    if "time_of_day" in data and data["time_of_day"] is not None:
        h.time_of_day = datetime.combine(h.start_date, data["time_of_day"]).replace(tzinfo=timezone.utc)

    # aktualizacja powtarzania (repeat_days -> maska)
    if "repeat_days" in data and data["repeat_days"] is not None:
        h.days_mask = _days_to_mask(data["repeat_days"])

    for field in ["title","description","color","active","goal_id","order",
                  "start_date","duration","repeat_until"]:
        if field in data:
            setattr(h, field, data[field])

    db.commit(); db.refresh(h)
    return HabitRead(
        id=h.id,
        title=h.title,
        description=h.description,
        color=h.color,
        active=h.active,
        goal_id=h.goal_id,
        order=h.order,
        start_date=h.start_date,
        time_of_day=h.time_of_day.time(),
        duration=h.duration,
        repeat_until=h.repeat_until,
        repeat_days=_mask_to_days(h.days_mask),
    )


@app.delete("/habits/{habit_id}", status_code=204)
def delete_habit(habit_id: int, db: Session = Depends(get_db)):
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h:
        raise HTTPException(404, "Habit not found")
    db.delete(h); db.commit()


@app.get("/habits/stats")
def habits_stats(db: Session = Depends(get_db)):
    total = db.query(Habit).count()
    active = db.query(Habit).filter(Habit.active.is_(True)).count()
    return {"total_habits": total, "active_habits": active}

# ───────── HABIT LOGS + PROGRESS ─────────

def _week_bounds(today: ddate) -> tuple[ddate, ddate]:
    # poniedziałek..niedziela dla „dzisiaj”
    start = today - timedelta(days=today.weekday())  # 0=Mon
    end = start + timedelta(days=6)
    return start, end

def _mask_to_days(mask: int) -> list[int]:
    # jeśli masz już taką funkcję wyżej – usuń duplikat
    return [i for i in range(7) if (mask >> i) & 1]

@app.post("/habits/{habit_id}/logs", status_code=201)
def mark_habit(habit_id: int, body: HabitLogCreate, db: Session = Depends(get_db)):
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h:
        raise HTTPException(404, "Habit not found")
    log = HabitLog(habit_id=habit_id, done_on=body.done_on)
    db.add(log)
    try:
        db.commit()
    except Exception:
        db.rollback()  # duplikat – traktuj idempotentnie
    return {"ok": True}

@app.delete("/habits/{habit_id}/logs/{done_on}", status_code=204)
def unmark_habit(habit_id: int, done_on: ddate, db: Session = Depends(get_db)):
    row = db.query(HabitLog).filter(
        HabitLog.habit_id == habit_id, HabitLog.done_on == done_on
    ).first()
    if row:
        db.delete(row)
        db.commit()

@app.get("/habits/progress", response_model=list[HabitProgressRead])
def habits_progress(db: Session = Depends(get_db)):
    today = ddate.today()
    week_start, week_end = _week_bounds(today)

    habits = db.query(Habit).all()
    if not habits:
        return []

    # pobierz logi od minimalnej start_date (wystarczy do wyliczenia serii)
    min_date = min(h.start_date for h in habits)
    logs = db.query(HabitLog).filter(HabitLog.done_on >= min_date).all()

    # indeks: habit_id -> set(dat)
    by_habit: dict[int, set[ddate]] = {}
    for lg in logs:
        by_habit.setdefault(lg.habit_id, set()).add(lg.done_on)

    out: list[HabitProgressRead] = []

    for h in habits:
        days = _mask_to_days(h.days_mask or 0)

        # target tygodniowy = ile zaplanowanych dni z tego habit-u wpada w bieżący tydzień i mieści się w [start_date, repeat_until]
        target = 0
        for d in days:
            # d = 0..6, Monday..Sunday; policz faktyczną datę tego dnia w bieżącym tygodniu
            day = week_start + timedelta(days=(d - week_start.weekday()) % 7)
            if day < h.start_date:
                continue
            if h.repeat_until and day > h.repeat_until:
                continue
            if week_start <= day <= week_end:
                target += 1

        week_done = sum(1 for d in (by_habit.get(h.id) or set()) if week_start <= d <= week_end)

        # seria: cofaj się dzień po dniu, licząc tylko dni zaplanowane w 'days'
        streak = 0
        cursor = today
        if h.repeat_until and cursor > h.repeat_until:
            cursor = h.repeat_until
        while cursor >= h.start_date:
            if cursor.weekday() not in days:
                cursor -= timedelta(days=1)
                continue
            if cursor in (by_habit.get(h.id) or set()):
                streak += 1
                cursor -= timedelta(days=1)
            else:
                break

        out.append(HabitProgressRead(
            habit_id=h.id,
            streak=streak,
            week_done=week_done,
            week_target=target
        ))

    return out
