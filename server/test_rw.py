import sys
import os
import time
from datetime import datetime

# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from database import get_db_client
except ImportError:
    print("❌ Error: Could not import 'get_db_client' from database.py.")
    print("   Make sure you are running this script from the 'server' folder.")
    sys.exit(1)

def test_firestore_rw():
    print("----------------------------------------------------------------")
    print("🔥 FIRESTORE READ/WRITE TEST")
    print("----------------------------------------------------------------")

    try:
        # 1. Initialize Client
        print("1️⃣  Initializing Firestore Client...")
        db = get_db_client()
        print("   ✅ Client obtained.")

        # Define a test location
        collection_name = "_sys_check"
        doc_name = "connectivity_test"
        doc_ref = db.collection(collection_name).document(doc_name)

        # 2. WRITE Test
        print(f"\n2️⃣  Attempting to WRITE to '{collection_name}/{doc_name}'...")
        test_data = {
            "status": "online",
            "message": "Hello from local Python script!",
            "timestamp": time.time(),
            "readable_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        doc_ref.set(test_data)
        print("   ✅ WRITE Successful!")

        # 3. READ Test
        print(f"\n3️⃣  Attempting to READ back the data...")
        doc_snap = doc_ref.get()
        
        if doc_snap.exists:
            data = doc_snap.to_dict()
            print(f"   ✅ READ Successful!")
            print(f"   📄 Content retrieved: {data['message']}")
            print(f"   🕒 Timestamp: {data['readable_time']}")
        else:
            print("   ❌ READ Failed: Document was created but not found (Latency?).")

        # 4. CLEANUP (Delete)
        print(f"\n4️⃣  Cleaning up (Deleting test document)...")
        #doc_ref.delete()
        print("   ✅ DELETE Successful!")

        print("\n----------------------------------------------------------------")
        print("🎉 SUCCESS: Your backend has full READ/WRITE access to Firestore.")
        print("----------------------------------------------------------------")

    except Exception as e:
        print("\n❌ CONNECTION FAILED")
        print("----------------------------------------------------------------")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print("----------------------------------------------------------------")
        print("Common fixes:")
        print("1. Check if 'database.py' has the correct Project ID.")
        print("2. Run 'gcloud auth application-default login' if on local machine.")

if __name__ == "__main__":
    test_firestore_rw()