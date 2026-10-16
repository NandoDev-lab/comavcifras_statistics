import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseApp() {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccount) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      projectId,
    });
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
    throw new Error(
      "Configure FIREBASE_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS ou ADC no ambiente.",
    );
  }

  return initializeApp({ credential: applicationDefault(), projectId });
}

export function getAdminFirestore() {
  return getFirestore(getFirebaseApp());
}

export function getAdminAuth() {
  return getAuth(getFirebaseApp());
}
