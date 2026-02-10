import firebase_admin
from firebase_admin import firestore
import datetime

def test_connection():
    print("🔄 Initializing Firebase...")
    
    # Check if app is already initialized to avoid errors
    if not firebase_admin._apps:
        # Uses your 'gcloud auth application-default login' credentials automatically
        firebase_admin.initialize_app()
    
    db = firestore.client()
    
    # Define a test location
    collection_name = "_connection_test"
    doc_name = "ping"

    print(f"🔄 Attempting to WRITE to collection: '{collection_name}'...")
    
    try:
        # 1. WRITE TEST
        test_data = {
            "status": "online",
            "timestamp": datetime.datetime.now(),
            "message": "Hello from local Python server!"
        }
        db.collection(collection_name).document(doc_name).set(test_data)
        print("✅ WRITE Successful!")

        # 2. READ TEST
        print("🔄 Attempting to READ back the data...")
        doc = db.collection(collection_name).document(doc_name).get()
        
        if doc.exists:
            print(f"✅ READ Successful! retrieved: {doc.to_dict()['message']}")
        else:
            print("❌ READ Failed: Document was not found.")
            
        # 3. CLEANUP (Delete the test doc)
        print("🔄 Cleaning up test data...")
        db.collection(collection_name).document(doc_name).delete()
        print("✅ DELETE Successful! Test complete.")
        
        print("\n🎉 CONCLUSION: Your server is fully connected to Firestore!")

    except Exception as e:
        print("\n❌ CONNECTION FAILED")
        print(f"Error details: {e}")
        print("\nTIP: If this is a 'Permission' error, check your IAM roles.")

if __name__ == "__main__":
    test_connection()