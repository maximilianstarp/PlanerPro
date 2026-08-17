import re
from datetime import UTC, datetime, timedelta

from database import VerificationCode, db


def _last_code(app, to):
    """Pull the 6-digit code out of the most recent email sent to `to` (see
    mail.send_email's TESTING-mode outbox)."""
    outbox = app.config.get("MAIL_OUTBOX", [])
    for entry in reversed(outbox):
        if entry["to"] == to:
            match = re.search(r"\b(\d{6})\b", entry["body"])
            assert match, f"no 6-digit code found in email body: {entry['body']!r}"
            return match.group(1)
    raise AssertionError(f"no email sent to {to}")


def test_register_sends_verification_email(app, client):
    client.post(
        "/api/register",
        json={"username": "bob", "email": "bob@example.com", "password": "supersecret1"},
    )
    _last_code(app, "bob@example.com")  # raises if absent


def test_verify_email_requires_login(client):
    res = client.post("/api/verify-email", json={"code": "123456"})
    assert res.status_code == 401


def test_verify_email_wrong_code_returns_400(app, client, register_and_login):
    register_and_login()
    res = client.post("/api/verify-email", json={"code": "000000"})
    assert res.status_code == 400


def test_verify_email_correct_code_succeeds(app, client, register_and_login):
    register_and_login(username="bob", email="bob@example.com")
    code = _last_code(app, "bob@example.com")

    res = client.post("/api/verify-email", json={"code": code})
    assert res.status_code == 200

    me = client.get("/api/me")
    assert me.get_json()["email_verified"] is True


def test_verify_email_code_is_single_use(app, client, register_and_login):
    register_and_login(username="bob", email="bob@example.com")
    code = _last_code(app, "bob@example.com")

    first = client.post("/api/verify-email", json={"code": code})
    assert first.status_code == 200

    second = client.post("/api/verify-email", json={"code": code})
    assert second.status_code == 200
    assert second.get_json()["message"] == "Email already verified"


def test_verify_email_expired_code_returns_400(app, client, register_and_login):
    register_and_login(username="bob", email="bob@example.com")
    code = _last_code(app, "bob@example.com")

    with app.app_context():
        vc = VerificationCode.query.filter_by(purpose="verify_email").first()
        vc.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db.session.commit()

    res = client.post("/api/verify-email", json={"code": code})
    assert res.status_code == 400


def test_resend_verification_email_issues_new_code(app, client, register_and_login):
    register_and_login(username="bob", email="bob@example.com")
    old_code = _last_code(app, "bob@example.com")

    res = client.post("/api/resend-verification-email")
    assert res.status_code == 200
    new_code = _last_code(app, "bob@example.com")

    assert client.post("/api/verify-email", json={"code": old_code}).status_code == 400
    assert client.post("/api/verify-email", json={"code": new_code}).status_code == 200


def test_resend_verification_email_noop_when_already_verified(app, client, register_and_login):
    register_and_login(username="bob", email="bob@example.com")
    code = _last_code(app, "bob@example.com")
    client.post("/api/verify-email", json={"code": code})

    outbox_before = len(app.config.get("MAIL_OUTBOX", []))
    res = client.post("/api/resend-verification-email")
    assert res.status_code == 200
    assert res.get_json()["message"] == "Email already verified"
    assert len(app.config["MAIL_OUTBOX"]) == outbox_before
