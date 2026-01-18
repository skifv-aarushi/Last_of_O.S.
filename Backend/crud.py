from sqlalchemy.orm import Session
from models import GameState, Certificate, AuthorityBan
import models
from datetime import datetime

def get_health(db: Session):
    state = db.query(GameState).first()
    if not state:
        state = GameState(global_health=100.0)
        db.add(state)
        db.commit()
    return state.global_health

def update_health(db: Session, impact_type: str, value: float):
    state = db.query(GameState).first()
    if not state: state = GameState(global_health=100.0); db.add(state)
    
    if impact_type == "HEAL":
        state.global_health = min(100.0, state.global_health + value)
    elif impact_type == "DMG":
        state.global_health = max(0.0, state.global_health - value)
    
    db.commit()
    return state.global_health

def create_cert(db: Session, role: str, raw: float, final: float, infect: str):
    cert = Certificate(sender_role=role, raw_score=raw, final_score=final, infection_level=infect)
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert

def get_pending(db: Session):
    return db.query(Certificate).filter(Certificate.status == "PENDING").all()