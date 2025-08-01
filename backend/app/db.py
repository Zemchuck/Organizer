from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from fastapi import Depends

# ———  konfiguracja SQLite / inny URL  ———
DATABASE_URL = "sqlite:///calendar.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},   # tylko SQLite
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)

Base = declarative_base()

# ———  dependency dla FastAPI  ———
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
