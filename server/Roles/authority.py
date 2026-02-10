from database import get_db_client  # <--- UPDATED IMPORT
from datetime import datetime, timezone

class AuthorityLogic:
    @staticmethod
    def check_ban(auth_id: int) -> bool:
        """
        Checks Firestore to see if an authority is banned.
        Collection: 'authorities', Document ID: str(auth_id)
        """
        db = get_db_client()
        
        # Firestore: access collection -> document
        # Note: We convert auth_id to string because Firestore IDs are strings
        doc_ref = db.collection("authorities").document(str(auth_id))
        doc_snap = doc_ref.get()

        # If the document doesn't exist, they are not banned (or not registered)
        if not doc_snap.exists:
            return False

        # Get the data dictionary safely
        auth_data = doc_snap.to_dict()

        # 1. Check simple boolean flag
        if auth_data.get("banned") is True:
            return True

        # 2. Check timed ban (if you use timestamps)
        banned_until = auth_data.get("banned_until")
        if banned_until:
            # Assuming banned_until is stored as a Unix timestamp
            # We compare it to the current UTC timestamp
            if banned_until > datetime.now(timezone.utc).timestamp():
                return True

        return False