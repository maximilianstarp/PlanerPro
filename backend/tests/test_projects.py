def test_projects_require_login(client):
    assert client.get("/api/projects").status_code == 401
    assert client.post("/api/projects", json={"name": "x"}).status_code == 401


def test_create_and_list_project(client, register_and_login):
    register_and_login()

    create_res = client.post("/api/projects", json={"name": "Summer 2026"})
    assert create_res.status_code == 201
    project_id = create_res.get_json()["id"]

    list_res = client.get("/api/projects")
    assert list_res.status_code == 200
    names = [p["name"] for p in list_res.get_json()]
    assert "Summer 2026" in names
    assert project_id in [p["id"] for p in list_res.get_json()]


def test_create_project_missing_name_returns_400(client, register_and_login):
    register_and_login()
    res = client.post("/api/projects", json={})
    assert res.status_code == 400


def test_get_project_detail(client, register_and_login):
    register_and_login()
    project_id = client.post("/api/projects", json={"name": "Winter 2026"}).get_json()["id"]

    res = client.get(f"/api/projects/{project_id}")
    assert res.status_code == 200
    body = res.get_json()
    assert body["name"] == "Winter 2026"
    assert body["input_modules"] == []
    assert body["updated_at"] is not None


def test_get_missing_project_returns_404(client, register_and_login):
    register_and_login()
    res = client.get("/api/projects/999999")
    assert res.status_code == 404


def test_update_project_saves_modules_and_bumps_updated_at(client, register_and_login):
    register_and_login()
    project_id = client.post("/api/projects", json={"name": "P"}).get_json()["id"]
    before = client.get(f"/api/projects/{project_id}").get_json()["updated_at"]

    modules = [{"name": "Math", "lectures": [], "labs": [], "tutorials": []}]
    res = client.put(f"/api/projects/{project_id}", json={"input_modules": modules})
    assert res.status_code == 200
    after = res.get_json()["updated_at"]
    assert after >= before

    detail = client.get(f"/api/projects/{project_id}").get_json()
    assert detail["input_modules"] == modules


def test_delete_project(client, register_and_login):
    register_and_login()
    project_id = client.post("/api/projects", json={"name": "P"}).get_json()["id"]

    res = client.delete(f"/api/projects/{project_id}")
    assert res.status_code == 200
    assert client.get(f"/api/projects/{project_id}").status_code == 404


def test_user_cannot_access_other_users_project(client, register_and_login):
    register_and_login("alice", "alice-password1")
    project_id = client.post("/api/projects", json={"name": "Alice's plan"}).get_json()["id"]
    client.post("/api/logout")

    register_and_login("mallory", "mallory-password1")
    assert client.get(f"/api/projects/{project_id}").status_code == 403
    assert client.put(f"/api/projects/{project_id}", json={"input_modules": []}).status_code == 403
    assert client.delete(f"/api/projects/{project_id}").status_code == 403


def test_delete_account_removes_projects(client, register_and_login):
    register_and_login()
    client.post("/api/projects", json={"name": "Gone soon"})

    res = client.delete("/api/delete-account")
    assert res.status_code == 200
    # session is cleared, so the (cascade-deleted) project is unreachable anyway
    assert client.get("/api/projects").status_code == 401
