from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from database import get_db_client  # <--- UPDATED IMPORT
from schemas import AuthorityDecision
from Roles import authority, citizen, attacker

router = APIRouter(prefix="/auditor", tags=["Auditor"])

@router.get("/pending")
def get_pending():
    db = get_db_client()
    
    # Firestore Query: Fetch only certificates where status is 'PENDING'
    # This is much more efficient than downloading the whole database
    query = db.collection("certificates").where(filter=firestore.FieldFilter("status", "==", "PENDING"))
    docs = query.stream()
    
    pending = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id  # Attach the ID manually
        pending.append(data)
        
    return pending

@router.post("/decide")
def make_decision(data: AuthorityDecision):
    db = get_db_client()
    
    # 1. Check Ban (Firestore implementation)
    # We assume 'authorities' collection uses the ID as the document key
    auth_ref = db.collection("authorities").document(str(data.authority_id))
    auth_doc = auth_ref.get()
    
    if auth_doc.exists and auth_doc.to_dict().get("banned"):
        raise HTTPException(status_code=403, detail="You are BANNED.")

    # 2. Get Certificate
    cert_ref = db.collection("certificates").document(data.cert_id)
    cert_snap = cert_ref.get()
    
    if not cert_snap.exists: 
        raise HTTPException(404, "Certificate Not Found")
    
    # Extract data securely
    cert_data = cert_snap.to_dict()

    # 3. Logic Execution
    is_approved = (data.action == "APPROVE")
    sender_role = cert_data.get("role", "CITIZEN") # Changed 'sender_role' to 'role' to match Citizen_main
    final_score = cert_data.get("final_score", 0)
    
    # Note: Ensure AttackerLogic arguments match your Roles definition.
    # If AttackerLogic needs 'infection_type', fetch it from cert_data.get("infection_type")
    if sender_role == "CITIZEN":
        type_, val_ = citizen.CitizenLogic.get_impact(final_score, is_approved)
    else:
        type_, val_ = attacker.AttackerLogic.get_impact(final_score, is_approved)

    # 4. Save Updates to Firestore
    cert_ref.update({
        "status": data.action,
        "authority_id": data.authority_id,
        "impact_type": type_,
        "impact_value": val_
    })

    # 5. Update Global Health in Firestore
    # We use the specific document 'globals/health_stats'
    health_ref = db.collection("globals").document("health_stats")
    health_snap = health_ref.get()
    
    current_health = 100.0
    if health_snap.exists:
        current_health = health_snap.to_dict().get("value", 100.0)
        
    if type_ == "HEAL":
        new_health = current_health + val_
    else:
        new_health = current_health - val_
    
    # Clamp health between 0 and 100
    new_health = max(0.0, min(100.0, new_health))
    
    # Save back to Firestore (merge=True is safer)
    health_ref.set({"value": new_health}, merge=True)

    return {"status": "Processed", "impact": type_, "health": new_health}