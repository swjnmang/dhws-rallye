import { adminDb } from "./firebase-admin";
import { canEditTemplateInPlace } from "./permissions";
import type { OrgRole, RallyEvent, Template } from "./types";

// Hotspots/puzzles/floors/answers are scoped by `setId` (an eventId or a
// templateId) rather than carrying their own orgId (see types.ts) - this
// resolves which org actually owns a given setId, by checking whichever of
// the two collections it belongs to. Returns null if setId matches neither
// (already deleted, or bogus input). Read-only checks only - see
// canEditSet for the additional per-template ownership check writes need.
export async function resolveSetOrgId(setId: string): Promise<string | null> {
  const db = adminDb();
  const eventDoc = await db.collection("events").doc(setId).get();
  if (eventDoc.exists) return (eventDoc.data() as RallyEvent).orgId ?? null;

  const templateDoc = await db.collection("templates").doc(setId).get();
  if (templateDoc.exists) return (templateDoc.data() as Template).orgId ?? null;

  return null;
}

// Same org check as resolveSetOrgId, but for routes that WRITE a set's
// stations/floors: an event may be edited by anyone in its org (unchanged),
// but a template may only be edited in place by its creator or the org
// owner - everyone else has to save their changes as a new template (see
// canEditTemplateInPlace), so members can't overwrite each other's work by
// directly editing a shared template's stations.
export async function canEditSet(
  setId: string,
  admin: { uid: string; orgId: string | null; orgRole?: OrgRole | null }
): Promise<boolean> {
  const db = adminDb();
  const eventDoc = await db.collection("events").doc(setId).get();
  if (eventDoc.exists) {
    const event = eventDoc.data() as RallyEvent;
    return !!event.orgId && event.orgId === admin.orgId;
  }

  const templateDoc = await db.collection("templates").doc(setId).get();
  if (templateDoc.exists) {
    const template = templateDoc.data() as Template;
    if (!template.orgId || template.orgId !== admin.orgId) return false;
    return canEditTemplateInPlace(admin, template);
  }

  return false;
}
