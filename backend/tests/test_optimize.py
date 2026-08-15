from app import get_overlap_minutes, score_full_schedule, to_minutes


# --- pure algorithm unit tests ---


def test_to_minutes_basic():
    assert to_minutes("Mon", "08:00") == 0 * 24 * 60 + 8 * 60
    assert to_minutes("Tue", "09:30") == 1 * 24 * 60 + 9 * 60 + 30


def test_to_minutes_invalid_input_returns_zero():
    assert to_minutes("Mon", "not-a-time") == 0
    assert to_minutes("Unknown", "08:00") == 0


def test_get_overlap_minutes_no_overlap():
    a = {"day": "Mon", "start": "08:00", "end": "10:00"}
    b = {"day": "Mon", "start": "10:00", "end": "12:00"}
    assert get_overlap_minutes(a, b) == 0


def test_get_overlap_minutes_partial_overlap():
    a = {"day": "Mon", "start": "08:00", "end": "10:00"}
    b = {"day": "Mon", "start": "09:00", "end": "11:00"}
    assert get_overlap_minutes(a, b) == 60


def test_get_overlap_minutes_different_days_never_overlap():
    a = {"day": "Mon", "start": "08:00", "end": "10:00"}
    b = {"day": "Tue", "start": "08:00", "end": "10:00"}
    assert get_overlap_minutes(a, b) == 0


def test_score_full_schedule_empty_is_heavily_penalized():
    score, conflicts = score_full_schedule([])
    assert score == -100000
    assert conflicts == 0


def test_score_full_schedule_conflict_is_penalized_more_than_no_conflict():
    no_conflict = [
        {"day": "Mon", "start": "08:00", "end": "10:00"},
        {"day": "Mon", "start": "10:00", "end": "12:00"},
    ]
    with_conflict = [
        {"day": "Mon", "start": "08:00", "end": "10:00"},
        {"day": "Mon", "start": "09:00", "end": "11:00"},
    ]

    score_ok, conflicts_ok = score_full_schedule(no_conflict)
    score_bad, conflicts_bad = score_full_schedule(with_conflict)

    assert conflicts_ok == 0
    assert conflicts_bad == 60
    assert score_ok > score_bad


def test_score_full_schedule_rewards_fewer_gaps():
    tight = [
        {"day": "Mon", "start": "08:00", "end": "10:00"},
        {"day": "Mon", "start": "10:00", "end": "12:00"},
    ]
    with_gap = [
        {"day": "Mon", "start": "08:00", "end": "09:00"},
        {"day": "Mon", "start": "11:00", "end": "12:00"},
    ]

    score_tight, _ = score_full_schedule(tight)
    score_gap, _ = score_full_schedule(with_gap)

    assert score_tight > score_gap


# --- /api/optimize endpoint tests ---


def _lecture(day="Mon", start="08:00", end="10:00"):
    return {"day": day, "start": start, "end": end}


def test_optimize_requires_login(client):
    res = client.post("/api/optimize", json={"modules": []})
    assert res.status_code == 401


def test_optimize_no_modules_returns_400(client, register_and_login):
    register_and_login()
    res = client.post("/api/optimize", json={"modules": []})
    assert res.status_code == 400
    assert res.get_json()["status"] == "error"


def test_optimize_single_module_no_tutorials(client, register_and_login):
    register_and_login()
    modules = [
        {
            "name": "Math",
            "lectures": [_lecture()],
            "labs": [],
            "tutorials": [],
        }
    ]
    res = client.post("/api/optimize", json={"modules": modules})
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "success"
    assert len(body["best_plans"]) == 1
    assert body["best_plans"][0]["conflicts"] == 0


def test_optimize_picks_the_non_conflicting_tutorial_group(client, register_and_login):
    register_and_login()
    modules = [
        {
            "name": "Math",
            "lectures": [_lecture("Mon", "08:00", "10:00")],
            "labs": [],
            "tutorials": [
                # Overlaps the lecture -> should be ranked worse.
                [_lecture("Mon", "09:00", "11:00")],
                # Doesn't overlap -> should be the top result.
                [_lecture("Mon", "10:00", "12:00")],
            ],
        }
    ]
    res = client.post("/api/optimize", json={"modules": modules})
    assert res.status_code == 200
    plans = res.get_json()["best_plans"]
    assert len(plans) == 2
    assert plans[0]["conflicts"] == 0
    assert plans[0]["score"] > plans[1]["score"]


def test_optimize_rejects_combinatorial_explosion(client, register_and_login, monkeypatch):
    register_and_login()

    import app as app_module

    monkeypatch.setattr(app_module, "MAX_COMBINATIONS", 10)

    # 4 modules x 4 tutorial groups each = 256 combinations, above the cap.
    modules = [
        {
            "name": f"Module {i}",
            "lectures": [_lecture()],
            "labs": [],
            "tutorials": [[_lecture("Tue", "08:00", "09:00")] for _ in range(4)],
        }
        for i in range(4)
    ]

    res = client.post("/api/optimize", json={"modules": modules})
    assert res.status_code == 400
    assert "Too many possible combinations" in res.get_json()["message"]
