from datetime import UTC, datetime

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB

db = SQLAlchemy()

# Plain db.JSON is stored as TEXT on SQLite and as the vanilla `json` type
# on Postgres; with_variant upgrades it to `jsonb` on Postgres specifically
# (more compact, faster to (de)serialize) while leaving the SQLite/test
# behavior untouched.
JSONBlob = db.JSON().with_variant(JSONB, "postgresql")


def _utcnow():
    # datetime.utcnow() is deprecated (naive, easy to misuse); this is its
    # timezone-aware replacement.
    return datetime.now(UTC)


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    # Login identifier (username is display-only). Always stored lowercased so
    # lookups/uniqueness checks are case-insensitive without needing a
    # citext/functional-index dance.
    email = db.Column(db.String(255), unique=True, nullable=False)
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    # Holds a new email awaiting confirmation from a settings change; `email`
    # itself is only overwritten once the code sent to this address is
    # confirmed, which is what keeps the old address authoritative until then.
    pending_email = db.Column(db.String(255), nullable=True)

    # Deleting a user cascades to their projects (and, via Project, to saved schedules).
    projects = db.relationship(
        "Project", backref="owner", cascade="all, delete-orphan", lazy=True
    )
    verification_codes = db.relationship(
        "VerificationCode", cascade="all, delete-orphan", lazy=True
    )


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow)
    # Bumped on every write so clients can detect whether their cached copy
    # (e.g. the frontend's localStorage draft) is stale compared to the server.
    updated_at = db.Column(
        db.DateTime, default=_utcnow, onupdate=_utcnow
    )

    # The list of modules (lectures/labs/tutorial groups) the user entered,
    # stored as JSON rather than normalized tables since it's edited/read as
    # a single blob and never queried by its internal structure.
    input_modules = db.Column(JSONBlob, nullable=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    # Deleting a project cascades to its saved/optimized schedules.
    results = db.relationship(
        "SavedSchedule", backref="project", cascade="all, delete-orphan", lazy=True
    )


class SavedSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # The optimizer's output (winning combination of slots) as JSON.
    optimized_data = db.Column(JSONBlob, nullable=False)
    score = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=_utcnow)

    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False, index=True)


class VerificationCode(db.Model):
    """A short-lived, single-use code emailed to a user to prove control of
    an address: initial registration, a settings email change, or a password
    reset. Only the sha256 hash is stored (mirrors how passwords are never
    stored in plaintext) so a DB leak alone doesn't hand out live codes.
    """

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    # "verify_email" | "change_email" | "password_reset"
    purpose = db.Column(db.String(20), nullable=False)
    code_hash = db.Column(db.String(64), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    consumed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)
