import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { deleteBlobIfUnreferenced } from "@/lib/blob-cleanup";
import type { CustomFloor, Puzzle } from "@/lib/types";

type Params = { params: Promise<{ floorId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { floorId } = await params;
  const db = adminDb();
  const floorRef = db.collection("floors").doc(floorId);
  const floorSnap = await floorRef.get();
  if (!floorSnap.exists) {
    return NextResponse.json({ error: "Ebene nicht gefunden" }, { status: 404 });
  }

  // Deleting a floor also removes every room/puzzle placed on it.
  const hotspotsSnap = await db.collection("hotspots").where("floorId", "==", floorId).get();
  const puzzleIds = hotspotsSnap.docs
    .map((d) => d.data().puzzleId as string | null)
    .filter((id): id is string => !!id);
  const puzzleSnaps = await Promise.all(
    puzzleIds.map((id) => db.collection("puzzles").doc(id).get())
  );

  await Promise.all(
    puzzleSnaps.map((snap) => {
      const imageUrl = (snap.data() as Puzzle | undefined)?.imageUrl;
      return imageUrl ? deleteBlobIfUnreferenced("puzzles", "imageUrl", imageUrl, snap.id) : Promise.resolve();
    })
  );

  const imagePath = (floorSnap.data() as CustomFloor).imagePath;
  await deleteBlobIfUnreferenced("floors", "imagePath", imagePath, floorId);

  const batch = db.batch();
  hotspotsSnap.docs.forEach((d) => batch.delete(d.ref));
  puzzleIds.forEach((id) => {
    batch.delete(db.collection("puzzles").doc(id));
    batch.delete(db.collection("puzzleAnswers").doc(id));
  });
  batch.delete(floorRef);
  await batch.commit();

  return NextResponse.json({ ok: true });
}
