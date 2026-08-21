import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { RallyEvent } from "@/lib/types";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// A rally is meant to run for a few hours on one school day. If a teacher
// forgets to click "Rallye beenden", this quietly moves it to "finished" on
// its own so it doesn't linger in the active list forever. Triggered
// opportunistically (e.g. whenever the events list loads) rather than via a
// cron job - simpler, and "some time after 24h" is plenty precise here.
export async function POST() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const db = adminDb();
  const snap = await db.collection("events").where("status", "==", "active").get();
  const now = Date.now();

  const batch = db.batch();
  let closedCount = 0;
  snap.docs.forEach((d) => {
    const event = d.data() as RallyEvent;
    if (event.startedAt && now - event.startedAt > TWENTY_FOUR_HOURS_MS) {
      batch.update(d.ref, { status: "finished", finishedAt: now });
      closedCount += 1;
    }
  });
  if (closedCount > 0) await batch.commit();

  return NextResponse.json({ closedCount });
}
