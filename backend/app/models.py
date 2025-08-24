# app/models.py
from __future__ import annotations
from enum import Enum

from sqlalchemy import (
    Column, Integer, String, Boolean, Date, Time, DateTime,
    ForeignKey, Index, UniqueConstraint, JSON, text
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .db import Base

# -------------------- Enums ----------------------
class PriorityEnum(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    URGENT = 4

# -------------------- Project --------------------
class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000))

    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project id={self.id} title={self.title!r}>"

# -------------------- Goal -----------------------
class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000))

    habits = relationship("Habit", back_populates="goal", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Goal id={self.id} title={self.title!r}>"

# -------------------- Task -----------------------
class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))

    # pojedyncza data/godzina rozpoczęcia
    time: Mapped[DateTime | None] = mapped_column(DateTime)

    duration: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("60"))  # minuty
    color: Mapped[str | None] = mapped_column(String(7))  # "#RRGGBB"
    status: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("0"))
    priority: Mapped[int | None] = mapped_column(Integer, nullable=True)  # PriorityEnum value
    
    # Dodatkowe pola
    scheduled_for: Mapped[Date | None] = mapped_column(Date, nullable=True)
    series_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # UUID
    pomodoro_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    order: Mapped[int | None] = mapped_column(Integer, nullable=True)

    project = relationship("Project", back_populates="tasks")

    __table_args__ = (
        Index("ix_tasks_time", "time"),
        Index("ix_tasks_project_id", "project_id"),
        Index("ix_tasks_scheduled_for", "scheduled_for"),
        Index("ix_tasks_series_id", "series_id"),
    )

    def __repr__(self):
        return f"<Task id={self.id} title={self.title!r} time={self.time}>"

# -------------------- Habit ----------------------
class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    goal_id: Mapped[int] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    order: Mapped[int | None] = mapped_column(Integer)

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    color: Mapped[str | None] = mapped_column(String(7))  # "#RRGGBB"
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("1"))

    # harmonogram
    start_date: Mapped[Date] = mapped_column(Date, nullable=False)
    time_of_day: Mapped[Time] = mapped_column(Time, nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("25"))  # minuty

    # ⬇⬇⬇ KLUCZOWA ZMIANA: lista dni jako JSON (np. [0,2,4])
    repeat_days: Mapped[list[int]] = mapped_column(JSON, nullable=False)

    repeat_until: Mapped[Date | None] = mapped_column(Date)

    goal = relationship("Goal", back_populates="habits")
    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_habits_goal_id", "goal_id"),
        Index("ix_habits_start_date", "start_date"),
        Index("ix_habits_repeat_until", "repeat_until"),
        # filtr po aktywnych nawykach idzie często:
        Index("ix_habits_active", "active"),
    )

    def __repr__(self):
        return f"<Habit id={self.id} title={self.title!r}>"

# -------------------- HabitLog -------------------
class HabitLog(Base):
    __tablename__ = "habit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("habits.id", ondelete="CASCADE"), nullable=False)
    done_on: Mapped[Date] = mapped_column(Date, nullable=False)

    habit = relationship("Habit", back_populates="logs")

    __table_args__ = (
        UniqueConstraint("habit_id", "done_on", name="uq_habit_day"),
        Index("ix_habit_logs_habit_id", "habit_id"),
        Index("ix_habit_logs_done_on", "done_on"),
    )

    def __repr__(self):
        return f"<HabitLog habit_id={self.habit_id} done_on={self.done_on}>"
