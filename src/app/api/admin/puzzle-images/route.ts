import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { generateId } from "@/lib/codes";

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

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Kein gültiges Bild" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Bild ist zu groß (max. 8 MB)" }, { status: 413 });
  }

  const extension = file.name.split(".").pop() || "jpg";
  const blob = await put(`puzzle-images/${generateId()}.${extension}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
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

  await del(url).catch(() => {});
  return NextResponse.json({ ok: true });
}
