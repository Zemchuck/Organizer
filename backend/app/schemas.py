from datetime import date as ddate, datetime, time as dtime
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────
class PriorityEnum(int, Enum):
    urgent_important         = 1
    important_not_urgent     = 2
    urgent_not_important     = 3
    not_urgent_not_important = 4


class TaskTypeEnum(str, Enum):
    single = "single"
    habit  = "habit"


# ─── Shared base ──────────────────────────────────────────────────────
class TaskBase(BaseModel):
    title:        Optional[str]           = None
    description:  Optional[str]           = None
    priority:     Optional[PriorityEnum]  = None
    task_type:    Optional[TaskTypeEnum]  = None
    color:        Optional[str]           = None
    status:       Optional[bool]          = None


# ─── Create ───────────────────────────────────────────────────────────
class TaskCreate(TaskBase):
    date: ddate
    time: dtime
    duration: int = Field(gt=0, le=1440)
    repeat_days:  Optional[List[int]] = None   # 0=pon … 6=niedz
    repeat_until: Optional[ddate]     = None

    # przyjmuj int → enum
    @validator("priority", pre=True)
    def _pri_to_enum(cls, v): return PriorityEnum(v)


# ─── Update ───────────────────────────────────────────────────────────
class TaskUpdate(BaseModel):
    # wszystkie pola opcjonalne
    title:        Optional[str]           = None
    description:  Optional[str]           = None
    priority:     Optional[PriorityEnum]  = None
    task_type:    Optional[TaskTypeEnum]  = None
    color:        Optional[str]           = None
    status:       Optional[bool]          = None

    # poprawiona nazwa pola daty
    date: Optional[ddate] = None
    time: Optional[dtime] = None
    duration: Optional[int] = None

    # pozwala oznaczyć, że PATCH dotyczy całej serii
    series: Optional[bool] = None


# ─── Read / response ─────────────────────────────────────────────────
class TaskRead(TaskBase):
    id: int
    time: datetime
    duration: int

    # wsparcie dla serii
    series_id: Optional[str] = None
    is_series: bool = False

    @validator("is_series", always=True)
    def _set_is_series(cls, v, values):  # v = pole wyliczane
        return bool(values.get("series_id"))

    # Pydantic v2 – zamiast orm_mode=True
    model_config = {"from_attributes": True}