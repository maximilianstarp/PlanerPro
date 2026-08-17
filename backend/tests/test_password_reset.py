import re


def _last_code(app, to):
    outbox = app.config.get("MAIL_OUTBOX", [])
    for entry in reversed(outbox):
        if entry["to"] == to:
            match = re.search(r"\b(\d{6})\b", entry["body"])
            assert match
            return match.group(1)
    raise AssertionError(f"no email sent to {to}")


def test_request_reset_for_known_email_queues_code(app, client, register_and_login):
    register_and_login(username="alice", email="alice@example.com")
    res = client.post("/api/password-reset/request", json={"email": "alice@example.com"})
    assert res.status_code == 200
    _last_code(app, "alice@example.com")  # raises if absent


def test_request_reset_for_unknown_email_still_returns_200_but_sends_nothing(app, client):
    outbox_before = len(app.config.get("MAIL_OUTBOX", []))
    res = client.post("/api/password-reset/request", json={"email": "ghost@example.com"})
    assert res.status_code == 200
    assert len(app.config.get("MAIL_OUTBOX", [])) == outbox_before


def test_request_reset_response_does_not_reveal_whether_email_exists(
    app, client, register_and_login
):
    register_and_login(username="alice", email="alice@example.com")
    known = client.post("/api/password-reset/request", json={"email": "alice@example.com"})
    unknown = client.post("/api/password-reset/request", json={"email": "ghost@example.com"})
    assert known.get_json()["message"] == unknown.get_json()["message"]


def test_confirm_reset_changes_password(app, client, register_and_login):
    register_and_login(username="alice", email="alice@example.com", password="oldpassword1")
    client.post("/api/logout")
    client.post("/api/password-reset/request", json={"email": "alice@example.com"})
    code = _last_code(app, "alice@example.com")

    res = client.post(
        "/api/password-reset/confirm",
        json={"email": "alice@example.com", "code": code, "new_password": "newpassword1"},
    )
    assert res.status_code == 200

    old_login = client.post(
        "/api/login", json={"email": "alice@example.com", "password": "oldpassword1"}
    )
    assert old_login.status_code == 401
    new_login = client.post(
        "/api/login", json={"email": "alice@example.com", "password": "newpassword1"}
    )
    assert new_login.status_code == 200


def test_confirm_reset_wrong_code_returns_400(client, register_and_login):
    register_and_login(username="alice", email="alice@example.com")
    client.post("/api/password-reset/request", json={"email": "alice@example.com"})

    res = client.post(
        "/api/password-reset/confirm",
        json={"email": "alice@example.com", "code": "000000", "new_password": "newpassword1"},
    )
    assert res.status_code == 400


def test_confirm_reset_unknown_email_returns_400(client):
    res = client.post(
        "/api/password-reset/confirm",
        json={"email": "ghost@example.com", "code": "000000", "new_password": "newpassword1"},
    )
    assert res.status_code == 400


def test_confirm_reset_code_is_single_use(app, client, register_and_login):
    register_and_login(username="alice", email="alice@example.com")
    client.post("/api/password-reset/request", json={"email": "alice@example.com"})
    code = _last_code(app, "alice@example.com")

    first = client.post(
        "/api/password-reset/confirm",
        json={"email": "alice@example.com", "code": code, "new_password": "newpassword1"},
    )
    assert first.status_code == 200

    second = client.post(
        "/api/password-reset/confirm",
        json={"email": "alice@example.com", "code": code, "new_password": "anotherpassword1"},
    )
    assert second.status_code == 400
