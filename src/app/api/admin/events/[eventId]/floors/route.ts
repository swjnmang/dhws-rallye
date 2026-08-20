import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb, adminBucket } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import type { Floor, RallyEvent } from "@/lib/types";

type Params = { params: Promise<{ eventId: string }> };

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
  const formData = await request.formData();

  const file = formData.get("file");
  const name = formData.get("name");
  const orderRaw = formData.get("order");

  if (!(file instanceof File) || typeof name !== "string" || typeof orderRaw !== "string") {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const order = Number(orderRaw);

  const eventRef = adminDb().collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  }
  const event = eventSnap.data() as RallyEvent;

  const existingFloor = event.floors.find((f) => f.order === order);
  const floorId = existingFloor?.id ?? generateId();

  const extension = file.name.split(".").pop() || "png";
  const storagePath = `events/${eventId}/floors/${floorId}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const storageFile = adminBucket().file(storagePath);
  await storageFile.save(buffer, {
    contentType: file.type || "image/png",
    public: true,
  });

  const imagePath = `https://storage.googleapis.com/${adminBucket().name}/${storagePath}`;

  const newFloor: Floor = { id: floorId, name, imagePath, order };
  const floors = existingFloor
    ? event.floors.map((f) => (f.id === floorId ? newFloor : f))
    : [...event.floors, newFloor].sort((a, b) => a.order - b.order);

  await eventRef.update({ floors });

  return NextResponse.json({ floor: newFloor });
}
