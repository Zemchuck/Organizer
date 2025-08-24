from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Goal
from ..schemas import GoalCreate, GoalRead, GoalUpdate

router = APIRouter(tags=["goals"])

@router.get("/goals", response_model=List[GoalRead])
def list_goals(db: Session = Depends(get_db)):
    rows = db.query(Goal).order_by(Goal.id.desc()).all()
    return [GoalRead.model_validate(r) for r in rows]

@router.post("/goals", response_model=GoalRead, status_code=201)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db)):
    row = Goal(title=payload.title, description=payload.description)
    db.add(row)
    db.commit()
    db.refresh(row)
    return GoalRead.model_validate(row)

@router.patch("/goals/{goal_id}", response_model=GoalRead)
def update_goal(goal_id: int, payload: GoalUpdate = Body(...), db: Session = Depends(get_db)):
    row = db.query(Goal).filter(Goal.id == goal_id).first()
    if not row:
        raise HTTPException(404, "Goal not found")
    if payload.title is not None:
        row.title = payload.title
    if payload.description is not None:
        row.description = payload.description
    db.add(row)
    db.commit()
    db.refresh(row)
    return GoalRead.model_validate(row)

@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    row = db.query(Goal).filter(Goal.id == goal_id).first()
    if not row:
        raise HTTPException(404, "Goal not found")
    db.delete(row)
    db.commit()
    return None

