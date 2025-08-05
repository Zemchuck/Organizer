# backend/init_db.py
from app.db import engine, Base
import app.models  # żeby zarejestrować wszystkie modele w Base

def main():
    # usuwamy i tworzymy od nowa wszystkie tabele
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Baza odświeżona ✅")

if __name__ == "__main__":
    main()