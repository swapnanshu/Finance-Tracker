import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

function getServiceAccountFromEnv(): any | null {
  // Option B: FIREBASE_SERVICE_ACCOUNT_KEY is base64-encoded JSON of service-account.json
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!b64) return null;

  try {
    const json = Buffer.from(b64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to decode FIREBASE_SERVICE_ACCOUNT_KEY', err);
    return null;
  }
}

const serviceAccount = getServiceAccountFromEnv();

if (!getApps().length) {
  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });
  } else {
    // Fallback: This will require GOOGLE_APPLICATION_CREDENTIALS / default credentials
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
}

export const adminAuth = getAuth();

const databaseId = (firebaseConfig as any).firestoreDatabaseId as string | undefined;

// firebase-admin v* overload: getFirestore(databaseId: string)
export const adminDb = databaseId ? getFirestore(databaseId) : getFirestore();

