import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId, generateJoinCode } from "@/lib/codes";
import { cloneStations } from "@/lib/clone-stations";
import type { RallyEvent, Template } from "@/lib/types";

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }
  if (!admin.orgId) {
    return NextResponse.json(
      { error: "Du musst zuerst einer Organisation angehören" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const templateId = typeof body?.templateId === "string" && body.templateId ? body.templateId : null;
  if (!name) {
    return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  }

  if (templateId) {
    const templateDoc = await adminDb().collection("templates").doc(templateId).get();
    const template = templateDoc.data() as Template | undefined;
    if (!template || template.orgId !== admin.orgId) {
      return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });
    }
  }

  const eventsRef = adminDb().collection("events");

  let joinCode = generateJoinCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await eventsRef.where("joinCode", "==", joinCode).limit(1).get();
    if (existing.empty) break;
    joinCode = generateJoinCode();
  }

  const id = generateId();
  const event: RallyEvent = {
    id,
    name,
    status: "draft",
    joinCode,
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null,
    templateId,
    createdByUid: admin.uid,
    startedByUid: null,
    orgId: admin.orgId,
  };

  await eventsRef.doc(id).set(event);
  if (templateId) {
    await cloneStations(templateId, id);
  }

  return NextResponse.json({ event });
}
