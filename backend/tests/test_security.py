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


def test_health_check_ok(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json() == {"status": "ok"}


def test_health_check_requires_no_auth(client):
    # Unlike almost every other route, /api/health must be reachable
    # without a session - it's what a container orchestrator/load balancer
    # polls before a user ever logs in.
    res = client.get("/api/health")
    assert res.status_code != 401


def test_security_headers_present(client):
    res = client.get("/api/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_hsts_absent_without_secure_cookies(client):
    # SESSION_COOKIE_SECURE defaults to False in tests (see conftest.py) -
    # HSTS over plain HTTP would be actively harmful (it tells the browser
    # to force HTTPS for a host that may not serve it), so it must stay off.
    res = client.get("/api/health")
    assert "Strict-Transport-Security" not in res.headers


def test_hsts_present_with_secure_cookies(app):
    app.config["SESSION_COOKIE_SECURE"] = True
    res = app.test_client().get("/api/health")
    assert "Strict-Transport-Security" in res.headers
