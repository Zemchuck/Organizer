from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from .db      import Base, engine, get_db
from .models  import Task, TaskType
from .schemas import TaskCreate, TaskRead

# ———  utworzenie tabel (SQLite)  ———
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Calendar API")

# ———  CORS (Vite 5173)  ———
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ———  helper: łączymy date + time  ———
def combine(date_str: str, time_str: str) -> datetime:
    return datetime.fromisoformat(f"{date_str}T{time_str}:00")


# ====== ENDPOINTY ======================================================

@app.post("/tasks", response_model=TaskRead, status_code=201)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    start_dt = combine(task_in.date.isoformat(), task_in.time.isoformat(timespec="minutes"))
    db_task  = Task(
        title       = task_in.title,
        time        = start_dt,
        duration    = task_in.duration,
        task_type   = task_in.task_type,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.get("/tasks", response_model=List[TaskRead])
def read_tasks(start_date: str, end_date: str, db: Session = Depends(get_db)):
    """Zwraca zadania w przedziale (włącznie)."""
    try:
        datetime.fromisoformat(start_date)
        datetime.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Daty w formacie YYYY-MM-DD")

    return (
        db.query(Task)
        .filter(Task.time >= f"{start_date} 00:00:00")
        .filter(Task.time <= f"{end_date} 23:59:59")
        .order_by(Task.time)
        .all()
    )
