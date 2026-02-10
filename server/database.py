import firebase_admin
from firebase_admin import credentials, firestore
import os

def initialize_firebase():
    # Only initialize if no app exists to avoid "App already exists" error
    if not firebase_admin._apps:
        # 1. Define Project ID (Firestore needs this, not a databaseURL)
        # We try to get it from environment, or fallback to your hardcoded ID
        project_id = os.environ.get('GOOGLE_CLOUD_PROJECT', 'last-of-os-485319')
        
        try:
            # 2. Try to use Google's default credentials (best for Cloud Run & Local)
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {
                'projectId': project_id,
            })
        except Exception:
            # 3. Fallback: Initialize without explicit creds (relies on gcloud login)
            firebase_admin.initialize_app(options={
                'projectId': project_id,
            })

def get_db_client():
    """Returns the Firestore Client (not Realtime DB reference)."""
    initialize_firebase()
    return firestore.client()