# 📅 Organizer - Aplikacja do zarządzania czasem

Aby uruchomić:

## 🚀 Uruchomienie

### Wymagania
- Node.js 18+
- Python 3.12+
- uv dependacy (polecane)
- Docker (opcjonalnie)

### Szybkie uruchomienie (Docker)
```bash
# Sklonuj repozytorium
git clone <repository-url>
cd organizer
docker-compose up -d
# Aplikacja: http://localhost:3000
# API: http://localhost:8000
```

#### Frontend
```bash
cd frontend
nvm use 22
npm install
npm run dev
# Aplikacja będzie dostępna pod adresem: http://localhost:5173
```

#### Backend
```bash
cd backend
uv sync
source .venv/bin/activate
python init_db.py && uvicorn main:app --reload --host 0.0.0.0 --port 8000
# API będzie dostępne pod adresem: http://localhost:8000