import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Public, like /api/answer and /api/join - a group only has its localStorage
// session, no Firebase Auth account, so this trusts the eventId/groupId pair
// the same way the rest of the student-facing API does.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const eventId = typeof body?.eventId === "string" ? body.eventId : "";
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";
  const broadcastId = typeof body?.broadcastId === "string" ? body.broadcastId : "";

  if (!eventId || !groupId || !broadcastId) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const groupRef = adminDb()
    .collection("events")
    .doc(eventId)
    .collection("groups")
    .doc(groupId);
  const snap = await groupRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  await groupRef.update({ ackedBroadcastId: broadcastId });
  return NextResponse.json({ ok: true });
}
