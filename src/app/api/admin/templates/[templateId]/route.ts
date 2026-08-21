import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { deleteBlobIfUnreferenced } from "@/lib/blob-cleanup";
import type { CustomFloor, Puzzle, Template } from "@/lib/types";

type Params = { params: Promise<{ templateId: string }> };

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

  const { templateId } = await params;
  const db = adminDb();

  const templateRef = db.collection("templates").doc(templateId);
  const templateSnap = await templateRef.get();
  const template = templateSnap.data() as Template | undefined;
  if (!template) {
    return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });
  }
  if (template.orgId !== admin.orgId) {
    return NextResponse.json({ error: "Kein Zugriff auf diese Vorlage" }, { status: 403 });
  }

  const [hotspotsSnap, puzzlesSnap, floorsSnap, removedFloorsSnap] = await Promise.all([
    db.collection("hotspots").where("setId", "==", templateId).get(),
    db.collection("puzzles").where("setId", "==", templateId).get(),
    db.collection("floors").where("setId", "==", templateId).get(),
    db.collection("removedFloors").where("setId", "==", templateId).get(),
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
  hotspotsSnap.docs.forEach((d) => batch.delete(d.ref));
  puzzlesSnap.docs.forEach((d) => {
    batch.delete(d.ref);
    batch.delete(db.collection("puzzleAnswers").doc(d.id));
  });
  floorsSnap.docs.forEach((d) => batch.delete(d.ref));
  removedFloorsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(templateRef);
  await batch.commit();

  return NextResponse.json({ ok: true });
}
