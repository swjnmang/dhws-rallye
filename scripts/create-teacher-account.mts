// One-time setup: creates a regular teacher account directly (Firebase Auth
// user + users/{uid} doc) as an already-active member of an org, skipping
// the normal register -> request-to-join -> owner-approves flow. Useful for
// seeding a known test/demo account. Safe to re-run for the same email - it
// just updates the existing account's password/org membership instead of
// failing.
//
// Usage: npm run migrate:create-teacher -- <email> <password> [displayName] [orgId]
// orgId defaults to "dhws".
import { config } from "dotenv";
config({ path: ".env.local" });

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { AppUser } from "../src/lib/types";

async function main() {
  const [email, password, displayName, orgIdArg] = process.argv.slice(2);
  if (!email || !password) {
    console.error(
      "Usage: npm run migrate:create-teacher -- <email> <password> [displayName] [orgId]"
    );
    process.exit(1);
  }
  const orgId = orgIdArg || "dhws";

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const orgDoc = await db.collection("organizations").doc(orgId).get();
  if (!orgDoc.exists) {
    throw new Error(`organizations/${orgId} does not exist - run migrate:create-org first, or pass a different orgId`);
  }

  let firebaseUser;
  try {
    firebaseUser = await auth.getUserByEmail(email);
    await auth.updateUser(firebaseUser.uid, { password, displayName: displayName || undefined });
    console.log(`Firebase Auth user ${email} already existed - updated password/displayName.`);
  } catch {
    firebaseUser = await auth.createUser({ email, password, displayName: displayName || undefined });
    console.log(`Created Firebase Auth user ${email} (${firebaseUser.uid}).`);
  }

  const userRef = db.collection("users").doc(firebaseUser.uid);
  const existing = await userRef.get();
  const user: AppUser = {
    uid: firebaseUser.uid,
    email,
    displayName: displayName || null,
    orgId,
    orgRole: "member",
    membershipStatus: "active",
    isSuperAdmin: false,
    createdAt: existing.exists ? (existing.data() as AppUser).createdAt : Date.now(),
    approvedAt: Date.now(),
    approvedByUid: firebaseUser.uid,
  };
  await userRef.set(user, { merge: true });
  console.log(`users/${firebaseUser.uid} is now an active member of organizations/${orgId}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
