from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import crud
from schemas import AttackerInput
from Tasks.task import TaskLogic
from Roles.attacker import AttackerLogic

router = APIRouter(prefix="/attacker", tags=["Attacker"])

@router.post("/submit")
def submit_attack(data: AttackerInput, db: Session = Depends(get_db)):
    raw = TaskLogic.calculate_average(data.val1, data.val2, data.val3)
    final = AttackerLogic.apply_infection(raw, data.infection_choice)
    cert = crud.create_cert(db, "ATTACKER", raw, final, data.infection_choice)
    return {"msg": "Attack Sent", "raw": raw, "final": final, "id": cert.id}