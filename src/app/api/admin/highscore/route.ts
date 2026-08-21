import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { Group } from "@/lib/types";

const TOP_N = 20;

export type HighscoreEntry = {
  groupId: string;
  name: string;
  className: string;
  finishedAt: number;
  xp: number;
  totalSeconds: number;
  xpPerMinute: number;
};

// Groups live in a per-event subcollection (events/{eventId}/groups), so a
// cross-rally leaderboard needs a collectionGroup read across all of them.
// Going through the Admin SDK here (instead of a client-side Firestore
// query) avoids adding a new public security rule just for this.
export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const snap = await adminDb().collectionGroup("groups").get();

  const entries: HighscoreEntry[] = snap.docs
    .map((d) => d.data() as Group)
    .filter((g) => g.finishedAt !== null && g.totalSeconds !== null && g.totalSeconds > 0)
    .map((g) => ({
      groupId: g.id,
      name: g.name,
      className: g.className,
      finishedAt: g.finishedAt as number,
      xp: g.xp ?? 0,
      totalSeconds: g.totalSeconds as number,
      xpPerMinute: ((g.xp ?? 0) * 60) / (g.totalSeconds as number),
    }))
    .sort((a, b) => b.xpPerMinute - a.xpPerMinute)
    .slice(0, TOP_N);

  return NextResponse.json({ entries });
}
