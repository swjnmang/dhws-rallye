import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
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
  const sourceEventId = typeof body?.sourceEventId === "string" && body.sourceEventId ? body.sourceEventId : "";
  const sourceTemplateId =
    typeof body?.sourceTemplateId === "string" && body.sourceTemplateId ? body.sourceTemplateId : "";

  if (!name) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  if (sourceEventId) {
    const eventDoc = await adminDb().collection("events").doc(sourceEventId).get();
    const event = eventDoc.data() as RallyEvent | undefined;
    if (!event || event.orgId !== admin.orgId) {
      return NextResponse.json({ error: "Rallye nicht gefunden" }, { status: 404 });
    }
  }

  // Forking someone else's template (see canEditTemplateInPlace): anyone in
  // the org may read/clone any of the org's templates, this just requires
  // the org to match, not edit rights on the source - the whole point is to
  // hand a non-owner their own editable copy instead of write access to the
  // original.
  if (sourceTemplateId) {
    const templateDoc = await adminDb().collection("templates").doc(sourceTemplateId).get();
    const sourceTemplate = templateDoc.data() as Template | undefined;
    if (!sourceTemplate || sourceTemplate.orgId !== admin.orgId) {
      return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });
    }
  }

  const templateId = generateId();
  const template: Template = {
    id: templateId,
    name,
    createdAt: Date.now(),
    orgId: admin.orgId,
    createdByUid: admin.uid,
  };

  await adminDb().collection("templates").doc(templateId).set(template);
  if (sourceEventId) {
    await cloneStations(sourceEventId, templateId);
  } else if (sourceTemplateId) {
    await cloneStations(sourceTemplateId, templateId);
  }

  return NextResponse.json({ template });
}
