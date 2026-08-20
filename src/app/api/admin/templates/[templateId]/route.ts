import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { deleteImageIfUnreferenced } from "@/lib/puzzle-image-cleanup";
import type { Puzzle } from "@/lib/types";

type Params = { params: Promise<{ templateId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { templateId } = await params;
  const db = adminDb();

  const [hotspotsSnap, puzzlesSnap] = await Promise.all([
    db.collection("hotspots").where("setId", "==", templateId).get(),
    db.collection("puzzles").where("setId", "==", templateId).get(),
  ]);

  await Promise.all(
    puzzlesSnap.docs.map((d) => {
      const imageUrl = (d.data() as Puzzle).imageUrl;
      return imageUrl ? deleteImageIfUnreferenced(imageUrl, d.id) : Promise.resolve();
    })
  );

  const batch = db.batch();
  hotspotsSnap.docs.forEach((d) => batch.delete(d.ref));
  puzzlesSnap.docs.forEach((d) => {
    batch.delete(d.ref);
    batch.delete(db.collection("puzzleAnswers").doc(d.id));
  });
  batch.delete(db.collection("templates").doc(templateId));
  await batch.commit();

  return NextResponse.json({ ok: true });
}
