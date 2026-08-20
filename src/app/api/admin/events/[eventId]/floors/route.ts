import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import type { Floor } from "@/lib/types";

type Params = { params: Promise<{ eventId: string }> };

// Firestore documents are capped at 1 MiB; leave headroom for the rest of
// the document plus base64's ~33% overhead over the raw image bytes.
const MAX_DATA_URL_LENGTH = 900_000;

export async function POST(request: Request, { params }: Params) {
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

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const order = typeof body?.order === "number" ? body.order : null;
  const imageDataUrl = typeof body?.imageDataUrl === "string" ? body.imageDataUrl : "";

  if (!name || order === null || !imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  if (imageDataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "Bild ist zu groß" }, { status: 413 });
  }

  const eventRef = adminDb().collection("events").doc(eventId);
  const floorsRef = eventRef.collection("floors");

  const existing = await floorsRef.where("order", "==", order).limit(1).get();
  const floorId = existing.empty ? generateId() : existing.docs[0].id;

  const floor: Floor = { id: floorId, name, imagePath: imageDataUrl, order };
  await floorsRef.doc(floorId).set(floor);

  return NextResponse.json({ floor });
}
