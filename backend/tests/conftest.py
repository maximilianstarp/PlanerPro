import os
import tempfile

import pytest

# The app factory requires FLASK_SECRET_KEY unless DEBUG is set. This
# doesn't affect create_app(test_config=...) below (which always overrides
# SECRET_KEY via test_config), but the bare `app = create_app()` at the
# bottom of app.py runs at import time, so the environment must already
# satisfy it before the module is imported.
os.environ.setdefault("DEBUG", "true")

from app import create_app  # noqa: E402


@pytest.fixture()
def app():
    db_fd, db_path = tempfile.mkstemp(suffix=".db")

    test_app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret-key",
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
        }
    )

    yield test_app

    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def register_and_login(client):
    """Register a fresh user and log them in; returns (client, username)."""

    def _do(username="alice", password="correct-horse-battery"):
        client.post("/api/register", json={"username": username, "password": password})
        res = client.post("/api/login", json={"username": username, "password": password})
        assert res.status_code == 200
        return username

    return _do
