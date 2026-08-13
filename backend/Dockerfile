FROM python:3.11-slim

WORKDIR /app

# Install dependencies first so this layer is cached across code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

RUN chmod +x entrypoint.sh

ENV FLASK_APP=app.py

# Backed by the instance/ volume mounted in docker-compose.yml - this is
# where the SQLite file (DATABASE_URL=sqlite:///instance/project.db) lives,
# so it survives container recreation.
RUN mkdir -p instance

EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]
