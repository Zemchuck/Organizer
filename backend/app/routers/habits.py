# backend/app/routers/habits.py
from datetime import date as ddate, time as dtime, datetime as dt
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..schemas import (
    HabitCreate, HabitRead, HabitUpdate,
    HabitLogCreate, HabitProgressRead
)

router = APIRouter(prefix="", tags=["habits"])

# -------- helpers --------

def _habit_to_read(h: models.Habit) -> HabitRead:
    return HabitRead(
        id=h.id,
        title=h.title,
        description=h.description,
        color=h.color,
        active=h.active,
        goal_id=h.goal_id,
        order=h.order,
        start_date=h.start_date,
        time_of_day=h.time_of_day,
        duration=h.duration,
        repeat_until=h.repeat_until,
        repeat_days=h.repeat_days,   # 👈 zwracamy listę intów
    )

# -------- CRUD --------

@router.get("/habits", response_model=List[HabitRead])
def list_habits(db: Session = Depends(get_db)):
    habits = db.query(models.Habit).order_by(models.Habit.id.desc()).all()
    return [_habit_to_read(h) for h in habits]

@router.post("/habits", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
def create_habit(payload: HabitCreate, db: Session = Depends(get_db)):
    # walidacja wejścia jest już w Pydantic (schemas)
    h = models.Habit(
        title=payload.title,
        description=payload.description,
        color=payload.color,
        active=True if payload.active is None else bool(payload.active),
        goal_id=payload.goal_id,
        order=payload.order,
        start_date=payload.start_date,
        time_of_day=payload.time_of_day,
        duration=payload.duration,
        repeat_until=payload.repeat_until,
        repeat_days=payload.repeat_days,  # 👈 zapis jako JSON
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return _habit_to_read(h)

@router.patch("/habits/{habit_id}", response_model=HabitRead)
def update_habit(habit_id: int, payload: HabitUpdate, db: Session = Depends(get_db)):
    h = db.get(models.Habit, habit_id)
    if not h:
        raise HTTPException(status_code=404, detail="Habit not found")

    # proste aktualizacje pól jeżeli podane
    for field in ("title", "description", "color", "active", "goal_id", "order",
                  "start_date", "time_of_day", "duration", "repeat_until", "repeat_days"):
        val = getattr(payload, field, None)
        if val is not None:
            setattr(h, field, val)

    db.commit()
    db.refresh(h)
    return _habit_to_read(h)

@router.delete("/habits/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(habit_id: int, db: Session = Depends(get_db)):
    h = db.get(models.Habit, habit_id)
    if not h:
        raise HTTPException(status_code=404, detail="Habit not found")
    db.delete(h)
    db.commit()
    return None

# -------- Logs --------

@router.post("/habits/{habit_id}/logs", status_code=status.HTTP_201_CREATED)
def add_log(habit_id: int, payload: HabitLogCreate, db: Session = Depends(get_db)):
    h = db.get(models.Habit, habit_id)
    if not h:
        raise HTTPException(status_code=404, detail="Habit not found")
    log = models.HabitLog(habit_id=habit_id, done_on=payload.done_on)
    db.add(log)
    try:
        db.commit()
    except Exception:
        db.rollback()
        # duplikat jest OK (idempotentnie)
    return {"habit_id": habit_id, "done_on": payload.done_on.isoformat()}

@router.delete("/habits/{habit_id}/logs/{done_on}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(habit_id: int, done_on: str, db: Session = Depends(get_db)):
    try:
        d = ddate.fromisoformat(done_on)
    except Exception:
        raise HTTPException(status_code=400, detail="Bad date format; expected YYYY-MM-DD")
    log = db.get(models.HabitLog, {"habit_id": habit_id, "done_on": d})
    if not log:
        return None
    db.delete(log)
    db.commit()
    return None

# -------- Progress --------

@router.get("/habits/progress", response_model=List[HabitProgressRead])
def habits_progress(db: Session = Depends(get_db)):
    """
    Prosty agregat tygodniowy: target = liczba wystąpień w bieżącym tygodniu,
    done = liczba logów w tym tygodniu; streak – uproszczony (ciąg wstecz od dziś).
    """
    from datetime import timedelta

    today = ddate.today()
    wd = (today.weekday())  # 0..6, 0=Pn
    week_start = today - timedelta(days=wd)
    week_end = week_start + timedelta(days=6)

    out: List[HabitProgressRead] = []
    habits = db.query(models.Habit).filter(models.Habit.active == True).all()

    for h in habits:
        try:
            # target: ile dni z repeat_days mieści się w tygodniu oraz w oknie [start_date, repeat_until]
            rdays = set(h.repeat_days or [])
            target = 0
            for i in range(7):
                d = week_start + timedelta(days=i)
                if d < h.start_date:
                    continue
                if h.repeat_until and d > h.repeat_until:
                    continue
                if i in rdays:
                    target += 1

            # done: logi w tygodniu
            done = (
                db.query(models.HabitLog)
                  .filter(models.HabitLog.habit_id == h.id)
                  .filter(models.HabitLog.done_on >= week_start)
                  .filter(models.HabitLog.done_on <= week_end)
                  .count()
            )

            # streak: idziemy wstecz od dziś, licząc kolejne dni z logiem,
            # ale tylko po dniach rzeczywiście zaplanowanych
            streak = 0
            cur = today
            while True:
                if cur < h.start_date or (h.repeat_until and cur > h.repeat_until):
                    break
                # czy w ten dzień powinien wystąpić nawyk?
                if (cur.weekday() in rdays):
                    has = db.get(models.HabitLog, {"habit_id": h.id, "done_on": cur})
                    if not has:
                        break
                    streak += 1
                cur = cur - timedelta(days=1)

            out.append(HabitProgressRead(
                habit_id=h.id, week_done=done, week_target=target, streak=streak
            ))
        except Exception as e:
            # Log error and continue with other habits
            print(f"Error processing habit {h.id}: {e}")
            continue
            
    return out
