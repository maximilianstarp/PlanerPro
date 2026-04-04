import os
import itertools
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
import bcrypt
import hashlib
import base64
from database import db, User, Project, SavedSchedule

app = Flask(__name__)

CORS(app, 
     supports_credentials=True,  # Erlaubt Cookies
     origins=["http://localhost:3000"], # KEIN Wildcard (*) erlauben!
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Konfiguration
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'default_geheimnis')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///project.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Session-Sicherheit für Browser (CORS/Cookies)
app.config.update(
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=False, # WICHTIG: Auf False lassen für localhost (HTTP)
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_PERMANENT=True,
    USE_X_SENDFILE=False
)

# CORS Setup: Wichtig für die Kommunikation mit Next.js (Port 3000)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

db.init_app(app)
login_manager = LoginManager(app)
# login_manager.login_view = 'login' # Wo soll er hin, wenn nicht eingeloggt?

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Bitte einloggen"}), 401

# Datenbank-Initialisierung
with app.app_context():
    if not os.path.exists('instance'):
        os.makedirs('instance')
    db.create_all()
    print("Datenbank steht bereit.")

    # --- DER OPTIMIERUNGS-ALGORITHMUS (VON DIR) ---

def to_minutes(day, time_str):
    days = {"Mo": 0, "Di": 1, "Mi": 2, "Do": 3, "Fr": 4, "Sa": 5, "So": 6}
    try:
        t = datetime.strptime(time_str, "%H:%M")
        return days[day] * 24 * 60 + t.hour * 60 + t.minute
    except:
        return 0

def get_overlap_minutes(slot1, slot2):
    s1_start = to_minutes(slot1['day'], slot1['start'])
    s1_end = to_minutes(slot1['day'], slot1['end'])
    s2_start = to_minutes(slot2['day'], slot2['start'])
    s2_end = to_minutes(slot2['day'], slot2['end'])
    overlap = min(s1_end, s2_end) - max(s1_start, s2_start)
    return max(0, overlap)

def score_full_schedule(schedule):
    if not schedule:
        return -100000, 0

    conflict_minutes = 0
    for i in range(len(schedule)):
        for j in range(i + 1, len(schedule)):
            conflict_minutes += get_overlap_minutes(schedule[i], schedule[j])
    
    score = 100000
    score -= (conflict_minutes * 5000) # Erhöhte Strafe für Konflikte

    days_data = {}
    for slot in schedule:
        d = slot['day']
        start = to_minutes(d, slot['start'])
        end = to_minutes(d, slot['end'])
        duration = end - start
        
        if d not in days_data:
            days_data[d] = {'min': start, 'max': end, 'active_time': duration}
        else:
            days_data[d]['min'] = min(days_data[d]['min'], start)
            days_data[d]['max'] = max(days_data[d]['max'], end)
            days_data[d]['active_time'] += duration

    total_gaps = 0
    for day, data in days_data.items():
        span = data['max'] - data['min']
        gaps = span - data['active_time']
        total_gaps += gaps
        if span > 360: score += 300 
        elif span < 180 and span > 0: score += 150

    score -= (total_gaps * 10) 
    return int(score), conflict_minutes

def generate_password_hash_custom(password: str):
    # 1. Passwort in UTF-8 kodieren
    password_bytes = password.encode('utf-8')
    
    # 2. Vor-Hashing mit SHA-256 (um das 72-Byte-Limit von bcrypt zu umgehen)
    # Das Video nutzt base64-Encoding des Digests
    sha256_hash = hashlib.sha256(password_bytes).digest()
    password_to_bcrypt = base64.b64encode(sha256_hash)
    
    # 3. Mit bcrypt hashen (inklusive Salt-Generierung)
    # Im Video werden 12 Runden (Cost Factor) empfohlen
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_to_bcrypt, salt)
    
    # Als String zurückgeben (für die Datenbank)
    return hashed.decode('utf-8')

def check_password_hash_custom(pw_hash: str, password: str):
    # 1. Eingabewerte vorbereiten
    password_bytes = password.encode('utf-8')
    hash_bytes = pw_hash.encode('utf-8')
    
    # 2. Den gleichen SHA-256 Schritt wie beim Generieren durchführen
    sha256_hash = hashlib.sha256(password_bytes).digest()
    password_to_verify = base64.b64encode(sha256_hash)
    
    # 3. Bcrypt Check
    return bcrypt.checkpw(password_to_verify, hash_bytes)

