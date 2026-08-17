"""Idempotently create the seeded demo account (demo/demo1234, no special
privileges) documented in the Readme's "Demo account" section.

Used after standing up a fresh database (e.g. after switching DATABASE_URL
to a new/empty Postgres instance) so the demo login works without a manual
/api/register call. Safe to run repeatedly: does nothing if the account
already exists.

Usage (from backend/, with the venv active and DATABASE_URL pointed at the
target database):
    python -m scripts.seed_demo
"""

import sys
from pathlib import Path

# Run as `python -m scripts.seed_demo` from backend/, or directly - either
# way, make sure backend/ (not backend/scripts/) is on sys.path so `app`
# and `database` (both living in backend/) are importable.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app, generate_password_hash_custom  # noqa: E402
from database import User, db  # noqa: E402

DEMO_USERNAME = "demo"
DEMO_PASSWORD = "demo1234"


def seed_demo_account():
    app = create_app()
    with app.app_context():
        if User.query.filter_by(username=DEMO_USERNAME).first():
            print(f"'{DEMO_USERNAME}' already exists, nothing to do.")
            return

        user = User(
            username=DEMO_USERNAME,
            password_hash=generate_password_hash_custom(DEMO_PASSWORD),
        )
        db.session.add(user)
        db.session.commit()
        print(f"Created demo account '{DEMO_USERNAME}'.")


if __name__ == "__main__":
    seed_demo_account()
