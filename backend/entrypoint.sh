#!/bin/sh
# Applies any pending Alembic migrations, then starts the app server.
# Runs on every container start; a no-op if the schema is already current.
set -e

flask db upgrade

exec gunicorn --bind 0.0.0.0:5000 "app:app"
