import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import type { RallyEvent } from "@/lib/types";

type Params = { params: Promise<{ eventId: string }> };

// Sends a message to every group currently in the rally - only possible
// while it's running, since there's no live audience to reach in a draft
// lobby or after it's already finished.
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
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Nachricht darf nicht leer sein" }, { status: 400 });
  }

  const eventRef = adminDb().collection("events").doc(eventId);
  const snap = await eventRef.get();
  const event = snap.data() as RallyEvent | undefined;
  if (!event) {
    return NextResponse.json({ error: "Rallye nicht gefunden" }, { status: 404 });
  }
  if (event.orgId !== admin.orgId) {
    return NextResponse.json({ error: "Kein Zugriff auf diese Rallye" }, { status: 403 });
  }
  if (event.status !== "active") {
    return NextResponse.json(
      { error: "Nachrichten können nur an eine laufende Rallye gesendet werden" },
      { status: 400 }
    );
  }

  await eventRef.update({
    broadcastMessage: { id: generateId(), text, sentAt: Date.now() },
  });

  return NextResponse.json({ ok: true });
}
