from fastapi import APIRouter, HTTPException
from firebase_admin import firestore  # Import for Server Timestamp
from database import get_db_client    # <--- UPDATED IMPORT
from Roles.attacker import AttackerLogic
import schemas 

router = APIRouter()

@router.post("/attacker/submit")
def attacker_submit(data: schemas.AttackerSubmission):
    raw_score = data.task_score
    infection_type = data.infection_choice
    
    # 1. Apply Logic (Business logic remains the same)
    final_score = AttackerLogic.apply_infection(raw_score, infection_type)

    # 2. Save to Firestore instead of Realtime DB
    try:
        # Get Firestore Client
        db = get_db_client()
        
        # Prepare Data
        cert_data = {
            "role": "ATTACKER",
            "raw_score": raw_score,
            "final_score": final_score,
            "infection_type": infection_type,
            "status": "PENDING", # For Authority to approve later
            # Firestore specific timestamp
            "timestamp": firestore.SERVER_TIMESTAMP 
        }
        
        # Add to 'certificates' collection
        # .add() returns a tuple: (update_time, document_reference)
        _, new_cert_ref = db.collection("certificates").add(cert_data)
        
        return {
            "status": "Injected",
            "cert_id": new_cert_ref.id,  # Use .id instead of .key
            "projected_score": final_score,
            "stealth_check": "PASSED" if final_score < 95 else "RISKY"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore Error: {str(e)}")