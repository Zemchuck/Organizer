from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Project
from ..schemas import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(tags=["projects"])

@router.get("/projects", response_model=List[ProjectRead])
def list_projects(db: Session = Depends(get_db)):
    rows = db.query(Project).order_by(Project.id.desc()).all()
    return [ProjectRead.model_validate(r) for r in rows]

@router.post("/projects", response_model=ProjectRead, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    row = Project(title=payload.title, description=payload.description)
    db.add(row)
    db.commit()
    db.refresh(row)
    return ProjectRead.model_validate(row)

@router.patch("/projects/{project_id}", response_model=ProjectRead)
def update_project(project_id: int, payload: ProjectUpdate = Body(...), db: Session = Depends(get_db)):
    row = db.query(Project).filter(Project.id == project_id).first()
    if not row:
        raise HTTPException(404, "Project not found")
    if payload.title is not None:
        row.title = payload.title
    if payload.description is not None:
        row.description = payload.description
    db.add(row)
    db.commit()
    db.refresh(row)
    return ProjectRead.model_validate(row)

@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    row = db.query(Project).filter(Project.id == project_id).first()
    if not row:
        raise HTTPException(404, "Project not found")
    db.delete(row)
    db.commit()
    return None
