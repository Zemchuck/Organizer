# init_db.py
from app.db import Base, engine
import app.models  # żeby zarejestrować wszystkie modele w metadata

Base.metadata.create_all(bind=engine)
print("✔️  Baza danych utworzona lub zaktualizowana")