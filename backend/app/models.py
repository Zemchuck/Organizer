from datetime import datetime, date
from typing import Optional
import enum

from sqlalchemy import (
    Column, Integer, String, Boolean, Text, DateTime, Date,
    ForeignKey, Enum as SqlEnum, CheckConstraint, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship

from .db import Base


# ───────── ENUMY ─────────
class PriorityEnum(int, enum.Enum):
    URGENT_IMPORTANT         = 1
    IMPORTANT_NOT_URGENT     = 2
    URGENT_NOT_IMPORTANT     = 3
    NOT_URGENT_NOT_IMPORTANT = 4


# ───────── GOAL (Cel) ─────────
class Goal(Base):
    __tablename__      = "goals"
    __allow_unmapped__ = True

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    habits = relationship(
        "Habit",
        back_populates="goal",
        cascade="all, delete",
        order_by="Habit.order",
    )


# ───────── PROJECT (Projekt) ─────────
class Project(Base):
    __tablename__      = "projects"
    __allow_unmapped__ = True

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    tasks = relationship(
        "Task",
        back_populates="project",
        cascade="all, delete",
        order_by="Task.order",
    )


# ───────── TASK ─────────
class Task(Base):
    __tablename__      = "tasks"
    __allow_unmapped__ = True

    id = Column(Integer, primary_key=True, index=True)

    # seria (dla zadań cyklicznych)
    series_id = Column(String(36), nullable=True, index=True)

    title       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority    = Column(SqlEnum(PriorityEnum), nullable=False,
                         default=PriorityEnum.NOT_URGENT_NOT_IMPORTANT)
    status      = Column(Boolean, nullable=False, default=False)
    color       = Column(String(7), nullable=False, default="#CCCCCC")

    # termin (UTC) – może być NULL (nie trafia na kalendarz)
    time     = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=False, default=60)

    # przynależność do projektu – TERAZ OPCJONALNA
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # ⬅️ zmiana

    # kolejność & pomocnicze
    order         = Column(Integer, nullable=True)
    scheduled_for = Column(Date,    nullable=True)

    # Pomodoro
    pomodoro_count = Column(Integer, nullable=False, default=0)

    project: Optional[Project] = relationship("Project", back_populates="tasks")

    __table_args__ = (
        Index("ix_tasks_time", "time"),
        Index("ix_tasks_project_order", "project_id", "order"),
        CheckConstraint("duration >= 1 AND duration <= 1440", name="ck_tasks_duration_range"),
    )


# ───────── HABIT ─────────
class Habit(Base):
    __tablename__      = "habits"
    __allow_unmapped__ = True

    id = Column(Integer, primary_key=True, index=True)

    title       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color       = Column(String(7), nullable=False, default="#CCCCCC")
    active      = Column(Boolean, nullable=False, default=True)

    # harmonogram:
    start_date   = Column(Date, nullable=False)
    time_of_day  = Column(DateTime, nullable=False)    # wykorzystujemy tylko składnik czasu (UTC)
    duration     = Column(Integer, nullable=False, default=25)
    days_mask    = Column(Integer, nullable=False, default=0)   # bitmask 0..127 (Pn..Nd)
    repeat_until = Column(Date, nullable=True)

    # przynależność do celu – WYMAGANA
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)

    # porządek w ramach celu
    order = Column(Integer, nullable=True)

    # NOWE: relacja do logów
    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")

    goal: Optional[Goal] = relationship("Goal", back_populates="habits")

    __table_args__ = (
        Index("ix_habits_goal_order", "goal_id", "order"),
        CheckConstraint("duration >= 1 AND duration <= 1440", name="ck_habits_duration_range"),
        CheckConstraint("days_mask >= 0 AND days_mask <= 127", name="ck_habits_days_mask"),
        CheckConstraint("(repeat_until IS NULL) OR (repeat_until >= start_date)", name="ck_habits_repeat_until_range"),
    )

class HabitLog(Base):
    __tablename__      = "habit_logs"
    __allow_unmapped__ = True

    id = Column(Integer, primary_key=True)
    habit_id = Column(Integer, ForeignKey("habits.id", ondelete="CASCADE"), nullable=False, index=True)
    done_on = Column(Date, nullable=False)  # lokalna data wykonania (YYYY-MM-DD)

    habit = relationship("Habit", back_populates="logs")

    __table_args__ = (
        UniqueConstraint("habit_id", "done_on", name="uq_habit_day"),
    )