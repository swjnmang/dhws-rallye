// One-time setup: stamps orgId: "dhws" onto every events/templates/groups
// doc created before org-scoping existed. Safe to re-run - skips docs that
// already have orgId set.
//
// Usage: npm run migrate:backfill-org-scoping
import { config } from "dotenv";
config({ path: ".env.local" });

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";

const DHWS_ORG_ID = "dhws";
const BATCH_SIZE = 400; // stay under Firestore's 500-writes-per-batch limit

async function commitInChunks(
  db: FirebaseFirestore.Firestore,
  docs: QueryDocumentSnapshot[],
  orgId: string
): Promise<number> {
  const toUpdate = docs.filter((d) => !d.data().orgId);
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const doc of toUpdate.slice(i, i + BATCH_SIZE)) {
      batch.update(doc.ref, { orgId });
    }
    await batch.commit();
  }
  return toUpdate.length;
}

async function main() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  const db = getFirestore(app);

  const [eventsSnap, templatesSnap, groupsSnap] = await Promise.all([
    db.collection("events").get(),
    db.collection("templates").get(),
    db.collectionGroup("groups").get(),
  ]);

  const eventsUpdated = await commitInChunks(db, eventsSnap.docs, DHWS_ORG_ID);
  const templatesUpdated = await commitInChunks(db, templatesSnap.docs, DHWS_ORG_ID);
  const groupsUpdated = await commitInChunks(db, groupsSnap.docs, DHWS_ORG_ID);

  console.log(`events: ${eventsUpdated}/${eventsSnap.size} backfilled`);
  console.log(`templates: ${templatesUpdated}/${templatesSnap.size} backfilled`);
  console.log(`groups: ${groupsUpdated}/${groupsSnap.size} backfilled`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
