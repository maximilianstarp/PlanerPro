def test_register_success(client):
    res = client.post(
        "/api/register",
        json={"username": "bob", "email": "bob@example.com", "password": "supersecret1"},
    )
    assert res.status_code == 201


def test_register_missing_fields_returns_400(client):
    res = client.post("/api/register", json={"username": "bob"})
    assert res.status_code == 400
    assert "email" in res.get_json()["error"]
    assert "password" in res.get_json()["error"]


def test_register_non_json_body_returns_400(client):
    res = client.post("/api/register", data="not json")
    assert res.status_code == 400


def test_register_short_password_rejected(client):
    res = client.post(
        "/api/register",
        json={"username": "bob", "email": "bob@example.com", "password": "short"},
    )
    assert res.status_code == 400


def test_register_invalid_email_rejected(client):
    res = client.post(
        "/api/register",
        json={"username": "bob", "email": "not-an-email", "password": "supersecret1"},
    )
    assert res.status_code == 400
    assert "valid email" in res.get_json()["error"]


def test_register_duplicate_username_returns_400(client):
    client.post(
        "/api/register",
        json={"username": "bob", "email": "bob@example.com", "password": "supersecret1"},
    )
    res = client.post(
        "/api/register",
        json={"username": "bob", "email": "other@example.com", "password": "anotherpassword"},
    )
    assert res.status_code == 400
    assert "already taken" in res.get_json()["error"]


def test_register_duplicate_email_returns_400(client):
    client.post(
        "/api/register",
        json={"username": "bob", "email": "bob@example.com", "password": "supersecret1"},
    )
    res = client.post(
        "/api/register",
        json={"username": "someoneelse", "email": "bob@example.com", "password": "anotherpassword"},
    )
    assert res.status_code == 400
    assert "already exists" in res.get_json()["error"]


def test_register_duplicate_email_case_insensitive(client):
    client.post(
        "/api/register",
        json={"username": "bob", "email": "bob@example.com", "password": "supersecret1"},
    )
    res = client.post(
        "/api/register",
        json={"username": "someoneelse", "email": "BOB@Example.com", "password": "anotherpassword"},
    )
    assert res.status_code == 400
    assert "already exists" in res.get_json()["error"]


def test_register_duplicate_username_with_short_password_reports_taken_not_short(client):
    # A too-short password on an already-taken username must report the
    # username conflict, not "password too short" -- otherwise fixing the
    # password and retrying just reveals the real error one step too late.
    client.post(
        "/api/register",
        json={"username": "bob", "email": "bob@example.com", "password": "supersecret1"},
    )
    res = client.post(
        "/api/register",
        json={"username": "bob", "email": "other@example.com", "password": "short"},
    )
    assert res.status_code == 400
    assert "already taken" in res.get_json()["error"]


def test_login_success_sets_session(client):
    client.post(
        "/api/register",
        json={"username": "bob", "email": "bob@example.com", "password": "supersecret1"},
    )
    res = client.post("/api/login", json={"email": "bob@example.com", "password": "supersecret1"})
    assert res.status_code == 200
    assert res.get_json()["user"]["username"] == "bob"
    assert res.get_json()["user"]["email"] == "bob@example.com"
    assert res.get_json()["user"]["email_verified"] is False

    me = client.get("/api/me")
    assert me.status_code == 200
    assert me.get_json()["username"] == "bob"


def test_login_is_case_insensitive_on_email(client):
    client.post(
        "/api/register",
        json={"username": "bob", "email": "bob@example.com", "password": "supersecret1"},
    )
    res = client.post("/api/login", json={"email": "BOB@Example.com", "password": "supersecret1"})
    assert res.status_code == 200


def test_login_wrong_password_returns_401(client):
    client.post(
        "/api/register",
        json={"username": "bob", "email": "bob@example.com", "password": "supersecret1"},
    )
    res = client.post("/api/login", json={"email": "bob@example.com", "password": "wrong-one"})
    assert res.status_code == 401


def test_login_unknown_email_returns_401(client):
    res = client.post("/api/login", json={"email": "ghost@example.com", "password": "whatever123"})
    assert res.status_code == 401


def test_me_unauthenticated_returns_401(client):
    res = client.get("/api/me")
    assert res.status_code == 401


def test_logout_requires_login(client):
    res = client.post("/api/logout")
    assert res.status_code == 401


def test_logout_clears_session(client, register_and_login):
    register_and_login()
    res = client.post("/api/logout")
    assert res.status_code == 200

    me = client.get("/api/me")
    assert me.status_code == 401
