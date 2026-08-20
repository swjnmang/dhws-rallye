import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import { cloneStations } from "@/lib/clone-stations";
import type { Template } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const sourceEventId = typeof body?.sourceEventId === "string" ? body.sourceEventId : "";

  if (!name || !sourceEventId) {
    return NextResponse.json({ error: "Name und Quell-Event sind erforderlich" }, { status: 400 });
  }

  const templateId = generateId();
  const template: Template = { id: templateId, name, createdAt: Date.now() };

  await adminDb().collection("templates").doc(templateId).set(template);
  await cloneStations(sourceEventId, templateId);

  return NextResponse.json({ template });
}
