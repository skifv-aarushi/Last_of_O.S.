from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from database import get_db_client  # <--- UPDATED IMPORT
from schemas import AuthorityDecision
from Roles import authority, citizen, attacker

router = APIRouter(prefix="/authority", tags=["Authority"])

@router.get("/status/{auth_id}")
def check_status(auth_id: int):
    db = get_db_client()
    
    # Firestore: Check specific document in 'authorities' collection
    doc_ref = db.collection("authorities").document(str(auth_id))
    doc = doc_ref.get()
    
    is_banned = False
    if doc.exists:
        # safely get 'banned', default to False if field is missing
        is_banned = doc.to_dict().get("banned", False)
        
    return {"id": auth_id, "banned": is_banned}

@router.get("/pending")
def get_pending():
    db = get_db_client()
    
    # OPTIMIZATION: Use a Query instead of fetching all certificates
    # "Select * from certificates where status == 'PENDING'"
    query = db.collection("certificates").where(filter=firestore.FieldFilter("status", "==", "PENDING"))
    docs = query.stream()
    
    pending_list = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id  # Attach the ID manually
        pending_list.append(data)
        
    return pending_list

@router.post("/decide")
def make_decision(data: AuthorityDecision):
    db = get_db_client()
    
    # 1. Check Ban in Firestore
    auth_ref = db.collection("authorities").document(str(data.authority_id))
    auth_doc = auth_ref.get()
    
    if auth_doc.exists and auth_doc.to_dict().get("banned"):
        raise HTTPException(status_code=403, detail="You are BANNED.")

    # 2. Get Certificate Data
    cert_ref = db.collection("certificates").document(data.cert_id)
    cert_snap = cert_ref.get()
    
    if not cert_snap.exists: 
        raise HTTPException(404, "Certificate Not Found")
    
    cert_data = cert_snap.to_dict()

    # 3. Decision Logic (Python logic remains the same)
    is_approved = (data.action == "APPROVE")
    sender_role = cert_data.get("role", "CITIZEN")
    final_score = cert_data.get("final_score", 0)
    infection_level = cert_data.get("infection_type", "NONE")
    
    # Initialize variables to avoid 'UnboundLocalError'
    type_ = "NONE"
    val_ = 0.0

    if sender_role == "CITIZEN":
        type_, val_ = citizen.CitizenLogic.get_impact(final_score, is_approved)
    else:
        # ATTACKER logic
        type_, val_ = attacker.AttackerLogic.get_impact(
            final_score, 
            is_approved, 
            infection_level
        )

    # 4. Save updates to the specific certificate
    cert_ref.update({
        "status": data.action,
        "authority_id": data.authority_id,
        "impact_type": type_,
        "impact_value": val_
    })

    # 5. Update Global Health (Using 'globals/health_stats' document)
    health_ref = db.collection("globals").document("health_stats")
    health_snap = health_ref.get()
    
    current_health = 100.0
    if health_snap.exists:
        current_health = health_snap.to_dict().get("value", 100.0)
    
    if type_ == "HEAL":
        new_health = current_health + val_
    else: # DAMAGE or INFECTION
        new_health = current_health - val_

    new_health = max(0.0, min(100.0, new_health))
    
    # Merge=True creates the doc if it doesn't exist
    health_ref.set({"value": new_health}, merge=True)

    return {"status": "Processed", "impact": type_, "value": val_, "health": new_health}