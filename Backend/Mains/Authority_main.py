from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import crud
from models import Certificate
from schemas import AuthorityDecision
from Roles import authority, citizen, attacker

router = APIRouter(prefix="/authority", tags=["Authority"])

@router.get("/pending")
def get_pending(db: Session = Depends(get_db)):
    return crud.get_pending(db)

@router.post("/decide")
def make_decision(data: AuthorityDecision, db: Session = Depends(get_db)):
    # 1. Check Ban
    if authority.AuthorityLogic.check_ban(db, data.authority_id):
        raise HTTPException(status_code=403, detail="You are BANNED.")

    # 2. Get Cert
    cert = db.query(Certificate).filter(Certificate.id == data.cert_id).first()
    if not cert: raise HTTPException(404, "Not Found")

    # 3. Logic
    is_approved = (data.action == "APPROVE")
    if cert.sender_role == "CITIZEN":
        type_, val_ = citizen.CitizenLogic.get_impact(cert.final_score, is_approved)
    else:
        type_, val_ = attacker.AttackerLogic.get_impact(cert.final_score, is_approved)

    # 4. Save
    cert.status = data.action
    cert.authority_id = data.authority_id
    cert.impact_type = type_
    cert.impact_value = val_
    new_health = crud.update_health(db, type_, val_)

    return {"status": "Processed", "impact": type_, "health": new_health}