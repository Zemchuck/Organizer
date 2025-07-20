from db import SessionLocal
from models import CalendarEntry
from datetime import datetime

# Otwarcie sesji
with SessionLocal() as session:
    # CREATE – dodanie nowego wpisu
    new_entry = CalendarEntry(
        title="Spotkanie zespołu",
        description="Omówienie planów sprintu",
        start_datetime=datetime(2025, 7, 20, 10, 0),
        end_datetime=datetime(2025, 7, 20, 11, 0),
        location="Sala konferencyjna A"
    )
    session.add(new_entry)
    session.commit()

    # READ – pobranie wpisu z bazy po ID
    entry = session.get(CalendarEntry, new_entry.id)
    print(entry.title, entry.start_datetime)

    # UPDATE – zmiana tytułu wpisu
    entry.title = "Zaktualizowane spotkanie zespołu"
    session.commit()

    # DELETE – usunięcie wpisu z bazy
    session.delete(entry)
    session.commit()