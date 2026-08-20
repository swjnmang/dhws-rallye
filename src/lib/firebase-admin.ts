import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length) return getApp();

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  return initializeApp({ credential: cert(serviceAccount) });
}

// Lazily initialized so importing this module never fails at build time -
// only calling adminDb() at request time requires the env var.
let dbInstance: Firestore | null = null;

export function adminDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getAdminApp());
  return dbInstance;
}
