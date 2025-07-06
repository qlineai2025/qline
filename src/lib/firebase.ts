import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Initialize Firebase only if the API key is provided to prevent crashes.
if (firebaseConfig.apiKey) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    // Request access to read Google Docs and list Google Drive files.
    googleProvider.addScope("https://www.googleapis.com/auth/documents.readonly");
    googleProvider.addScope("https://www.googleapis.com/auth/drive.readonly");
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // If initialization fails, ensure auth-related objects are null.
    app = null;
    auth = null;
    googleProvider = null;
  }
}

export { app, auth, googleProvider };
