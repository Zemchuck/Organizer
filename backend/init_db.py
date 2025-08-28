# backend/init_db.py
import os
from sqlalchemy import inspect
from app.db import engine, Base
import app.models  # ważne: rejestruje wszystkie modele

def _ensure_sqlite_only():
    if engine.url.get_backend_name() != "sqlite":
        raise RuntimeError("Ten init działa wyłącznie dla SQLite (plikowej).")

def _sqlite_db_path():
    # dla SQLite: engine.url.database to ścieżka pliku (albo ':memory:')
    return engine.url.database

def _is_memory_db(db_path: str) -> bool:
    return not db_path or db_path == ":memory:"

def _db_has_any_of_our_tables() -> bool:
    """Czy w bazie istnieje przynajmniej jedna tabela zdefiniowana w Base.metadata?"""
    insp = inspect(engine)
    existing = set(insp.get_table_names())
    model_tables = {t.name for t in Base.metadata.sorted_tables}
    return bool(existing & model_tables)

def _create_missing_tables():
    """Utwórz tylko brakujące tabele (create_all jest idempotentne)."""
    # Uwaga: Base.metadata.create_all bez param. 'tables=' i tak doda tylko brakujące
    Base.metadata.create_all(bind=engine)

def _ensure_db_dir_exists(db_path: str):
    d = os.path.dirname(db_path or "")
    if d and not os.path.exists(d):
        os.makedirs(d, exist_ok=True)

def _set_pragmas_optional():
    """Opcjonalnie: przyjemniejsze ustawienia pod lokalny plik."""
    with engine.begin() as conn:
        # WAL poprawia współbieżność przy kilku procesach/oknach
        conn.exec_driver_sql("PRAGMA journal_mode=WAL;")
        # trochę mniej fsync = szybsze operacje (do aplikacji desktop/webview OK)
        conn.exec_driver_sql("PRAGMA synchronous=NORMAL;")

def main():
    _ensure_sqlite_only()
    db_path = _sqlite_db_path()

    print("🔧 Inicjalizacja lokalnej bazy SQLite…")
    if _is_memory_db(db_path):
        print("• Tryb :memory: – tworzę schemat w pamięci (bez pliku).")
        _create_missing_tables()
    else:
        print(f"• Plik bazy: {db_path}")
        _ensure_db_dir_exists(db_path)

        if _db_has_any_of_our_tables():
            print("✅ Baza już istnieje – nic nie kasuję. Dodaję ewentualnie brakujące tabele…")
            _create_missing_tables()
        else:
            print("🆕 Baza pusta/nowa – tworzę cały schemat…")
            _create_missing_tables()

        # (opcjonalne) przyjemniejsze PRAGMA dla lokalnego pliku:
        _set_pragmas_optional()

    # Raport kontrolny
    insp = inspect(engine)
    tables = insp.get_table_names()
    print(f"📋 Tabele: {', '.join(tables) if tables else '(brak)'}")
    print("✅ Gotowe – istniejąca baza zostaje nietknięta; brakujące tabele są tworzone.")

if __name__ == "__main__":
    main()
