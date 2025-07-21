from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import Depends

DATABASE_URL = "sqlite:///calendar.db"
engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()