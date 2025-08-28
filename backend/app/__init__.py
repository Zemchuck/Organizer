from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .routers.tasks import router as tasks_router
from .routers.habits import router as habits_router
from .routers.projects import router as projects_router
from .routers.goals import router as goals_router

# Utworzenie tabel (SQLite) – bezpieczne przy starcie
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Organizer API", version="2.0")

# CORS – dopasuj w razie potrzeby
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # w produkcji warto zawęzić
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routery (bez prefixów – ścieżki identyczne jak wcześniej)
app.include_router(tasks_router)
app.include_router(habits_router)
app.include_router(projects_router)
app.include_router(goals_router)