from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date as ddate, time as dtime, timedelta, timezone
import uuid

from .db import Base, engine, get_db
from .models import Task, PriorityEnum, TaskTypeEnum
from .schemas import TaskCreate, TaskRead, TaskUpdate

# ─── create SQLite tables ─────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Calendar API")

# ─── CORS for Vite dev server ────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── helpers ─────────────────────────────────────────────────────────

def _combine(date_obj: ddate, time_obj: dtime) -> datetime:
    """Łączy date i time i wymusza strefę UTC, by uniknąć przesunięć."""
    return datetime.combine(date_obj, time_obj).replace(tzinfo=timezone.utc)


def _create_one(db: Session, task_in: TaskCreate, when: datetime, series_id: Optional[str] = None) -> Task:
    """Tworzy pojedynczy rekord Task."""
    db_task = Task(
        series_id=series_id,
        title=task_in.title,
        description=task_in.description,
        priority=PriorityEnum(task_in.priority),
        task_type=TaskTypeEnum(task_in.task_type),
        color=task_in.color,
        status=False,
        time=when,
        duration=task_in.duration,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

# ─────────────────────────────────────────────────────────────────────
#                               ENDPOINTS                           
# ─────────────────────────────────────────────────────────────────────

@app.post("/tasks", response_model=TaskRead, status_code=201)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """
    Tworzy zadanie.  
    Jeśli `repeat_days` + `repeat_until` → generuje serię i nadaje wspólne `series_id`.
    """
    series_id = str(uuid.uuid4()) if task_in.repeat_days and task_in.repeat_until else None

    # pierwsze wystąpienie
    created = _create_one(db, task_in, _combine(task_in.date, task_in.time), series_id)

    # kolejne, jeśli powtarzamy
    if series_id:
        curr = task_in.date + timedelta(days=1)
        while curr <= task_in.repeat_until:
            if curr.weekday() in task_in.repeat_days:
                _create_one(db, task_in, _combine(curr, task_in.time), series_id)
            curr += timedelta(days=1)
    return created


@app.get("/tasks", response_model=List[TaskRead])
def read_tasks(
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date:   Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """
    Zwraca listę zadań.  
    • bez parametrów → pełna lista<br>
    • z `start_date` / `end_date` → zakres.
    """
    q = db.query(Task)
    if start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            end_dt   = datetime.strptime(end_date,   "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, tzinfo=timezone.utc
            )
        except ValueError:
            raise HTTPException(400, "Daty w formacie YYYY-MM-DD")
        q = q.filter(Task.time.between(start_dt, end_dt))
    return q.order_by(Task.time).all()


@app.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    series: bool = Query(False, description="Edytuj całą serię"),
    db: Session = Depends(get_db),
):
    """
    Aktualizuje jedno zadanie lub – jeśli `series=true` i posiada `series_id` – całą serię.
    """
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
        # data/time
        if "date" in data or "time" in data:
            new_date = data.get("date", t.time.date())
            new_time = data.get("time", t.time.time())
            t.time = _combine(new_date, new_time)

        # proste pola
        for field in [
            "title", "description", "duration", "color",
            "status", "priority", "task_type"
        ]:
            if field in data:
                setattr(t, field, data[field])

    db.commit()
    db.refresh(task)  # zwracamy pojedynczy (pierwszy) task
    return task


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    series: bool = Query(False, description="Usuń całą serię"),
    db: Session = Depends(get_db),
):
    """
    DELETE pojedynczego lub całej serii (`?series=true`) – działa dla każdego typu zadania,
    jeśli ma `series_id`.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    if series and task.series_id:
        db.query(Task).filter(Task.series_id == task.series_id).delete(synchronize_session=False)
    else:
        db.delete(task)

    db.commit()
    return  # 204 No Content


# --- Statystyki habitów ------------------------------------------------
@app.get("/habits/stats")
def habits_stats(db: Session = Depends(get_db)):
    total = db.query(Task).filter(Task.task_type == TaskTypeEnum.HABIT).count()
    done  = db.query(Task).filter(Task.task_type == TaskTypeEnum.HABIT, Task.status.is_(True)).count()
    rate  = round(done / total * 100, 2) if total else 0
    return {"total_habits": total, "completed_habits": done, "completion_rate": rate}


# --- Podsumowanie wg priorytetu ---------------------------------------
@app.get("/tasks/summary")
def tasks_summary(db: Session = Depends(get_db)):
    summary = {}
    for pr in PriorityEnum:
        tot = db.query(Task).filter(Task.priority == pr).count()
        don = db.query(Task).filter(Task.priority == pr, Task.status.is_(True)).count()
        summary[pr.value] = {
            "total": tot,
            "completed": don,
            "completion_rate": round(don / tot * 100, 2) if tot else 0,
        }
    return summary


# --- Pełna lista (bez zakresu) ----------------------------------------
@app.get("/tasks/all", response_model=List[TaskRead])
def read_all_tasks(db: Session = Depends(get_db)):
    """Zwraca pełną listę zadań posortowaną rosnąco po czasie."""
    return db.query(Task).order_by(Task.time).all()