from datetime import date as ddate, datetime, time as dtime, timedelta
from typing import List, Optional, Union
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..db import get_db
from ..models import Task
from ..schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(tags=["tasks"])

# ==== helpers ====

def _as_date(val: Optional[Union[str, ddate]]) -> Optional[ddate]:
    if val is None: 
        return None
    if isinstance(val, ddate):
        return val
    return ddate.fromisoformat(str(val))

def _as_time(val: Optional[Union[str, dtime]]) -> Optional[dtime]:
    if val is None:
        return None
    if isinstance(val, dtime):
        return val
    s = str(val)
    # "HH:MM" -> "HH:MM:00"
    if len(s) == 5:
        s = s + ":00"
    return dtime.fromisoformat(s)

def _combine(dt: ddate, tm: dtime) -> datetime:
    return datetime.combine(dt, tm)

def _repeat_days_to_set(days: Optional[list[int]]) -> set[int]:
    return set(days or [])

# ==== endpoints ====

@router.post("/tasks", response_model=Union[TaskRead, List[TaskRead]], status_code=201)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """
    Obsługuje:
    - zadanie pojedyncze (date + time)
    - serię cykliczną (repeat_days [+ repeat_until]) – generuje instancje na tydzień,
      a jeśli jest repeat_until — do tej daty włącznie.
    """
    if not task_in.title:
        raise HTTPException(422, detail="title is required")

    # Pydantic mógł już zrzutować typy – przyjmujemy oba warianty
    date_val = _as_date(getattr(task_in, "date", None))
    time_val = _as_time(getattr(task_in, "time", None))

    # Zadanie „bez terminu” (front zwykle go nie tworzy, ale pozwalamy)
    if not date_val or not time_val:
        row = Task(
            title=task_in.title,
            description=getattr(task_in, "description", None),
            priority=getattr(task_in, "priority", None),
            color=(getattr(task_in, "color", None) or "#CCCCCC"),
            status=bool(getattr(task_in, "status", False) or False),
            duration=getattr(task_in, "duration", None) or 60,
            project_id=getattr(task_in, "project_id", None),
            scheduled_for=None,
            time=None,
            pomodoro_count=getattr(task_in, "pomodoro_count", None) or 0,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return TaskRead.model_validate(row)

    # Pojedyncze vs seria
    series_days = _repeat_days_to_set(getattr(task_in, "repeat_days", None))
    if not series_days:
        dt = _combine(date_val, time_val)
        row = Task(
            title=task_in.title,
            description=getattr(task_in, "description", None),
            priority=getattr(task_in, "priority", None),
            color=(getattr(task_in, "color", None) or "#CCCCCC"),
            status=bool(getattr(task_in, "status", False) or False),
            duration=getattr(task_in, "duration", None) or 60,
            project_id=getattr(task_in, "project_id", None),
            scheduled_for=date_val,
            time=dt,
            pomodoro_count=getattr(task_in, "pomodoro_count", None) or 0,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return TaskRead.model_validate(row)

    # Seria cykliczna
    series_id = str(uuid.uuid4())
    repeat_until = _as_date(getattr(task_in, "repeat_until", None))

    created: list[Task] = []
    cursor = date_val
    while True:
        wd = cursor.weekday()  # 0=Pn..6=Nd
        if wd in series_days:
            dt = _combine(cursor, time_val)
            row = Task(
                series_id=series_id,
                title=task_in.title,
                description=getattr(task_in, "description", None),
                priority=getattr(task_in, "priority", None),
                color=(getattr(task_in, "color", None) or "#CCCCCC"),
                status=False,
                duration=getattr(task_in, "duration", None) or 60,
                project_id=getattr(task_in, "project_id", None),
                scheduled_for=cursor,
                time=dt,
                pomodoro_count=getattr(task_in, "pomodoro_count", None) or 0,
            )
            db.add(row)
            created.append(row)
        cursor = cursor + timedelta(days=1)
        if repeat_until and cursor > repeat_until:
            break
        # Bez repeat_until – tylko tydzień do przodu, aby nie zalać bazy
        if not repeat_until and cursor >= date_val + timedelta(days=7):
            break

    db.commit()
    for r in created:
        db.refresh(r)
    return [TaskRead.model_validate(r) for r in created]

@router.get("/tasks", response_model=List[TaskRead])
def read_tasks(
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date:   Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    s = _as_date(start_date)
    e = _as_date(end_date)
    if not (s and e):
        return []
    sdt = datetime.combine(s, datetime.min.time())
    edt = datetime.combine(e, datetime.max.time())
    rows = db.query(Task).filter(
        and_(Task.time.isnot(None), Task.time >= sdt, Task.time <= edt)
    ).order_by(Task.time).all()
    return [TaskRead.model_validate(r) for r in rows]

@router.get("/tasks/all", response_model=List[TaskRead])
def read_all_tasks(db: Session = Depends(get_db)):
    rows = db.query(Task).order_by(Task.time.is_(None), Task.time).all()
    return [TaskRead.model_validate(r) for r in rows]

@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskUpdate = Body(...), db: Session = Depends(get_db)):
    row = db.query(Task).filter(Task.id == task_id).first()
    if not row:
        raise HTTPException(404, "Task not found")

    # proste pola
    for field in ["title", "description", "priority", "status", "color",
                  "duration", "project_id", "pomodoro_count"]:
        if hasattr(payload, field):
            val = getattr(payload, field)
            if val is not None:
                setattr(row, field, val)

    # ustawienie daty/czasu (obsługa typów Pydantic/str)
    has_date = hasattr(payload, "date")
    has_time = hasattr(payload, "time")
    if has_date or has_time:
        cur_date = row.scheduled_for
        cur_time = row.time.time() if row.time else None
        new_date = _as_date(getattr(payload, "date", None)) or cur_date
        new_time = _as_time(getattr(payload, "time", None)) or cur_time
        if new_date and new_time:
            row.scheduled_for = new_date
            row.time = _combine(new_date, new_time)

    db.add(row)
    db.commit()
    db.refresh(row)
    return TaskRead.model_validate(row)

@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    row = db.query(Task).filter(Task.id == task_id).first()
    if not row:
        raise HTTPException(404, "Task not found")
    db.delete(row)
    db.commit()
    return None
