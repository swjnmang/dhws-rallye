import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { EventStatus } from "@/lib/types";

type Params = { params: Promise<{ eventId: string }> };

const VALID_STATUSES: EventStatus[] = ["draft", "active", "finished"];

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { eventId } = await params;
  const body = await request.json().catch(() => null);

  const update: Record<string, unknown> = {};
  if (typeof body?.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }
  if (typeof body?.status === "string" && VALID_STATUSES.includes(body.status)) {
    update.status = body.status;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nichts zu aktualisieren" }, { status: 400 });
  }

  await adminDb().collection("events").doc(eventId).update(update);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { eventId } = await params;
  const eventRef = adminDb().collection("events").doc(eventId);

  const collections = ["hotspots", "puzzles", "puzzleAnswers", "groups"];
  for (const sub of collections) {
    const snap = await eventRef.collection(sub).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  await eventRef.delete();

  return NextResponse.json({ ok: true });
}
