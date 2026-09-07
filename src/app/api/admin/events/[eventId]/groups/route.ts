import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import type { Group, RallyEvent } from "@/lib/types";

type Params = { params: Promise<{ eventId: string }> };

// Lets a teacher add a group manually (e.g. one that couldn't scan the QR
// code) - same shape /api/join creates, just without a join code.
export async function POST(request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { eventId } = await params;
  const eventRef = adminDb().collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  const event = eventSnap.data() as RallyEvent | undefined;
  if (!event) {
    return NextResponse.json({ error: "Rallye nicht gefunden" }, { status: 404 });
  }
  if (event.orgId !== admin.orgId) {
    return NextResponse.json({ error: "Kein Zugriff auf diese Rallye" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const groupName = typeof body?.groupName === "string" ? body.groupName.trim() : "";
  const className = typeof body?.className === "string" ? body.className.trim() : "";
  if (!groupName || !className) {
    return NextResponse.json({ error: "Gruppenname und Klasse sind erforderlich" }, { status: 400 });
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
  };
  await eventRef.collection("groups").doc(groupId).set(group);

  return NextResponse.json({ group });
}
