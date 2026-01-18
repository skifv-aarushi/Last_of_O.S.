from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from database import Base
from datetime import datetime

class GameState(Base):
    __tablename__ = "game_state"
    id = Column(Integer, primary_key=True, index=True)
    global_health = Column(Float, default=100.0)

class Certificate(Base):
    __tablename__ = "certificates"
    id = Column(Integer, primary_key=True, index=True)
    sender_role = Column(String)  # CITIZEN / ATTACKER
    raw_score = Column(Float)
    final_score = Column(Float)
    infection_level = Column(String) 
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED
    authority_id = Column(Integer, nullable=True)
    impact_type = Column(String, default="NONE")
    impact_value = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)

class AuthorityBan(Base):
    __tablename__ = "authority_bans"
    authority_id = Column(Integer, primary_key=True)
    banned_until = Column(DateTime)