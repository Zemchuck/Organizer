# backend/init_db.py
import os
from sqlalchemy import inspect
from app.db import engine, Base
import app.models  # rejestruje wszystkie modele

def _maybe_remove_sqlite_file():
    # Działa tylko dla SQLite plikowej (nie :memory: i nie zdalne DB)
    url = engine.url
    if url.get_backend_name() == "sqlite":
        db_path = url.database  # ścieżka pliku .db
        # Upewnij się, że nie jest to :memory:
        if db_path and db_path != ":memory:" and os.path.exists(db_path):
            print(f"Usuwam plik bazy: {db_path}")
            engine.dispose()  # zwolnij uchwyty zanim skasujesz plik
            os.remove(db_path)

def main():
    print("🔧 Odświeżam bazę…")

    # 1) Jeśli SQLite-plik — po prostu usuń plik (najszybsze i najczystsze)
    _maybe_remove_sqlite_file()

    # 2) Dla pewności: jeśli to nie SQLite-plik, zrób drop_all (np. przy Postgresie)
    try:
        print("Kasuję tabele (gdyby istniały)…")
        Base.metadata.drop_all(bind=engine)
    except Exception as e:
        # przy SQLite po usunięciu pliku drop_all nie jest potrzebny
        print(f"(info) drop_all: {e}")

    # 3) Tworzymy od zera — wraz z indeksami i constraintami
    print("Tworzę tabele i indeksy…")
    Base.metadata.create_all(bind=engine)

    # 4) Krótki raport kontrolny
    insp = inspect(engine)
    tables = insp.get_table_names()
    print(f"✅ Gotowe. Tabele: {', '.join(tables) if tables else '(brak)'}")

if __name__ == "__main__":
    main()
