import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { RallyEvent } from "@/lib/types";

type Params = { params: Promise<{ eventId: string; groupId: string }> };

// Permanently removes a group (and its progress) from a rally - e.g. a
// duplicate/joke entry, or a group that needs to be kicked.
export async function DELETE(_request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { eventId, groupId } = await params;
  const eventRef = adminDb().collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  const event = eventSnap.data() as RallyEvent | undefined;
  if (!event) {
    return NextResponse.json({ error: "Rallye nicht gefunden" }, { status: 404 });
  }
  if (event.orgId !== admin.orgId) {
    return NextResponse.json({ error: "Kein Zugriff auf diese Rallye" }, { status: 403 });
  }

  await eventRef.collection("groups").doc(groupId).delete();

  return NextResponse.json({ ok: true });
}

// Excludes a group from the cross-rally /admin/highscore board without
// touching its real result (its own event's Rangliste is unaffected) -
// owner-only, since the highscore is an org-wide board rather than
// something scoped to whoever ran this one event.
export async function PATCH(request: Request, { params }: Params) {
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

  const { eventId, groupId } = await params;
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
  const hiddenFromHighscore = body?.hiddenFromHighscore !== false;
  await eventRef.collection("groups").doc(groupId).update({ hiddenFromHighscore });

  return NextResponse.json({ ok: true });
}
