from fastapi import FastAPI
from api import calendar

app = FastAPI(title="Organizer API")
app.include_router(calendar.router)