from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime, timezone

db = SQLAlchemy()


def _utcnow():
    # datetime.utcnow() is deprecated (naive, easy to misuse); this is its
    # timezone-aware replacement.
    return datetime.now(timezone.utc)


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    # Deleting a user cascades to their projects (and, via Project, to saved schedules).
    projects = db.relationship(
        "Project", backref="owner", cascade="all, delete-orphan", lazy=True
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
    input_modules = db.Column(db.JSON, nullable=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    # Deleting a project cascades to its saved/optimized schedules.
    results = db.relationship(
        "SavedSchedule", backref="project", cascade="all, delete-orphan", lazy=True
    )


class SavedSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # The optimizer's output (winning combination of slots) as JSON.
    optimized_data = db.Column(db.JSON, nullable=False)
    score = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=_utcnow)

    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
