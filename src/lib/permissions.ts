import type { RallyEvent } from "./types";

// Only the teacher who created or (most recently) started a rally may end
// it - not any other logged-in teacher. Events from before this existed
// have neither field set, which is treated as "anyone may finish" so old
// data doesn't get locked out. Shared between the PATCH route and the
// event page's button so the two never drift.
export function canFinishEvent(
  uid: string,
  event: Pick<RallyEvent, "createdByUid" | "startedByUid">
): boolean {
  if (!event.createdByUid && !event.startedByUid) return true;
  return uid === event.createdByUid || uid === event.startedByUid;
}
