from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas import AuditorBan
from Roles.auditor import AuditorLogic

router = APIRouter(prefix="/auditor", tags=["Auditor"])

@router.post("/ban")
def ban_authority(data: AuditorBan, db: Session = Depends(get_db)):
    until = AuditorLogic.ban_authority(db, data.target_authority_id)
    return {"msg": f"Authority {data.target_authority_id} Banned until {until}"}