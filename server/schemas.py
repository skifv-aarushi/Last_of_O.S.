from pydantic import BaseModel
from typing import Optional

class TaskSubmission(BaseModel):
    task_score: float

class AttackerSubmission(TaskSubmission):
    infection_choice: str  # "NONE", "MINOR", "MAJOR"

class AuthorityDecision(BaseModel):
    authority_id: int
    cert_id: str  # CHANGED to str because Firebase IDs are strings
    action: str   # "APPROVE" or "REJECT"

class AuditorBan(BaseModel):
    target_authority_id: int