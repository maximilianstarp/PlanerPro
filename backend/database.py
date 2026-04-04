from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    
    # Relationships: Wenn User gelöscht wird, werden auch seine Projekte gelöscht
    projects = db.relationship('Project', backref='owner', cascade="all, delete-orphan", lazy=True)

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Hier speichern wir die JSON-Liste der Module, die der User eingegeben hat
    input_modules = db.Column(db.JSON, nullable=True) 
    
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Wenn Projekt gelöscht wird, verschwinden auch die optimierten Ergebnisse
    results = db.relationship('SavedSchedule', backref='project', cascade="all, delete-orphan", lazy=True)

class SavedSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Das optimierte Ergebnis deines Algorithmus als JSON
    optimized_data = db.Column(db.JSON, nullable=False)
    score = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)