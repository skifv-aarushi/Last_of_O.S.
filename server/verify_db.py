from database import get_db_client
import time

def test_connection():
    print("🔄 Initiating Firestore Connectivity Check...")
    
    try:
        # 1. Get the Database Client
        db = get_db_client()
        print("✅ Client initialized")

        # 2. Try to WRITE a document
        test_collection = "system_checks"
        test_doc = "connection_test"
        
        print(f"🔄 Attempting to WRITE to '{test_collection}/{test_doc}'...")
        doc_ref = db.collection(test_collection).document(test_doc)
        doc_ref.set({
            'status': 'connected',
            'timestamp': time.time(),
            'message': 'Hello from Yantra 2026 Backend!'
        })
        print("✅ WRITE Successful")

        # 3. Try to READ it back
        print("🔄 Attempting to READ...")
        doc = doc_ref.get()
        if doc.exists:
            print(f"✅ READ Successful: {doc.to_dict()['message']}")
        else:
            print("❌ READ Failed: Document not found")
            return

        # 4. Clean up (DELETE)
        print("🔄 Cleaning up test data...")
        doc_ref.delete()
        print("✅ DELETE Successful")

        print("\n🎉 SUCCESS: Your backend is fully connected to Google Cloud Firestore!")

    except Exception as e:
        print("\n❌ CONNECTION FAILED")
        print(f"Error details: {str(e)}")
        print("Make sure your 'database.py' is correctly set up with your Project ID.")

if __name__ == "__main__":
    test_connection()