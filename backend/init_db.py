# backend/init_db.py
from app.db import engine, Base
import app.models  # rejestruje Task, Project itd.

def main():
    print("Kasuję tabele…")
    Base.metadata.drop_all(bind=engine)
    print("Tworzę tabele…")
    Base.metadata.create_all(bind=engine)
    print("Baza odświeżona ✅")

if __name__ == "__main__":
    main()
