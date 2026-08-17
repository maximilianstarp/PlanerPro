import base64
import hashlib
import heapq
import hmac
import itertools
import logging
import os
import re
import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_migrate import Migrate

from database import Project, User, VerificationCode, db
from mail import MailError, send_email

logger = logging.getLogger(__name__)

# Combinations above this are rejected before we even try to build them.
# Every optional tutorial group multiplies the number of full-schedule
# combinations (see optimize() below), so a handful of modules with several
# tutorial groups each can blow up combinatorially. This cap keeps the
# request bounded instead of letting the server hang / OOM on bad input.
MAX_COMBINATIONS = 200_000

# Number of top-scoring plans returned by /api/optimize.
TOP_N = 15


def _env_bool(name: str, default: bool) -> bool:
    """Parse a boolean-ish environment variable ('true', '1', 'yes', ...)."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


# --- SCHEDULING / OPTIMIZATION ALGORITHM ---
#
# Pure functions (no Flask/DB dependency) so they're directly unit-testable
# and reusable outside of a request context.


def to_minutes(day, time_str):
    days = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}
    try:
        t = datetime.strptime(time_str, "%H:%M")
        return days[day] * 24 * 60 + t.hour * 60 + t.minute
    except (KeyError, ValueError):
        return 0


def get_overlap_minutes(slot1, slot2):
    s1_start = to_minutes(slot1["day"], slot1["start"])
    s1_end = to_minutes(slot1["day"], slot1["end"])
    s2_start = to_minutes(slot2["day"], slot2["start"])
    s2_end = to_minutes(slot2["day"], slot2["end"])
    overlap = min(s1_end, s2_end) - max(s1_start, s2_start)
    return max(0, overlap)


def score_full_schedule(schedule):
    """Score one full combination of slots (higher is better).

    Starts from a fixed baseline and subtracts penalties for time conflicts
    (heavily) and gaps between classes on the same day (lightly), with a
    small bonus/malus for how compact each day is. Returns
    (score, conflict_minutes) so the caller can both rank options and report
    how bad the conflicts are.
    """
    if not schedule:
        return -100000, 0

    # Each slot's day/start/end is converted to minutes exactly once here and
    # reused by both passes below (the O(n^2) conflict pass and the per-day
    # gap analysis previously re-ran to_minutes/strptime from scratch in
    # each one).
    minutes = [
        (slot["day"], to_minutes(slot["day"], slot["start"]), to_minutes(slot["day"], slot["end"]))
        for slot in schedule
    ]

    conflict_minutes = 0
    for i in range(len(minutes)):
        _, s1_start, s1_end = minutes[i]
        for j in range(i + 1, len(minutes)):
            _, s2_start, s2_end = minutes[j]
            overlap = min(s1_end, s2_end) - max(s1_start, s2_start)
            conflict_minutes += max(0, overlap)

    score = 100000
    score -= conflict_minutes * 5000  # conflicts should dominate the ranking

    days_data = {}
    for d, start, end in minutes:
        duration = end - start

        if d not in days_data:
            days_data[d] = {"min": start, "max": end, "active_time": duration}
        else:
            days_data[d]["min"] = min(days_data[d]["min"], start)
            days_data[d]["max"] = max(days_data[d]["max"], end)
            days_data[d]["active_time"] += duration

    total_gaps = 0
    for _day, data in days_data.items():
        span = data["max"] - data["min"]
        gaps = span - data["active_time"]
        total_gaps += gaps
        if span > 360:
            score += 300
        elif 0 < span < 180:
            score += 150

    score -= total_gaps * 10
    return int(score), conflict_minutes


# --- PASSWORD HASHING ---
#
# bcrypt truncates its input at 72 bytes, so long passwords are hashed with
# SHA-256 first (whose 32-byte digest is then base64-encoded) to normalize
# the input length before bcrypt ever sees it, without reducing the
# effective password space. bcrypt still does the actual slow, salted
# hashing - the SHA-256 step is purely a length adapter.


def generate_password_hash_custom(password: str) -> str:
    password_bytes = password.encode("utf-8")
    sha256_hash = hashlib.sha256(password_bytes).digest()
    password_to_bcrypt = base64.b64encode(sha256_hash)
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_to_bcrypt, salt)
    return hashed.decode("utf-8")


def check_password_hash_custom(pw_hash: str, password: str) -> bool:
    password_bytes = password.encode("utf-8")
    hash_bytes = pw_hash.encode("utf-8")
    sha256_hash = hashlib.sha256(password_bytes).digest()
    password_to_verify = base64.b64encode(sha256_hash)
    return bcrypt.checkpw(password_to_verify, hash_bytes)


# --- EMAIL VERIFICATION CODES ---
#
# One mechanism (VerificationCode, see database.py) backs registration
# verification, settings email changes, and password reset - distinguished
# by `purpose`. Codes are 6-digit, single-use, short-lived, and only ever
# stored hashed (never in plaintext), same spirit as passwords.

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CODE_TTL_MINUTES = 15


def _valid_email(value) -> bool:
    return isinstance(value, str) and bool(EMAIL_RE.match(value.strip()))


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _issue_code(user: User, purpose: str) -> str:
    """Invalidate any outstanding codes of this purpose for `user`, create a
    fresh one, and return the plaintext code to embed in the email (only the
    hash is persisted)."""
    VerificationCode.query.filter_by(
        user_id=user.id, purpose=purpose, consumed_at=None
    ).delete()

    code = f"{secrets.randbelow(1_000_000):06d}"
    db.session.add(
        VerificationCode(
            user_id=user.id,
            purpose=purpose,
            code_hash=_hash_code(code),
            expires_at=datetime.now(UTC) + timedelta(minutes=CODE_TTL_MINUTES),
        )
    )
    db.session.commit()
    return code


def _consume_code(user: User, purpose: str, submitted) -> bool:
    """Check `submitted` against the newest unconsumed, unexpired code of
    this purpose for `user`; mark it consumed and return True on a match."""
    if not isinstance(submitted, str) or not submitted.strip():
        return False

    now = datetime.now(UTC)
    candidate = (
        VerificationCode.query.filter_by(user_id=user.id, purpose=purpose, consumed_at=None)
        .filter(VerificationCode.expires_at > now)
        .order_by(VerificationCode.id.desc())
        .first()
    )
    if candidate is None:
        return False

    if not hmac.compare_digest(candidate.code_hash, _hash_code(submitted.strip())):
        return False

    candidate.consumed_at = now
    db.session.commit()
    return True


# --- INPUT VALIDATION ---


def get_json_body():
    """Return request.json, or None if it's missing/not an object."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def require_fields(data, fields):
    """Return an error message if any of `fields` is missing/blank."""
    missing = [f for f in fields if not str(data.get(f, "")).strip()]
    if missing:
        return f"Missing required field(s): {', '.join(missing)}"
    return None


