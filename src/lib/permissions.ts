import type { OrgRole, RallyEvent } from "./types";

// Only the teacher who created or (most recently) started a rally may end
// it themselves - not any other org member. Events from before this existed
// have neither field set, which is treated as "anyone may finish" so old
// data doesn't get locked out. The org owner is always allowed too, so they
// can manually close a rally the class forgot to end. Shared between the
// PATCH route and the event page's button so the two never drift.
export function canFinishEvent(
  admin: { uid: string; orgRole?: OrgRole | null },
  event: Pick<RallyEvent, "createdByUid" | "startedByUid">
): boolean {
  if (!event.createdByUid && !event.startedByUid) return true;
  if (admin.orgRole === "owner") return true;
  return admin.uid === event.createdByUid || admin.uid === event.startedByUid;
}
