from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date as ddate, time as dtime, timedelta, timezone

from .db import Base, engine, get_db
from .models import Task, PriorityEnum, TaskTypeEnum
from .schemas import TaskCreate, TaskRead, TaskUpdate

# ─── create SQLite tables ─────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Calendar API")

# ─── CORS for Vite dev server (localhost:5173) ────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── helpers ───────────────────────────────────────────────────────────

def _combine(date_obj: ddate, time_obj: dtime) -> datetime:
    return datetime.combine(date_obj, time_obj)

def _create_one(db: Session, task_in: TaskCreate, when: datetime) -> Task:
    db_task = Task(
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

# ───────────────────────────────────────────────────────────────────────
#                               ENDPOINTS                               
# ───────────────────────────────────────────────────────────────────────
@app.post("/tasks", response_model=TaskRead, status_code=201)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    # Tworzymy pierwsze zadanie z datetime w UTC
    first_dt = _combine(task_in.date, task_in.time)
    created = _create_one(db, task_in, first_dt)

    # Jeśli jest powtarzanie, dodajemy kolejne wystąpienia w UTC
    if task_in.repeat_days and task_in.repeat_until:
        curr_date = task_in.date
        while curr_date <= task_in.repeat_until:
            if curr_date != task_in.date and curr_date.weekday() in task_in.repeat_days:
                dt = _combine(curr_date, task_in.time)
                _create_one(db, task_in, dt)
            curr_date += timedelta(days=1)

    return created


@app.get("/tasks", response_model=List[TaskRead])
def read_tasks(start_date: str, end_date: str, db: Session = Depends(get_db)):
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Daty w formacie YYYY-MM-DD")
    return (
        db.query(Task)
        .filter(Task.time >= start_dt)
        .filter(Task.time <= end_dt)
        .order_by(Task.time)
        .all()
    )

@app.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    data = task_update.dict(exclude_unset=True)
    if "date" in data or "time" in data:
        new_date = data.pop("date", db_task.time.date())
        new_time = data.pop("time", db_task.time.time())
        db_task.time = _combine(new_date, new_time)
    simple_fields = {
        "title": str,
        "description": str,
        "duration": int,
        "color": str,
        "status": bool,
        "priority": PriorityEnum,
        "task_type": TaskTypeEnum,
    }
    for field, _ in simple_fields.items():
        if field in data:
            setattr(db_task, field, data[field])
    db.commit()
    db.refresh(db_task)
    return db_task

@app.get("/habits/stats")
def habits_stats(db: Session = Depends(get_db)):
    total = db.query(Task).filter(Task.task_type == TaskTypeEnum.HABIT).count()
    done = db.query(Task).filter(Task.task_type == TaskTypeEnum.HABIT, Task.status.is_(True)).count()
    rate = round((done / total) * 100, 2) if total else 0
    return {"total_habits": total, "completed_habits": done, "completion_rate": rate}

@app.get("/tasks/summary")
def tasks_summary(db: Session = Depends(get_db)):
    summary = {}
    for pr in PriorityEnum:
        total = db.query(Task).filter(Task.priority == pr).count()
        done = db.query(Task).filter(Task.priority == pr, Task.status.is_(True)).count()
        summary[pr.value] = {
            "total": total,
            "completed": done,
            "completion_rate": round((done / total) * 100, 2) if total else 0,
        }
    return summary
