import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import type { Group, RallyEvent } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const groupName = typeof body?.groupName === "string" ? body.groupName.trim() : "";
  const className = typeof body?.className === "string" ? body.className.trim() : "";

  if (!code || !groupName || !className) {
    return NextResponse.json(
      { error: "Code, Gruppenname und Klasse sind erforderlich" },
      { status: 400 }
    );
  }

  const eventsRef = adminDb().collection("events");
  const querySnap = await eventsRef.where("joinCode", "==", code).limit(1).get();
  if (querySnap.empty) {
    return NextResponse.json({ error: "Unbekannter Code" }, { status: 404 });
  }

  const eventDoc = querySnap.docs[0];
  const event = eventDoc.data() as RallyEvent;

  if (event.status === "finished") {
    return NextResponse.json({ error: "Die Rallye ist bereits beendet" }, { status: 409 });
  }

  // Two groups with the same name+class in one rally would be
  // indistinguishable everywhere they're listed (lobby, live ranking, the
  // teacher's "Entfernen" button) - checked case-insensitively so "Adler"
  // and "adler" don't slip past each other either. Different classes with
  // the same group name are still fine, since those aren't ambiguous.
  const existingGroupsSnap = await eventDoc.ref.collection("groups").get();
  const normalizedName = groupName.toLowerCase();
  const normalizedClassName = className.toLowerCase();
  const isDuplicate = existingGroupsSnap.docs.some((d) => {
    const existing = d.data() as Group;
    return (
      existing.name.toLowerCase() === normalizedName &&
      existing.className.toLowerCase() === normalizedClassName
    );
  });
  if (isDuplicate) {
    return NextResponse.json(
      { error: "Dieser Gruppenname ist in dieser Rallye schon vergeben" },
      { status: 409 }
    );
  }

  const groupId = generateId();
  const group: Group = {
    id: groupId,
    name: groupName,
    className,
    joinedAt: Date.now(),
    finishedAt: null,
    solved: {},
    progress: {},
    totalSeconds: null,
    xp: 0,
    orgId: event.orgId,
    ackedBroadcastId: null,
  };

  await eventDoc.ref.collection("groups").doc(groupId).set(group);

  return NextResponse.json({ eventId: event.id, groupId, eventName: event.name });
}
