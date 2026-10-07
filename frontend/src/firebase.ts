import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBYPe-yK4jSszqAB9Y7XQ-m8YYlpKBwD2s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pathprint.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pathprint",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pathprint.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "110298742300",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:110298742300:web:a70ff1d7415643cec929d9",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6WRBMNGM2B"
};

// Initialize Firebase safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
