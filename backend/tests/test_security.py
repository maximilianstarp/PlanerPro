import os
import tempfile

import pytest

from app import create_app


@pytest.fixture()
def rate_limited_client():
    """A dedicated app instance with the login/register rate limit turned
    on (it's disabled by default under TESTING so the other tests aren't
    slowed down / made flaky by it)."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")

    app = create_app(
        {
            "TESTING": True,
            "RATELIMIT_ENABLED": True,
            "SECRET_KEY": "test-secret-key",
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
        }
    )

    yield app.test_client()

    os.close(db_fd)
    os.unlink(db_path)


def test_login_is_rate_limited(rate_limited_client):
    # /api/login is limited to 10 requests/minute (see app.py). The 11th
    # rapid attempt in the same window should be rejected before it ever
    # touches the database.
    for _ in range(10):
        rate_limited_client.post(
            "/api/login", json={"username": "nobody", "password": "wrong-password"}
        )

    res = rate_limited_client.post(
        "/api/login", json={"username": "nobody", "password": "wrong-password"}
    )
    assert res.status_code == 429


def test_missing_secret_key_raises_outside_debug(monkeypatch):
    monkeypatch.delenv("FLASK_SECRET_KEY", raising=False)
    monkeypatch.delenv("DEBUG", raising=False)

    with pytest.raises(RuntimeError):
        create_app()
