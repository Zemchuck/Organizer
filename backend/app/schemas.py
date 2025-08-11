from datetime import date as ddate, datetime, time as dtime
from typing import List, Optional, Union

from pydantic import BaseModel, Field, field_validator, model_validator
from .models import PriorityEnum as SA_PriorityEnum


# ───────── TASKS (projekty) ─────────
class TaskBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

    priority: Optional[Union[int, SA_PriorityEnum]] = None
    color: Optional[str] = None
    status: Optional[bool] = None

    project_id: Optional[int] = None           # ⬅️ OPCJONALNE
    scheduled_for: Optional[ddate] = None
    order: Optional[int] = None

    pomodoro_count: Optional[int] = None

    model_config = {"from_attributes": True}


class TaskCreate(TaskBase):
    # pojedynczy task może być bez terminu (time=NULL)
    date: Optional[ddate] = None
    time: Optional[Union[dtime, str]] = None

    duration: int = Field(ge=1, le=1440)

    # seria (dla cyklicznych tasków)
    repeat_days: Optional[List[int]] = None  # 0=Mon … 6=Sun
    repeat_until: Optional[ddate] = None

    @field_validator("priority", mode="before")
    @classmethod
    def _priority_to_enum(cls, v):
        if v is None or isinstance(v, SA_PriorityEnum):
            return v
        return SA_PriorityEnum(v)

    @field_validator("time", mode="before")
    @classmethod
    def _time_str_to_time(cls, v):
        if v is None or isinstance(v, dtime):
            return v
        s = str(v).strip()
        # dopuszczamy HH:MM lub HH:MM:SS
        if len(s) == 5 and s.count(":") == 1:
            s = s + ":00"
        try:
            return dtime.fromisoformat(s)
        except Exception:
            raise ValueError("time musi być w formacie HH:MM lub HH:MM:SS")

    @field_validator("repeat_days")
    @classmethod
    def _check_repeat_days(cls, v):
        if v is None:
            return v
        if any((d < 0 or d > 6) for d in v):
            raise ValueError("repeat_days musi zawierać wartości 0..6")
        return v

    @model_validator(mode="after")
    def _validate(self):
        # seria → wymagane date & time & repeat_until
        if self.repeat_days and self.repeat_until:
            if not (self.date and self.time):
                raise ValueError("Seria wymaga jednocześnie pól date i time.")
        else:
            # jeśli podano jedno z (date,time), to podaj oba
            if bool(self.date) ^ bool(self.time):
                raise ValueError("Podaj jednocześnie date i time, albo żadne.")
        if self.pomodoro_count is not None and self.pomodoro_count < 0:
            self.pomodoro_count = 0
        # project_id może być None (zadanie bez projektu)
        if self.project_id in ("", 0):
            self.project_id = None
        return self


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Union[int, SA_PriorityEnum]] = None
    color: Optional[str] = None
    status: Optional[bool] = None
    project_id: Optional[int] = None

    # ustawienie/wyczyszczenie terminu
    date: Optional[ddate] = None
    time: Optional[Union[dtime, str]] = None

    duration: Optional[int] = None
    scheduled_for: Optional[ddate] = None
    order: Optional[int] = None

    pomodoro_count: Optional[int] = None

    @field_validator("priority", mode="before")
    @classmethod
    def _priority_to_enum(cls, v):
        if v is None or isinstance(v, SA_PriorityEnum):
            return v
        return SA_PriorityEnum(v)

    @field_validator("time", mode="before")
    @classmethod
    def _time_str_to_time(cls, v):
        if v is None or isinstance(v, dtime):
            return v
        s = str(v).strip()
        if len(s) == 5 and s.count(":") == 1:
            s = s + ":00"
        try:
            return dtime.fromisoformat(s)
        except Exception:
            raise ValueError("time musi być w formacie HH:MM lub HH:MM:SS")

    @field_validator("duration")
    @classmethod
    def _duration_range(cls, v):
        if v is None:
            return v
        if not (1 <= v <= 1440):
            raise ValueError("duration must be between 1 and 1440 minutes")
        return v

    @model_validator(mode="after")
    def _normalize(self):
        if self.pomodoro_count is not None and self.pomodoro_count < 0:
            self.pomodoro_count = 0
        if self.project_id in ("", 0):
            self.project_id = None
        return self

    model_config = {"from_attributes": True}


