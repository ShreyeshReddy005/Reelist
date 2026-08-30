import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountStr) {
      console.error('FIREBASE_SERVICE_ACCOUNT_KEY is missing.');
    } else {
      const serviceAccount = JSON.parse(serviceAccountStr);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('Firebase Admin Initialized Successfully.');
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminAuth = getApps().length > 0 ? getAuth() : null;
export const adminDb = getApps().length > 0 ? getFirestore() : null;
