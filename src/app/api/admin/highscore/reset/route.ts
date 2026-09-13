import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { Group } from "@/lib/types";

// Hides every currently-visible entry from the org's cross-rally highscore
// board in one go (e.g. to clear out test/joke entries) - owner-only, same
// as removing a single entry (see the groups/[groupId] PATCH route). Marks
// hiddenFromHighscore rather than deleting anything, so each event's own
// Rangliste is untouched.
export async function POST() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }
  if (admin.orgRole !== "owner") {
    return NextResponse.json({ error: "Nur der Organisations-Owner darf das" }, { status: 403 });
  }

  const db = adminDb();
  const snap = await db.collectionGroup("groups").get();
  const toHide = snap.docs.filter((d) => {
    const g = d.data() as Group;
    return (
      g.orgId === admin.orgId &&
      !g.hiddenFromHighscore &&
      g.finishedAt !== null &&
      g.totalSeconds !== null &&
      g.totalSeconds > 0
    );
  });

  const batch = db.batch();
  toHide.forEach((d) => batch.update(d.ref, { hiddenFromHighscore: true }));
  if (toHide.length > 0) await batch.commit();

  return NextResponse.json({ hidden: toHide.length });
}
