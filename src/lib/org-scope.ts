import { adminDb } from "./firebase-admin";
import type { RallyEvent, Template } from "./types";

// Hotspots/puzzles/floors/answers are scoped by `setId` (an eventId or a
// templateId) rather than carrying their own orgId (see types.ts) - this
// resolves which org actually owns a given setId, by checking whichever of
// the two collections it belongs to. Returns null if setId matches neither
// (already deleted, or bogus input).
export async function resolveSetOrgId(setId: string): Promise<string | null> {
  const db = adminDb();
  const eventDoc = await db.collection("events").doc(setId).get();
  if (eventDoc.exists) return (eventDoc.data() as RallyEvent).orgId ?? null;

  const templateDoc = await db.collection("templates").doc(setId).get();
  if (templateDoc.exists) return (templateDoc.data() as Template).orgId ?? null;

  return null;
}
