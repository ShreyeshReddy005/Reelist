import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB5kw5J0-n-E6dBBdKT9oIOeQLc9mUI8tY",
  authDomain: typeof window !== 'undefined' ? window.location.host : "reelist-9d75b.firebaseapp.com",
  projectId: "reelist-9d75b",
  storageBucket: "reelist-9d75b.firebasestorage.app",
  messagingSenderId: "433529383643",
  appId: "1:433529383643:web:1f46f4da99769225e67afe",
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
