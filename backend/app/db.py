import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/calendar.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # tylko dla SQLite
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

Base = declarative_base()


def get_db():
    """Dependency FastAPI – generuje i zamyka sesję SQLAlchemy."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
