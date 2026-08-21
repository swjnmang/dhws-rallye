// One-time setup: after you've registered your own account through
// /admin/register (which lands orgless, on /admin/choose-org), run this
// once to make that account the active owner of the default "dhws" org and
// an app-wide super-admin.
//
// Usage: npm run migrate:bootstrap-superadmin -- you@example.com
import { config } from "dotenv";
config({ path: ".env.local" });

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run migrate:bootstrap-superadmin -- <email>");
    process.exit(1);
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const firebaseUser = await auth.getUserByEmail(email);
  const userRef = db.collection("users").doc(firebaseUser.uid);
  const existing = await userRef.get();
  if (!existing.exists) {
    console.error(
      `No users/${firebaseUser.uid} doc found for ${email} - register through /admin/register first.`
    );
    process.exit(1);
  }

  await userRef.update({
    isSuperAdmin: true,
    orgId: "dhws",
    orgRole: "owner",
    membershipStatus: "active",
    approvedAt: Date.now(),
    approvedByUid: firebaseUser.uid,
  });
  console.log(`users/${firebaseUser.uid} (${email}) is now an active super-admin org owner.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
