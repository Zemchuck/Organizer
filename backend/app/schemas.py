from datetime import date as ddate, datetime, time as dtime
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from enum import Enum

class PriorityEnum(int, Enum):
    urgent_important         = 1
    important_not_urgent     = 2
    urgent_not_important     = 3
    not_urgent_not_important = 4

class TaskTypeEnum(str, Enum):
    single = "single"
    habit  = "habit"

class TaskBase(BaseModel):
    title: Optional[str]       = None
    description: Optional[str] = None
    priority: Optional[PriorityEnum]  = None
    task_type: Optional[TaskTypeEnum] = None
    color: Optional[str]       = None
    status: Optional[bool]     = None

class TaskCreate(TaskBase):
    date: ddate
    time: dtime
    duration: int = Field(gt=0, le=1440)
    repeat_days: Optional[List[int]] = None   # 0=pon, …, 6=niedz.
    repeat_until: Optional[ddate]    = None

    @validator("priority", pre=True)
    def _pri_to_enum(cls, v):
        return PriorityEnum(v)

class TaskUpdate(BaseModel):
    title: Optional[str]       = None
    description: Optional[str] = None
    priority: Optional[PriorityEnum]  = None
    task_type: Optional[TaskTypeEnum] = None
    color: Optional[str]       = None
    status: Optional[bool]     = None
    task_date: Optional[ddate] = None
    time: Optional[dtime]      = None
    duration: Optional[int]    = None

class TaskRead(TaskBase):
    id: int
    time: datetime
    duration: int
    model_config = {
        "from_attributes": True  # Pydantic V2 zamiast orm_mode
    }
