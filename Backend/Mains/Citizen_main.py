from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import crud
from schemas import TaskInputs
from Tasks.task import TaskLogic

router = APIRouter(prefix="/citizen", tags=["Citizen"])

@router.post("/submit")
def submit_task(data: TaskInputs, db: Session = Depends(get_db)):
    score = TaskLogic.calculate_average(data.val1, data.val2, data.val3)
    cert = crud.create_cert(db, "CITIZEN", score, score, "NONE")
    return {"msg": "Citizen Task Sent", "score": score, "id": cert.id}