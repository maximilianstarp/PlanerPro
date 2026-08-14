import itertools
import logging
import os
from datetime import datetime

import bcrypt
import hashlib
import base64

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_login import (
    LoginManager,
    login_user,
    logout_user,
    login_required,
    current_user,
)
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from database import db, User, Project, SavedSchedule

logger = logging.getLogger(__name__)

# Combinations above this are rejected before we even try to build them.
# Every optional tutorial group multiplies the number of full-schedule
# combinations (see optimize() below), so a handful of modules with several
# tutorial groups each can blow up combinatorially. This cap keeps the
# request bounded instead of letting the server hang / OOM on bad input.
MAX_COMBINATIONS = 200_000


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
    days = {"Mo": 0, "Di": 1, "Mi": 2, "Do": 3, "Fr": 4, "Sa": 5, "So": 6}
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

    conflict_minutes = 0
    for i in range(len(schedule)):
        for j in range(i + 1, len(schedule)):
            conflict_minutes += get_overlap_minutes(schedule[i], schedule[j])

    score = 100000
    score -= conflict_minutes * 5000  # conflicts should dominate the ranking

    days_data = {}
    for slot in schedule:
        d = slot["day"]
        start = to_minutes(d, slot["start"])
        end = to_minutes(d, slot["end"])
        duration = end - start

        if d not in days_data:
            days_data[d] = {"min": start, "max": end, "active_time": duration}
        else:
            days_data[d]["min"] = min(days_data[d]["min"], start)
            days_data[d]["max"] = max(days_data[d]["max"], end)
            days_data[d]["active_time"] += duration

    total_gaps = 0
    for day, data in days_data.items():
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

    app.config.update(
        SECRET_KEY=secret_key,
        # A relative sqlite:/// URI is resolved by Flask-SQLAlchemy against
        # app.instance_path (i.e. <root>/instance), which is exactly the
        # directory docker-compose.yml mounts as a volume - so the default
        # here already persists across container restarts without needing
        # an "instance/" prefix (that would double up to instance/instance/).
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///project.db"),
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

    db.init_app(app)
    Migrate(app, db)

    # In-memory storage means limits are per-process. That's fine as long as
    # the app runs as a single gunicorn worker (see Dockerfile); switch to a
    # Redis storage_uri before scaling out to multiple workers/instances.
    app.config.setdefault("RATELIMIT_STORAGE_URI", "memory://")
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

    # --- AUTH ROUTES ---

    @app.route("/api/register", methods=["POST"])
    @limiter.limit("10 per minute")
    def register():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        error = require_fields(data, ["username", "password"])
        if error:
            return jsonify({"error": error}), 400

        username = data["username"].strip()
        password = data["password"]

        # Check username availability before password strength: otherwise a
        # too-short password on an already-taken username reports "password
        # too short" and hides the real, more fundamental problem. The user
        # "fixes" the password, retries, and only then learns the username
        # was taken all along.
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username is already taken"}), 400

        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        hashed_pw = generate_password_hash_custom(password)
        new_user = User(username=username, password_hash=hashed_pw)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Registration successful"}), 201

    @app.route("/api/login", methods=["POST"])
    @limiter.limit("10 per minute")
    def login():
        data = get_json_body()
        if data is None:
            return jsonify({"error": "Request body must be JSON"}), 400

        error = require_fields(data, ["username", "password"])
        if error:
            return jsonify({"error": error}), 400

        user = User.query.filter_by(username=data["username"].strip()).first()

        if user and check_password_hash_custom(user.password_hash, data["password"]):
            login_user(user, remember=True)
            return jsonify(
                {"message": "Login successful", "user": {"username": user.username}}
            ), 200

        return jsonify({"error": "Invalid credentials"}), 401

    @app.route("/api/logout", methods=["POST"])
    @login_required
    def logout():
        logout_user()
        return jsonify({"message": "Logged out"}), 200

    @app.route("/api/me", methods=["GET"])
    def me():
        if current_user.is_authenticated:
            return jsonify({"username": current_user.username}), 200
        return jsonify({"error": "Not logged in"}), 401

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

        # 3. Compute every combination and score it.
        all_combinations = list(itertools.product(*module_options))

        scored_plans = []
        for combo in all_combinations:
            flat_schedule = [slot for module_choice in combo for slot in module_choice]
            score, conflicts = score_full_schedule(flat_schedule)
            scored_plans.append(
                {"score": score, "conflicts": conflicts, "schedule": flat_schedule}
            )

        # 4. Best first, return the top options.
        scored_plans.sort(key=lambda x: x["score"], reverse=True)

        top_results = [
            {"score": p["score"], "conflicts": p["conflicts"], "slots": p["schedule"]}
            for p in scored_plans[:15]
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
