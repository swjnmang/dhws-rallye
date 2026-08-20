import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { Bucket } from "@google-cloud/storage";

function getAdminApp(): App {
  if (getApps().length) return getApp();

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

// Lazily initialized so importing this module never fails at build time -
// only calling adminDb()/adminBucket() at request time requires the env vars.
let dbInstance: Firestore | null = null;
let bucketInstance: Bucket | null = null;

export function adminDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getAdminApp());
  return dbInstance;
}

export function adminBucket(): Bucket {
  if (!bucketInstance) bucketInstance = getStorage(getAdminApp()).bucket();
  return bucketInstance;
}