# A single shared Limiter, wired to each Flask app via init_app() (the usual
# Flask-extension pattern, like the `db` object in database.py). Creating a
# brand new Limiter per app instance breaks its internal weakref bookkeeping
# when many short-lived apps exist in one process, e.g. across the test suite.
limiter = Limiter(key_func=get_remote_address, default_limits=[])


def create_app(test_config: dict | None = None) -> Flask:
    """Application factory.

    Building the app in a function (instead of at import time) lets tests
    spin up isolated instances with their own config/database, and keeps
    module import free of side effects.
    """
    app = Flask(__name__)

    debug_mode = _env_bool("DEBUG", False)

    # SECRET_KEY signs session cookies - a leaked/guessable one lets an
    # attacker forge sessions. In debug mode we fall back to a fixed value
    # for developer convenience (with a loud warning); in every other mode
    # this is a hard failure, so a missing secret can never ship silently.
    secret_key = os.getenv("FLASK_SECRET_KEY")
    if not secret_key:
        if debug_mode or test_config:
            secret_key = "dev-only-insecure-secret-key"
            logger.warning(
                "FLASK_SECRET_KEY is not set - using an insecure development "
                "default. This is only acceptable with DEBUG=true."
            )
        else:
            raise RuntimeError(
                "FLASK_SECRET_KEY environment variable is required outside of "
                "DEBUG mode. Set it in your .env file."
            )

    # Comma-separated list of origins allowed to call the API with
    # credentials, e.g. "https://planner.example.com,https://www.example.com".
    # No wildcard here on purpose: CORS + cookies + wildcard origin is a
    # classic credential-leak misconfiguration.
    allowed_origins = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]

    # A relative sqlite:/// URI is resolved by Flask-SQLAlchemy against
    # app.instance_path (i.e. <root>/instance), which is exactly the
    # directory docker-compose.yml mounts as a volume - so the default here
    # already persists across container restarts without needing an
    # "instance/" prefix (that would double up to instance/instance/).
    database_uri = os.getenv("DATABASE_URL", "sqlite:///project.db")

    # pool_pre_ping is safe/cheap on every dialect (pings a pooled
    # connection before reuse, transparently reconnecting if it went
    # stale). The rest (pool_size/max_overflow/pool_recycle) are
    # QueuePool-specific kwargs that SQLite's default pool class doesn't
    # accept, so they're only added for Postgres - pool_recycle in
    # particular guards against a network/firewall silently dropping idle
    # connections, which isn't a concern for a local SQLite file.
    engine_options = {"pool_pre_ping": True}
    if database_uri.startswith("postgresql"):
        engine_options.update(pool_size=5, max_overflow=10, pool_recycle=1800)

    app.config.update(
        SECRET_KEY=secret_key,
        SQLALCHEMY_DATABASE_URI=database_uri,
        SQLALCHEMY_ENGINE_OPTIONS=engine_options,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        DEBUG=debug_mode,
        # Cookie hardening. SESSION_COOKIE_SECURE must be "true" once the app
        # is actually served over HTTPS (e.g. behind the production nginx
        # reverse proxy) - browsers silently drop "Secure" cookies over plain
        # HTTP, which is why this stays env-controlled instead of hardcoded.
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=_env_bool("SESSION_COOKIE_SECURE", False),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_PERMANENT=True,
        USE_X_SENDFILE=False,
        # Outgoing mail (verification codes / password resets) - see
        # mail.send_email(). All optional: with SMTP_HOST unset, emails are
        # logged instead of sent, so this works locally with zero setup.
        SMTP_HOST=os.getenv("SMTP_HOST") or None,
        SMTP_PORT=int(os.getenv("SMTP_PORT", "587")),
        SMTP_USERNAME=os.getenv("SMTP_USERNAME") or None,
        SMTP_PASSWORD=os.getenv("SMTP_PASSWORD") or None,
        SMTP_USE_TLS=_env_bool("SMTP_USE_TLS", True),
        MAIL_FROM=os.getenv("MAIL_FROM", "PlannerPro <no-reply@planerpro.local>"),
    )

    if test_config:
        app.config.update(test_config)

    # The instance folder (where relative sqlite:// paths end up, see above)
    # isn't created automatically - SQLite needs it to exist beforehand.
    os.makedirs(app.instance_path, exist_ok=True)

    logging.basicConfig(
        level=logging.DEBUG if app.config["DEBUG"] else logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

    CORS(
        app,
        supports_credentials=True,
        origins=allowed_origins,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Only advertise HSTS once cookies are actually marked Secure - a
        # host still being served over plain HTTP has no business telling
        # browsers to force HTTPS for it (see SESSION_COOKIE_SECURE above).
        if app.config.get("SESSION_COOKIE_SECURE"):
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains"
            )
        return response

    db.init_app(app)
    Migrate(app, db)

    # In-memory storage means limits are per-process. That's fine as long as
    # the app runs as a single gunicorn worker (see Dockerfile). Reads from
    # the environment so ops can point it at Redis (e.g.
    # "redis://redis:6379/0") before scaling out to multiple
    # workers/instances, without a code change - see .env.example.
    app.config.setdefault("RATELIMIT_STORAGE_URI", os.getenv("RATELIMIT_STORAGE_URI") or "memory://")
    # Off by default under TESTING so the rest of the suite isn't slowed
    # down / made flaky by it; test_security.py opts back in explicitly.
    if "RATELIMIT_ENABLED" not in app.config:
        app.config["RATELIMIT_ENABLED"] = not app.config.get("TESTING", False)
    limiter.init_app(app)

    login_manager = LoginManager(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Authentication required"}), 401

    if app.config.get("TESTING"):
        with app.app_context():
            db.create_all()

    # --- HEALTH CHECK ---

    @app.route("/api/health", methods=["GET"])
    def health():
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception:
            logger.exception("Health check failed: database not reachable")
            return jsonify({"status": "error", "database": "unreachable"}), 503
        return jsonify({"status": "ok"}), 200

    # --- AUTH ROUTES ---

    def _user_json(user):
        return {
            "username": user.username,
            "email": user.email,
            "email_verified": user.email_verified,
            "pending_email": user.pending_email,
        }

    def _send_code_email(user, purpose, to_email, subject, intro):
        code = _issue_code(user, purpose)
        try:
            send_email(
                app,
                to_email,
                subject,
                f"{intro}\n\nYour verification code is: {code}\n\n"
                f"This code expires in {CODE_TTL_MINUTES} minutes.",
            )
        except MailError:
            return False
        return True

    @app.route("/api/register", methods=["POST"])
    @limiter.limit("10 per minute")
    def register():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        error = require_fields(data, ["username", "email", "password"])
        if error:
            return jsonify({"error": error}), 400

        username = data["username"].strip()
        email = data["email"].strip().lower()
        password = data["password"]

        # Check identity conflicts (username, then email) before password
        # strength: otherwise a too-short password on an already-taken
        # username/email reports "password too short" and hides the real,
        # more fundamental problem. The user "fixes" the password, retries,
        # and only then learns the username/email was taken all along.
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username is already taken"}), 400

        if not _valid_email(email):
            return jsonify({"error": "Please enter a valid email address"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "An account with this email already exists"}), 400

        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        hashed_pw = generate_password_hash_custom(password)
        new_user = User(
            username=username, email=email, password_hash=hashed_pw, email_verified=False
        )
        db.session.add(new_user)
        db.session.commit()

        _send_code_email(
            new_user,
            "verify_email",
            email,
            "Verify your PlannerPro email",
            "Welcome to PlannerPro! Please confirm your email address.",
        )
        return jsonify(
            {"message": "Registration successful. Check your email for a verification code."}
        ), 201

    @app.route("/api/login", methods=["POST"])
    @limiter.limit("10 per minute")
    def login():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        error = require_fields(data, ["email", "password"])
        if error:
            return jsonify({"error": error}), 400

        user = User.query.filter_by(email=data["email"].strip().lower()).first()

        if user and check_password_hash_custom(user.password_hash, data["password"]):
            login_user(user, remember=True)
            return jsonify({"message": "Login successful", "user": _user_json(user)}), 200

        return jsonify({"error": "Invalid credentials"}), 401

    @app.route("/api/logout", methods=["POST"])
    @login_required
    def logout():
        logout_user()
        return jsonify({"message": "Logged out"}), 200

    @app.route("/api/me", methods=["GET"])
    def me():
        if current_user.is_authenticated:
            return jsonify(_user_json(current_user)), 200
        return jsonify({"error": "Not logged in"}), 401

    # --- EMAIL VERIFICATION ---

    @app.route("/api/verify-email", methods=["POST"])
    @login_required
    @limiter.limit("10 per minute")
    def verify_email():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        if current_user.email_verified:
            return jsonify({"message": "Email already verified"}), 200

        if not _consume_code(current_user, "verify_email", data.get("code")):
            return jsonify({"error": "Invalid or expired code"}), 400

        current_user.email_verified = True
        db.session.commit()
        return jsonify({"message": "Email verified"}), 200

    @app.route("/api/resend-verification-email", methods=["POST"])
    @login_required
    @limiter.limit("3 per minute")
    def resend_verification_email():
        if current_user.email_verified:
            return jsonify({"message": "Email already verified"}), 200

        _send_code_email(
            current_user,
            "verify_email",
            current_user.email,
            "Verify your PlannerPro email",
            "Here's a new verification code for your PlannerPro account.",
        )
        return jsonify({"message": "Verification code sent"}), 200

    # --- ACCOUNT SETTINGS: profile ---

    @app.route("/api/settings/username", methods=["POST"])
    @login_required
    def update_username():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        error = require_fields(data, ["username"])
        if error:
            return jsonify({"error": error}), 400

        username = data["username"].strip()
        if User.query.filter(User.username == username, User.id != current_user.id).first():
            return jsonify({"error": "Username is already taken"}), 400

        current_user.username = username
        db.session.commit()
        return jsonify({"message": "Username updated", "user": _user_json(current_user)}), 200

    @app.route("/api/settings/password", methods=["POST"])
    @login_required
    def update_password():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        error = require_fields(data, ["current_password", "new_password"])
        if error:
            return jsonify({"error": error}), 400

        if not check_password_hash_custom(current_user.password_hash, data["current_password"]):
            return jsonify({"error": "Current password is incorrect"}), 400

        new_password = data["new_password"]
        if len(new_password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        current_user.password_hash = generate_password_hash_custom(new_password)
        db.session.commit()
        return jsonify({"message": "Password updated"}), 200

    @app.route("/api/settings/email", methods=["POST"])
    @login_required
    @limiter.limit("5 per minute")
    def request_email_change():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        error = require_fields(data, ["new_email", "current_password"])
        if error:
            return jsonify({"error": error}), 400

        if not check_password_hash_custom(current_user.password_hash, data["current_password"]):
            return jsonify({"error": "Current password is incorrect"}), 400

        new_email = data["new_email"].strip().lower()
        if not _valid_email(new_email):
            return jsonify({"error": "Please enter a valid email address"}), 400

        if new_email == current_user.email:
            return jsonify({"error": "That is already your current email"}), 400

        if User.query.filter(User.email == new_email, User.id != current_user.id).first():
            return jsonify({"error": "An account with this email already exists"}), 400

        # The old email stays authoritative (current_user.email is untouched)
        # until the code sent to the new address is confirmed below.
        current_user.pending_email = new_email
        db.session.commit()

        _send_code_email(
            current_user,
            "change_email",
            new_email,
            "Confirm your new PlannerPro email",
            "Please confirm this address to finish changing your PlannerPro email.",
        )
        return jsonify(
            {
                "message": "Verification code sent to the new email. "
                "Your current email stays active until confirmed.",
                "user": _user_json(current_user),
            }
        ), 200

    @app.route("/api/settings/email/verify", methods=["POST"])
    @login_required
    @limiter.limit("10 per minute")
    def confirm_email_change():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        if not current_user.pending_email:
            return jsonify({"error": "No pending email change"}), 400

        if not _consume_code(current_user, "change_email", data.get("code")):
            return jsonify({"error": "Invalid or expired code"}), 400

        current_user.email = current_user.pending_email
        current_user.pending_email = None
        current_user.email_verified = True
        db.session.commit()
        return jsonify({"message": "Email updated", "user": _user_json(current_user)}), 200

    @app.route("/api/settings/email/cancel", methods=["POST"])
    @login_required
    def cancel_email_change():
        current_user.pending_email = None
        db.session.commit()
        return jsonify({"message": "Pending email change cancelled"}), 200

    # --- PASSWORD RESET (no login required) ---

    @app.route("/api/password-reset/request", methods=["POST"])
    @limiter.limit("5 per minute")
    def request_password_reset():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        error = require_fields(data, ["email"])
        if error:
            return jsonify({"error": error}), 400

        user = User.query.filter_by(email=data["email"].strip().lower()).first()
        if user:
            _send_code_email(
                user,
                "password_reset",
                user.email,
                "Reset your PlannerPro password",
                "Use this code to reset your PlannerPro password. "
                "If you didn't request this, you can ignore this email.",
            )

        # Always the same response, whether or not the email exists -
        # otherwise this endpoint becomes an account-enumeration oracle.
        return jsonify(
            {"message": "If that email has an account, a reset code has been sent."}
        ), 200

    @app.route("/api/password-reset/confirm", methods=["POST"])
    @limiter.limit("10 per minute")
    def confirm_password_reset():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        error = require_fields(data, ["email", "code", "new_password"])
        if error:
            return jsonify({"error": error}), 400

        generic_error = jsonify({"error": "Invalid or expired code"}), 400

        user = User.query.filter_by(email=data["email"].strip().lower()).first()
        if not user or not _consume_code(user, "password_reset", data["code"]):
            return generic_error

        new_password = data["new_password"]
        if len(new_password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        user.password_hash = generate_password_hash_custom(new_password)
        db.session.commit()
        return jsonify({"message": "Password reset. You can now log in."}), 200

    # --- PROJECT ROUTES ---

    @app.route("/api/projects", methods=["GET"])
    @login_required
    def get_projects():
        user_projects = Project.query.filter_by(user_id=current_user.id).all()
        return jsonify(
            [
                {
                    "id": p.id,
                    "name": p.name,
                    "created_at": p.created_at.isoformat(),
                }
                for p in user_projects
            ]
        )

    @app.route("/api/projects", methods=["POST"])
    @login_required
    def create_project():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        error = require_fields(data, ["name"])
        if error:
            return jsonify({"error": error}), 400

        new_project = Project(name=data["name"].strip(), user_id=current_user.id)
        db.session.add(new_project)
        db.session.commit()
        return jsonify({"id": new_project.id, "name": new_project.name}), 201

    @app.route("/api/projects/<int:project_id>", methods=["GET"])
    @login_required
    def get_project_detail(project_id):
        project = db.get_or_404(Project, project_id)
        if project.user_id != current_user.id:
            return jsonify({"error": "Not your project"}), 403

        return jsonify(
            {
                "id": project.id,
                "name": project.name,
                "input_modules": project.input_modules or [],
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
            }
        )

    @app.route("/api/projects/<int:project_id>", methods=["DELETE"])
    @login_required
    def delete_project(project_id):
        project = db.get_or_404(Project, project_id)
        if project.user_id != current_user.id:
            return jsonify({"error": "Not your project"}), 403

        db.session.delete(project)
        db.session.commit()
        return jsonify({"message": "Deleted"}), 200

    @app.route("/api/projects/<int:project_id>", methods=["PUT"])
    @login_required
    def update_project(project_id):
        project = db.get_or_404(Project, project_id)
        if project.user_id != current_user.id:
            return jsonify({"error": "Not your project"}), 403

        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        # The whole module array is stored as-is (a JSON blob) rather than
        # normalized, since it's always read/written as a single unit.
        project.input_modules = data.get("input_modules", [])
        db.session.commit()
        return jsonify(
            {
                "message": "Project saved",
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
            }
        ), 200

    # --- OPTIMIZATION ---

    @app.route("/api/optimize", methods=["POST"])
    @login_required
    # The only CPU-heavy endpoint (up to MAX_COMBINATIONS schedules scored
    # per request) - unlike the other routes, repeated calls are cheap to
    # trigger from the UI (every "Generate plan" click) but expensive to
    # serve, so it gets its own limit rather than relying on none at all.
    @limiter.limit("20 per minute")
    def optimize():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        modules = data.get("modules", [])
        if not modules:
            return jsonify({"status": "error", "message": "No modules provided"}), 400

        # 1. Build the list of viable slot-combinations for each module.
        module_options = []
        for mod in modules:
            mod_name = mod.get("name") or "Unnamed"
            mod_color = mod.get("color")

            mandatory = []
            for s in mod.get("lectures", []) + mod.get("labs", []):
                s_copy = s.copy()
                s_copy["name"] = mod_name
                s_copy["color"] = mod_color
                mandatory.append(s_copy)

            tuts = mod.get("tutorials", [])
            options_for_this_module = []

            if not tuts:
                options_for_this_module.append(mandatory)
            else:
                for group in tuts:
                    group_slots = []
                    for s in group:
                        s_copy = s.copy()
                        s_copy["name"] = f"{mod_name} (Tut)"
                        s_copy["color"] = mod_color
                        group_slots.append(s_copy)
                    options_for_this_module.append(mandatory + group_slots)

            module_options.append(options_for_this_module)

        # 2. Reject the request up front if the combinatorial product would
        # be too large, instead of building it and hanging/OOMing. Every
        # extra optional tutorial group multiplies the total, so this is
        # exponential in the number of modules with multiple groups.
        total_combinations = 1
        for options in module_options:
            total_combinations *= max(len(options), 1)
        if total_combinations > MAX_COMBINATIONS:
            return jsonify(
                {
                    "status": "error",
                    "message": (
                        "Too many possible combinations "
                        f"({total_combinations:,}) to compute. Reduce the "
                        "number of tutorial groups per module and try again."
                    ),
                }
            ), 400

        # 3. Compute every combination, keeping only the best TOP_N via a
        # fixed-size heap instead of materializing all (up to
        # MAX_COMBINATIONS) combinations and fully sorting them just to keep
        # the top 15 - peak memory stays O(TOP_N) instead of O(total
        # combinations). Each heap entry is keyed on (score, -index, ...);
        # index is unique per combination, so the key is a strict total
        # order and ties are broken by generation order (earlier
        # combination wins) - matching a stable full sort by score alone.
        best_plans = []  # min-heap of (score, -index, conflicts, schedule)
        for index, combo in enumerate(itertools.product(*module_options)):
            flat_schedule = [slot for module_choice in combo for slot in module_choice]
            score, conflicts = score_full_schedule(flat_schedule)
            entry = (score, -index, conflicts, flat_schedule)
            if len(best_plans) < TOP_N:
                heapq.heappush(best_plans, entry)
            elif entry > best_plans[0]:
                heapq.heapreplace(best_plans, entry)

        # 4. Best first.
        best_plans.sort(reverse=True)

        top_results = [
            {"score": score, "conflicts": conflicts, "slots": schedule}
            for score, _, conflicts, schedule in best_plans
        ]

        return jsonify({"status": "success", "best_plans": top_results})

    # --- ACCOUNT SETTINGS ---

    @app.route("/api/delete-account", methods=["DELETE"])
    @login_required
    def delete_account():
        user = current_user
        db.session.delete(user)
        db.session.commit()
        logout_user()
        return jsonify({"message": "Account deleted"}), 200

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=app.config["DEBUG"], host="0.0.0.0", port=5000)
