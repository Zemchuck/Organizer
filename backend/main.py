from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time

from app import models, schemas
from app.db import get_db
from app.models import Task
from app.schemas import TaskCreate, TaskRead


app = FastAPI(title="Organizer API")

app.add_middleware(CORSMiddleware,               
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Organizer API!"}

@app.get("/tasks", response_model=List[TaskRead])
def read_tasks(
    *,
    start_date: Optional[date] = Query(None, description="YYYY-MM-DD początek zakresu"),
    end_date:   Optional[date] = Query(None, description="YYYY-MM-DD koniec zakresu"),
    db: Session = Depends(get_db),
):
    """
    Zwraca listę zadań. Jeśli podano start_date i/lub end_date,
    filtruje zadania, których pole `time` wypada w podanym przedziale.
    """
    query = db.query(Task)
    
    if start_date:
        # ustawiamy początek dnia o 00:00:00
        start_dt = datetime.combine(start_date, time.min)
        query = query.filter(Task.time >= start_dt)
    
    if end_date:
        # ustawiamy koniec dnia o 23:59:59.999999
        end_dt = datetime.combine(end_date, time.max)
        query = query.filter(Task.time <= end_dt)
    
    # zwracamy posortowane wg czasu
    return query.order_by(Task.time).all()

@app.post("/tasks", response_model=TaskRead)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task."""
    task_model = models.Task(**task.dict())
    db.add(task_model)
    db.commit()
    db.refresh(task_model)
    return task_model