# --- AUTH ROUTES ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"error": "Nutzername bereits vergeben"}), 400
    
    hashed_pw = generate_password_hash_custom(data['password'])
    new_user = User(username=data['username'], password_hash=hashed_pw)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "Registrierung erfolgreich"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    
    if user and check_password_hash_custom(user.password_hash, data['password']):
        login_user(user, remember=True)
        return jsonify({"message": "Login erfolgreich", "user": {"username": user.username}}), 200
    
    return jsonify({"error": "Ungültige Anmeldedaten"}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Abgemeldet"}), 200

@app.route('/api/me', methods=['GET'])
def me():
    if current_user.is_authenticated:
        return jsonify({"username": current_user.username}), 200
    return jsonify({"error": "Nicht eingeloggt"}), 401

# --- PROJECT ROUTES ---

@app.route('/api/projects', methods=['GET'])
@login_required
def get_projects():
    user_projects = Project.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        "id": p.id,
        "name": p.name,
        "created_at": p.created_at.isoformat()
    } for p in user_projects])

@app.route('/api/projects', methods=['POST'])
@login_required
def create_project():
    data = request.json
    new_project = Project(name=data['name'], user_id=current_user.id)
    db.session.add(new_project)
    db.session.commit()
    return jsonify({"id": new_project.id, "name": new_project.name}), 201

@app.route('/api/projects/<int:project_id>', methods=['GET'])
@login_required
def get_project_detail(project_id):
    project = Project.query.get_or_404(project_id)
    if project.user_id != current_user.id:
        return jsonify({"error": "Nicht dein Projekt"}), 403
    
    return jsonify({
        "id": project.id,
        "name": project.name,
        "input_modules": project.input_modules or []
    })

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    if project.user_id != current_user.id:
        return jsonify({"error": "Nicht dein Projekt"}), 403
    
    db.session.delete(project)
    db.session.commit()
    return jsonify({"message": "Gelöscht"}), 200

# --- PROJEKT AKTUALISIEREN (SPEICHERN) ---
@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@login_required
def update_project(project_id):
    project = Project.query.get_or_404(project_id)
    if project.user_id != current_user.id:
        return jsonify({"error": "Nicht dein Projekt"}), 403
    
    data = request.json
    # Wir speichern das ganze Modul-Array als JSON-String/Blob
    project.input_modules = data.get('input_modules', [])
    
    db.session.commit()
    return jsonify({"message": "Projekt gespeichert"}), 200

# --- OPTIMIERUNGS-LOGIK (PLATZHALTER) ---
@app.route('/api/optimize', methods=['POST'])
@login_required
def optimize():
    data = request.json
    modules = data.get('modules', [])
    
    if not modules:
        return jsonify({"status": "error", "message": "Keine Module vorhanden"}), 400

    # 1. Optionen pro Modul generieren
    module_options = []
    for mod in modules:
        mod_name = mod.get('name') or "Unbenannt"
        mod_color = mod.get('color')
        
        mandatory = []
        for s in (mod.get('lectures', []) + mod.get('labs', [])):
            s_copy = s.copy()
            s_copy['name'] = mod_name
            s_copy['color'] = mod_color
            mandatory.append(s_copy)
        
        tuts = mod.get('tutorials', [])
        options_for_this_module = []
        
        if not tuts or len(tuts) == 0:
            options_for_this_module.append(mandatory)
        else:
            for group in tuts:
                group_slots = []
                for s in group:
                    s_copy = s.copy()
                    s_copy['name'] = f"{mod_name} (Tut)"
                    s_copy['color'] = mod_color
                    group_slots.append(s_copy)
                options_for_this_module.append(mandatory + group_slots)
        
        module_options.append(options_for_this_module)

    # 2. Alle Kombinationen berechnen
    all_combinations = list(itertools.product(*module_options))
    
    scored_plans = []
    for combo in all_combinations:
        flat_schedule = [slot for module_choice in combo for slot in module_choice]
        score, conflicts = score_full_schedule(flat_schedule)
        
        # Wir speichern Score und Konflikte direkt im Plan-Objekt für das Frontend
        scored_plans.append({
            "score": score,
            "conflicts": conflicts,
            "schedule": flat_schedule
        })

    # 3. Sortieren (Beste zuerst)
    scored_plans.sort(key=lambda x: x['score'], reverse=True)

    # Wir geben jetzt ein Objekt zurück, das den Score enthält
    # Das Frontend kann dann p.score anzeigen
    top_results = []
    for p in scored_plans[:15]: # Top 15 statt Top 10
        # Wir fügen den Score jedem Slot hinzu oder senden ihn als Meta-Info
        # Damit dein ResultsView.tsx ihn leicht findet:
        plan_data = p['schedule']
        # Wir "verstecken" den Score im ersten Element oder senden ein sauberes Objekt
        top_results.append({
            "score": p['score'],
            "conflicts": p['conflicts'],
            "slots": p['schedule']
        })

    return jsonify({
        "status": "success",
        "best_plans": top_results
    })

# --- ACCOUNT SETTINGS ---

@app.route('/api/delete-account', methods=['DELETE'])
@login_required
def delete_account():
    user = current_user
    db.session.delete(user)
    db.session.commit()
    logout_user()
    return jsonify({"message": "Account gelöscht"}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)