class TaskRead(TaskBase):
    id: int
    time: Optional[datetime] = None
    duration: int

    series_id: Optional[str] = None
    is_series: bool = False

    @model_validator(mode="after")
    def _compute_is_series(self):
        self.is_series = bool(self.series_id)
        return self

    model_config = {"from_attributes": True}


# ───────── HABITS ─────────
from datetime import date as ddate, time as dtime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator
import re

HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")

class HabitBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    active: Optional[bool] = None

    goal_id: Optional[int] = None
    order: Optional[int] = None

    # harmonogram – w read/update
    start_date: Optional[ddate] = None
    time_of_day: Optional[dtime] = None
    duration: Optional[int] = None
    repeat_until: Optional[ddate] = None
    repeat_days: Optional[List[int]] = None  # 0..6

    model_config = {"from_attributes": True}

    @field_validator("color")
    @classmethod
    def _color_hex(cls, v):
        if v is None: return v
        if not HEX.match(v): raise ValueError("color must be #RRGGBB")
        return v

    @field_validator("time_of_day")
    @classmethod
    def _truncate_seconds(cls, v: Optional[dtime]):
        if v is None: return v
        return v.replace(second=0, microsecond=0)

class HabitCreate(HabitBase):
    title: str
    goal_id: int

    start_date: ddate
    time_of_day: dtime
    duration: int = Field(ge=1, le=1440)

    repeat_days: List[int] = Field(default_factory=list)   # 0..6 (Pn..Nd)
    repeat_until: Optional[ddate] = None

    @field_validator("repeat_days")
    @classmethod
    def _validate_days(cls, v: List[int]):
        v = sorted(set(v or []))
        if any((d < 0 or d > 6) for d in v):
            raise ValueError("repeat_days musi zawierać wartości 0..6")
        return v

    @model_validator(mode="after")
    def _range_check(self):
        if self.repeat_until and self.repeat_until < self.start_date:
            raise ValueError("repeat_until nie może być przed start_date")
        return self

class HabitUpdate(HabitBase):
    @field_validator("duration")
    @classmethod
    def _duration_range(cls, v):
        if v is None: return v
        if not (1 <= v <= 1440):
            raise ValueError("duration must be between 1 and 1440 minutes")
        return v

    @field_validator("repeat_days")
    @classmethod
    def _validate_days_update(cls, v: Optional[List[int]]):
        if v is None: return v
        v = sorted(set(v))
        if any((d < 0 or d > 6) for d in v):
            raise ValueError("repeat_days musi zawierać wartości 0..6")
        return v

    @model_validator(mode="after")
    def _range_check(self):
        if self.repeat_until and self.start_date and self.repeat_until < self.start_date:
            raise ValueError("repeat_until nie może być przed start_date")
        return self

class HabitRead(HabitBase):
    id: int
    repeat_days: List[int] = Field(default_factory=list)
    model_config = {"from_attributes": True}

# logowanie wykonań + progres
class HabitLogCreate(BaseModel):
    done_on: ddate = Field(default_factory=lambda: ddate.today())

class HabitProgressRead(BaseModel):
    habit_id: int
    streak: int
    week_done: int
    week_target: int


# ───────── Projekty/Cele ─────────
class ProjectBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    model_config = {"from_attributes": True}

class ProjectCreate(ProjectBase):
    title: str

class ProjectUpdate(ProjectBase):
    pass

class ProjectRead(ProjectBase):
    id: int
    model_config = {"from_attributes": True}


class GoalBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    model_config = {"from_attributes": True}

class GoalCreate(GoalBase):
    title: str

class GoalUpdate(GoalBase):
    pass

class GoalRead(GoalBase):
    id: int
    model_config = {"from_attributes": True}
