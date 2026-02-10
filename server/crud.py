from firebase_admin import firestore
from database import get_db_client  # Ensure this matches your function name in database.py

def get_health():
    """Fetches the current global health from Firestore."""
    db = get_db_client()
    
    # Firestore requires a document structure. 
    # We will store this in a collection 'globals' -> document 'health_stats'
    doc_ref = db.collection("globals").document("health_stats")
    doc = doc_ref.get()
    
    # If the document doesn't exist, initialize it
    if not doc.exists:
        initial_data = {"value": 100.0}
        doc_ref.set(initial_data)
        return 100.0
    
    # Return the 'value' field, defaulting to 100.0 if missing
    return doc.to_dict().get("value", 100.0)

def update_health(impact_type: str, value: float):
    """Calculates and saves the new global health."""
    db = get_db_client()
    doc_ref = db.collection("globals").document("health_stats")
    
    # Get current health
    current_health = get_health()
    
    if impact_type == "HEAL":
        new_health = min(100.0, current_health + value)
    elif impact_type == "DMG":
        new_health = max(0.0, current_health - value)
    else:
        new_health = current_health
    
    # Update the document with the new value
    doc_ref.set({"value": new_health}, merge=True)
    return new_health

def create_cert(role: str, raw: float, final: float, infect: str):
    """Creates a new certificate in the 'certificates' collection."""
    db = get_db_client()
    
    cert_data = {
        "sender_role": role,
        "raw_score": raw,
        "final_score": final,
        "infection_level": infect,
        "status": "PENDING",
        # Firestore specific server-side timestamp
        "timestamp": firestore.SERVER_TIMESTAMP 
    }
    
    # .add() automatically generates a unique ID (similar to push)
    # It returns a tuple (update_time, document_reference)
    _, new_cert_ref = db.collection("certificates").add(cert_data)
    
    return new_cert_ref.id

def get_pending():
    """Retrieves all certificates that are currently PENDING."""
    db = get_db_client()
    
    # FIREBASE QUERY: This is much faster/cheaper than fetching all!
    # We ask Firestore to only send us documents where status == 'PENDING'
    query = db.collection("certificates").where(filter=firestore.FieldFilter("status", "==", "PENDING"))
    docs = query.stream()
    
    pending_list = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id  # Attach the ID manually
        pending_list.append(data)
            
    return pending_list