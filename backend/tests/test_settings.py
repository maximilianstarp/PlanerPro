import re


def _last_code(app, to):
    outbox = app.config.get("MAIL_OUTBOX", [])
    for entry in reversed(outbox):
        if entry["to"] == to:
            match = re.search(r"\b(\d{6})\b", entry["body"])
            assert match
            return match.group(1)
    raise AssertionError(f"no email sent to {to}")


# --- username ---


def test_update_username_success(client, register_and_login):
    register_and_login(username="alice")
    res = client.post("/api/settings/username", json={"username": "alice2"})
    assert res.status_code == 200
    assert client.get("/api/me").get_json()["username"] == "alice2"


def test_update_username_taken_returns_400(client, register_and_login):
    register_and_login(username="alice")
    register_and_login(username="bob")
    res = client.post("/api/settings/username", json={"username": "alice"})
    assert res.status_code == 400


def test_update_username_requires_login(client):
    res = client.post("/api/settings/username", json={"username": "alice2"})
    assert res.status_code == 401


# --- password ---


def test_update_password_success(client, register_and_login):
    email = "alice@example.com"
    register_and_login(username="alice", email=email, password="oldpassword1")
    res = client.post(
        "/api/settings/password",
        json={"current_password": "oldpassword1", "new_password": "newpassword1"},
    )
    assert res.status_code == 200

    client.post("/api/logout")
    old_login = client.post("/api/login", json={"email": email, "password": "oldpassword1"})
    assert old_login.status_code == 401
    new_login = client.post("/api/login", json={"email": email, "password": "newpassword1"})
    assert new_login.status_code == 200


def test_update_password_wrong_current_password_rejected(client, register_and_login):
    register_and_login(username="alice", password="oldpassword1")
    res = client.post(
        "/api/settings/password",
        json={"current_password": "not-it", "new_password": "newpassword1"},
    )
    assert res.status_code == 400


def test_update_password_too_short_rejected(client, register_and_login):
    register_and_login(username="alice", password="oldpassword1")
    res = client.post(
        "/api/settings/password",
        json={"current_password": "oldpassword1", "new_password": "short"},
    )
    assert res.status_code == 400


# --- email ---


def test_request_email_change_keeps_old_email_until_confirmed(app, client, register_and_login):
    register_and_login(username="alice", email="alice@example.com", password="password123")
    res = client.post(
        "/api/settings/email",
        json={"new_email": "alice-new@example.com", "current_password": "password123"},
    )
    assert res.status_code == 200

    me = client.get("/api/me").get_json()
    assert me["email"] == "alice@example.com"
    assert me["pending_email"] == "alice-new@example.com"
    _last_code(app, "alice-new@example.com")  # code went to the *new* address


def test_request_email_change_wrong_password_rejected(client, register_and_login):
    register_and_login(username="alice", email="alice@example.com", password="password123")
    res = client.post(
        "/api/settings/email",
        json={"new_email": "alice-new@example.com", "current_password": "wrong"},
    )
    assert res.status_code == 400


def test_request_email_change_taken_email_rejected(client, register_and_login):
    register_and_login(username="alice", email="alice@example.com", password="password123")
    register_and_login(username="bob", email="bob@example.com", password="password123")

    client.post("/api/login", json={"email": "alice@example.com", "password": "password123"})
    res = client.post(
        "/api/settings/email",
        json={"new_email": "bob@example.com", "current_password": "password123"},
    )
    assert res.status_code == 400


def test_confirm_email_change_success(app, client, register_and_login):
    register_and_login(username="alice", email="alice@example.com", password="password123")
    client.post(
        "/api/settings/email",
        json={"new_email": "alice-new@example.com", "current_password": "password123"},
    )
    code = _last_code(app, "alice-new@example.com")

    res = client.post("/api/settings/email/verify", json={"code": code})
    assert res.status_code == 200

    me = client.get("/api/me").get_json()
    assert me["email"] == "alice-new@example.com"
    assert me["pending_email"] is None
    assert me["email_verified"] is True


def test_confirm_email_change_wrong_code_leaves_old_email_intact(app, client, register_and_login):
    register_and_login(username="alice", email="alice@example.com", password="password123")
    client.post(
        "/api/settings/email",
        json={"new_email": "alice-new@example.com", "current_password": "password123"},
    )

    res = client.post("/api/settings/email/verify", json={"code": "000000"})
    assert res.status_code == 400

    me = client.get("/api/me").get_json()
    assert me["email"] == "alice@example.com"
    assert me["pending_email"] == "alice-new@example.com"


def test_confirm_email_change_without_pending_change_returns_400(client, register_and_login):
    register_and_login(username="alice")
    res = client.post("/api/settings/email/verify", json={"code": "000000"})
    assert res.status_code == 400


def test_cancel_email_change(client, register_and_login):
    register_and_login(username="alice", email="alice@example.com", password="password123")
    client.post(
        "/api/settings/email",
        json={"new_email": "alice-new@example.com", "current_password": "password123"},
    )
    res = client.post("/api/settings/email/cancel")
    assert res.status_code == 200
    assert client.get("/api/me").get_json()["pending_email"] is None
