from fastapi import APIRouter, HTTPException
from firebase_admin import firestore  # Import this for the timestamp
from database import get_db_client    # <--- UPDATED IMPORT
import schemas

router = APIRouter()

@router.post("/citizen/submit")
def citizen_submit(data: schemas.TaskSubmission):
    raw_score = data.task_score
    
    try:
        # Get Firestore Client
        db = get_db_client()
        
        # Prepare the data dictionary
        cert_data = {
            "role": "CITIZEN",
            "raw_score": raw_score,
            "final_score": raw_score,
            "infection_type": "NONE",
            "status": "PENDING",
            # Firestore specific server-side timestamp
            "timestamp": firestore.SERVER_TIMESTAMP 
        }

        # Add to 'certificates' collection
        # .add() returns a tuple: (update_time, document_reference)
        update_time, new_cert_ref = db.collection("certificates").add(cert_data)

        return {
            "status": "Submitted", 
            "cert_id": new_cert_ref.id,  # Use .id for Firestore documents
            "msg": "Task sent to Authority for review."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore Error: {str(e)}")