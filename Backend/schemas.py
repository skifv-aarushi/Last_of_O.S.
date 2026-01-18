from pydantic import BaseModel
from typing import List

class TaskInputs(BaseModel):
    val1: float
    val2: float
    val3: float

class AttackerInput(TaskInputs):
    infection_choice: str # NONE, MINOR, MAJOR

class AuthorityDecision(BaseModel):
    authority_id: int
    cert_id: int
    action: str # APPROVE or REJECT

class AuditorBan(BaseModel):
    target_authority_id: int