// Import the Firebase Admin SDK
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";
 
// Load the service account key (the JSON file you downloaded)
const serviceAccountPath = path.resolve(
  process.cwd(),
  "serviceAccountKey.json"
);
 
// Read the JSON file and parse it
const serviceAccount = JSON.parse(
  readFileSync(serviceAccountPath, "utf-8")
);
 
// Initialize Firebase Admin with your credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://last-of-os-485319-default-rtdb.firebaseio.com",
});
 
// Export the Firestore database
export const db = admin.firestore();
 
// Export the auth service
export const authAdmin = admin.auth();
 
// Export the admin object for other uses
export default admin;
