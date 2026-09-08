import type { OrgRole, RallyEvent, Template } from "./types";

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

// Only the org owner or the template's own creator may edit its stations in
// place (i.e. save changes under the template's existing id/name) - anyone
// else must save their edits as a new template instead, so they can never
// overwrite a colleague's work. A template with no recorded creator (e.g.
// the auto-seeded example template) is owner-only until someone claims it
// by saving their own copy.
export function canEditTemplateInPlace(
  admin: { uid: string; orgRole?: OrgRole | null },
  template: Pick<Template, "createdByUid">
): boolean {
  if (admin.orgRole === "owner") return true;
  return !!template.createdByUid && admin.uid === template.createdByUid;
}
