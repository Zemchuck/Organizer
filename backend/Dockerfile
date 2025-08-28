FROM python:3.12-slim

# zainstaluj pierwsze systemowe zależności, żeby móc używać uv
RUN pip install --no-cache-dir uv

# katalog roboczy
WORKDIR /app

# kopiujemy dependencies
COPY pyproject.toml uv.lock ./

# instalujemy dependencies do .venv
RUN uv sync --frozen

# dodajemy backend do /app/src
RUN mkdir /app/src
COPY . /app/src

# PATH i PYTHONPATH
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app/src

# katalog na bazę (zostanie podmieniony bind-mountem)
RUN mkdir -p /app/data

# port backendu
EXPOSE 8000

# domyślnie i tak nadpisujemy w compose (init_db + uvicorn --reload)
CMD ["sh", "-c", "python init_db.py && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"]
