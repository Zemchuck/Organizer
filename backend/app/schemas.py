from enum import Enum
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# 1. Zdefiniuj ten sam enum (możesz importować z models.py lub powtórzyć):
class TaskType(str, Enum):
    single = "single"
    habit  = "habit"

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    time: datetime
    duration: int
    # 2. Używamy naszego enum jako typ pola:
    task_type: TaskType

class TaskCreate(TaskBase):
    pass

class TaskRead(TaskBase):
    id: int
    end_time: datetime

    class Config:
        orm_mode = True
        from_attributes = True