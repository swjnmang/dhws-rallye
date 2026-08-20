import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import type { Group, RallyEvent } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const groupName = typeof body?.groupName === "string" ? body.groupName.trim() : "";

  if (!code || !groupName) {
    return NextResponse.json({ error: "Code und Gruppenname sind erforderlich" }, { status: 400 });
  }

  const eventsRef = adminDb().collection("events");
  const querySnap = await eventsRef.where("joinCode", "==", code).limit(1).get();
  if (querySnap.empty) {
    return NextResponse.json({ error: "Unbekannter Code" }, { status: 404 });
  }

  const eventDoc = querySnap.docs[0];
  const event = eventDoc.data() as RallyEvent;

  if (event.status === "draft") {
    return NextResponse.json({ error: "Die Rallye hat noch nicht begonnen" }, { status: 409 });
  }
  if (event.status === "finished") {
    return NextResponse.json({ error: "Die Rallye ist bereits beendet" }, { status: 409 });
  }

  const groupId = generateId();
  const now = Date.now();
  const group: Group = {
    id: groupId,
    name: groupName,
    joinedAt: now,
    startedAt: now,
    finishedAt: null,
    solved: {},
    progress: {},
    totalSeconds: null,
  };

  await eventDoc.ref.collection("groups").doc(groupId).set(group);

  return NextResponse.json({ eventId: event.id, groupId, eventName: event.name });
}
