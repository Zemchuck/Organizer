from datetime     import date, time, datetime
from typing       import Optional
from enum         import Enum
from pydantic     import BaseModel, Field


class TaskType(str, Enum):
    single = "single"
    habit  = "habit"


# ———  pełny model, używany w odpowiedziach  ———
class TaskBase(BaseModel):
    title       : str
    description : Optional[str] = None
    duration    : int
    time        : datetime
    task_type   : TaskType

    class Config:
        from_attributes = True   # Pydantic v2 (zamiennik orm_mode)


# ———  dane przy POST  ———
class TaskCreate(BaseModel):
    title     : str = Field(..., max_length=200)
    date      : date
    time      : time
    duration  : int = 60
    task_type : TaskType


# ———  dane w odpowiedziach  ———
class TaskRead(TaskBase):
    id       : int
    end_time : datetime