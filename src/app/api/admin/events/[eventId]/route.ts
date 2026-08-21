import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { deleteBlobIfUnreferenced } from "@/lib/blob-cleanup";
import { canFinishEvent } from "@/lib/permissions";
import type { CustomFloor, EventStatus, Puzzle, RallyEvent } from "@/lib/types";

type Params = { params: Promise<{ eventId: string }> };

const VALID_STATUSES: EventStatus[] = ["draft", "active", "finished"];

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

  const { eventId } = await params;
  const body = await request.json().catch(() => null);
  const eventRef = adminDb().collection("events").doc(eventId);

  const update: Record<string, unknown> = {};
  if (typeof body?.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }
  if (typeof body?.status === "string" && VALID_STATUSES.includes(body.status)) {
    const snap = await eventRef.get();
    const event = snap.data() as RallyEvent | undefined;

    if (body.status === "finished" && event && !canFinishEvent(admin.uid, event)) {
      return NextResponse.json(
        { error: "Nur wer die Rallye angelegt oder gestartet hat, darf sie beenden" },
        { status: 403 }
      );
    }

    update.status = body.status;

    // The whole class starts the race together: stamp a shared start time
    // the first time the event moves into "active", never again after that
    // (so reopening a finished event doesn't reset everyone's clock).
    // startedByUid, unlike startedAt, is refreshed on every (re-)start -
    // whoever (re-)opens the rally is who may finish it from here on.
    if (body.status === "active") {
      if (!event?.startedAt) {
        update.startedAt = Date.now();
      }
      update.startedByUid = admin.uid;
    }

    // Stamped fresh every time (unlike startedAt) - only used to auto-hide
    // the rally from the landing page 24h after it most recently finished.
    if (body.status === "finished") {
      update.finishedAt = Date.now();
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nichts zu aktualisieren" }, { status: 400 });
  }

  await eventRef.update(update);
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
  const db = adminDb();
  const eventRef = db.collection("events").doc(eventId);

  const [groupsSnap, hotspotsSnap, puzzlesSnap, floorsSnap] = await Promise.all([
    eventRef.collection("groups").get(),
    db.collection("hotspots").where("setId", "==", eventId).get(),
    db.collection("puzzles").where("setId", "==", eventId).get(),
    db.collection("floors").where("setId", "==", eventId).get(),
  ]);

  await Promise.all([
    ...puzzlesSnap.docs.map((d) => {
      const imageUrl = (d.data() as Puzzle).imageUrl;
      return imageUrl ? deleteBlobIfUnreferenced("puzzles", "imageUrl", imageUrl, d.id) : Promise.resolve();
    }),
    ...floorsSnap.docs.map((d) => {
      const imagePath = (d.data() as CustomFloor).imagePath;
      return imagePath ? deleteBlobIfUnreferenced("floors", "imagePath", imagePath, d.id) : Promise.resolve();
    }),
  ]);

  const batch = db.batch();
  groupsSnap.docs.forEach((d) => batch.delete(d.ref));
  hotspotsSnap.docs.forEach((d) => batch.delete(d.ref));
  puzzlesSnap.docs.forEach((d) => {
    batch.delete(d.ref);
    batch.delete(db.collection("puzzleAnswers").doc(d.id));
  });
  floorsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(eventRef);
  await batch.commit();

  return NextResponse.json({ ok: true });
}
