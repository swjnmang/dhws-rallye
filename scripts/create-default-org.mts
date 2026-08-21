// One-time setup: creates the organizations/dhws doc that all pre-existing
// data (and every Phase-1 self-registration) is scoped to. Safe to re-run -
// skips if the doc already exists.
//
// Usage: npm run migrate:create-org
import { config } from "dotenv";
config({ path: ".env.local" });

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  const db = getFirestore(app);

  const orgRef = db.collection("organizations").doc("dhws");
  const existing = await orgRef.get();
  if (existing.exists) {
    console.log("organizations/dhws already exists, nothing to do.");
    return;
  }

  await orgRef.set({
    id: "dhws",
    name: "DHWS",
    createdAt: Date.now(),
    createdByUid: "",
  });
  console.log("Created organizations/dhws.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
