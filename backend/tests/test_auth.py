def test_register_success(client):
    res = client.post(
        "/api/register", json={"username": "bob", "password": "supersecret1"}
    )
    assert res.status_code == 201


def test_register_missing_fields_returns_400(client):
    res = client.post("/api/register", json={"username": "bob"})
    assert res.status_code == 400
    assert "password" in res.get_json()["error"]


def test_register_non_json_body_returns_400(client):
    res = client.post("/api/register", data="not json")
    assert res.status_code == 400


def test_register_short_password_rejected(client):
    res = client.post("/api/register", json={"username": "bob", "password": "short"})
    assert res.status_code == 400


def test_register_duplicate_username_returns_400(client):
    client.post("/api/register", json={"username": "bob", "password": "supersecret1"})
    res = client.post(
        "/api/register", json={"username": "bob", "password": "anotherpassword"}
    )
    assert res.status_code == 400
    assert "already taken" in res.get_json()["error"]


def test_login_success_sets_session(client):
    client.post("/api/register", json={"username": "bob", "password": "supersecret1"})
    res = client.post("/api/login", json={"username": "bob", "password": "supersecret1"})
    assert res.status_code == 200
    assert res.get_json()["user"]["username"] == "bob"

    me = client.get("/api/me")
    assert me.status_code == 200
    assert me.get_json()["username"] == "bob"


def test_login_wrong_password_returns_401(client):
    client.post("/api/register", json={"username": "bob", "password": "supersecret1"})
    res = client.post("/api/login", json={"username": "bob", "password": "wrong-one"})
    assert res.status_code == 401


def test_login_unknown_user_returns_401(client):
    res = client.post(
        "/api/login", json={"username": "ghost", "password": "whatever123"}
    )
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
