import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { generateId } from "@/lib/codes";
import { adminDb } from "@/lib/firebase-admin";
import { resolveSetOrgId } from "@/lib/org-scope";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  const isImage = file instanceof File && file.type.startsWith("image/");
  const isPdf = file instanceof File && file.type === "application/pdf";
  if (!(file instanceof File) || !(isImage || isPdf)) {
    return NextResponse.json({ error: "Kein gültiges Bild oder PDF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `${isPdf ? "PDF" : "Bild"} ist zu groß (max. 8 MB)` },
      { status: 413 }
    );
  }

  const extension = isPdf ? "pdf" : file.name.split(".").pop() || "jpg";
  const folder = isPdf ? "puzzle-documents" : "puzzle-images";
  const blob = await put(`${folder}/${generateId()}.${extension}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}

export async function DELETE(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : "";
  if (!url) {
    return NextResponse.json({ error: "URL fehlt" }, { status: 400 });
  }

  // Find whichever puzzle/floor this URL is actually attached to and verify
  // it belongs to the caller's own org before deleting - otherwise any
  // registered account (even one without an org) could delete another
  // school's puzzle images/PDFs just by knowing the blob URL. A URL that
  // isn't referenced by anything yet (e.g. an upload abandoned before the
  // puzzle was saved) has nothing to check ownership against, so it's safe
  // to delete either way.
  const db = adminDb();
  const [byImage, byDocument, byFloor] = await Promise.all([
    db.collection("puzzles").where("imageUrl", "==", url).limit(1).get(),
    db.collection("puzzles").where("documentUrl", "==", url).limit(1).get(),
    db.collection("floors").where("imagePath", "==", url).limit(1).get(),
  ]);
  const referencingDoc = byImage.docs[0] ?? byDocument.docs[0] ?? byFloor.docs[0];

  if (referencingDoc) {
    const setId = (referencingDoc.data() as { setId: string }).setId;
    const orgId = await resolveSetOrgId(setId);
    if (!orgId || orgId !== admin.orgId) {
      return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
    }
  }

  await del(url).catch(() => {});
  return NextResponse.json({ ok: true });
}
