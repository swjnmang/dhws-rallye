export type EventStatus = "draft" | "active" | "finished";

export type FloorKind = "image" | "map";

// A floor is either a fixed image (a real floor plan, click-to-place
// hotspots) or a live Google Map (GPS-tracked, hotspots have real
// coordinates + a proximity radius). The 3 base floors (this school's
// building) are a fixed constant backed by static files (public/floors/) -
// free, zero setup, never change - always kind "image".
export type Floor = {
  id: string;
  name: string;
  order: number;
  kind: FloorKind;
  imagePath: string | null; // set when kind === "image"
  centerLat: number | null; // set when kind === "map"
  centerLng: number | null;
  zoom: number | null;
};

// Teachers can add further floors per event or template (e.g. a different
// building, a park map, an outdoor GPS area, ...). Scoped by `setId` like
// hotspots/puzzles.
export type CustomFloor = Floor & { setId: string };

export type RallyEvent = {
  id: string;
  name: string;
  status: EventStatus;
  joinCode: string;
  createdAt: number;
  // Set once, when the teacher clicks "Rallye starten" (draft -> active).
  // Every group's timer is measured from this shared moment, not from when
  // they individually joined, so the whole class starts the race together.
  startedAt: number | null;
  // Set whenever status moves to "finished" (manually or via close-stale).
  // Used only to auto-hide old finished rallies from the landing page after
  // 24h - re-finishing a reopened rally overwrites it.
  finishedAt: number | null;
  // Which template (if any) this event's stations were cloned from. Purely
  // informational - editing the event afterwards does not affect the template.
  templateId: string | null;
};

// A reusable, named set of stations a teacher has saved from a finished
// event so other teachers can start new events from it.
export type Template = {
  id: string;
  name: string;
  createdAt: number;
};

// Hotspots/puzzles/answers all carry a `setId`, which is either an eventId
// or a templateId. This keeps every event's (and template's) stations in
// one shared top-level collection, filtered by `setId`, instead of nesting
// them under separate parents.
//
// A hotspot is positioned either by percentage on an image floor
// (xPct/yPct) or by real coordinates on a map floor (lat/lng + a
// radiusMeters within which the group must be to open the puzzle) -
// whichever pair applies to its floor's kind, the other stays null.
export type Hotspot = {
  id: string;
  setId: string;
  number: number;
  floorId: string;
  roomName: string;
  xPct: number | null;
  yPct: number | null;
  lat: number | null;
  lng: number | null;
  radiusMeters: number | null;
  puzzleId: string | null;
};

export type PuzzleType = "mc" | "text" | "number" | "jigsaw";

// Public shape - never contains the answer.
export type Puzzle = {
  id: string;
  setId: string;
  hotspotId: string;
  type: PuzzleType;
  question: string;
  options: string[] | null;
  points: number;
  imageUrl: string | null;
  // Grid size (NxN tiles) for a "jigsaw" puzzle; set only for that type.
  // There's no separate correct answer to protect - solved just means the
  // tiles are back in their original order, which the client can check
  // itself - so this lives on the public Puzzle doc, not PuzzleAnswer.
  jigsawSize: number | null;
};

export type PuzzleAnswer = {
  correctOptionIndex: number | null;
  correctText: string | null;
  correctNumber: number | null;
};

export type SolvedEntry = {
  solvedAt: number;
  attempts: number;
};

// A school/organization. Rallys, templates and highscores are scoped to
// exactly one org (see RallyEvent.orgId / Template.orgId), so different
// schools never see each other's data.
export type Organization = {
  id: string;
  name: string;
  createdAt: number;
  createdByUid: string;
};

export type OrgRole = "owner" | "member";
// "none": not part of any org yet (the default - org membership is
// optional, managed from /admin/organization, not a login gate). "pending":
// requested to join an org, waiting on that org's owner. "active": request
// approved (or founded the org outright).
export type MembershipStatus = "none" | "pending" | "active";

// One doc per Firebase Auth account, doc id === Firebase uid. orgId/orgRole
// are null until the user creates or requests to join an org. orgRole is
// scoped to this user's own org (an "owner" can approve/manage members of
// their org); isSuperAdmin is a separate, app-wide flag unrelated to any
// org, only ever set by the app operator directly in Firestore/the
// bootstrap script - never through app UI, to avoid a privilege-escalation
// path.
export type AppUser = {
  uid: string;
  email: string;
  displayName: string | null;
  orgId: string | null;
  orgRole: OrgRole | null;
  membershipStatus: MembershipStatus;
  isSuperAdmin: boolean;
  createdAt: number;
  approvedAt: number | null;
  approvedByUid: string | null;
};

export type Group = {
  id: string;
  name: string;
  className: string;
  joinedAt: number;
  finishedAt: number | null;
  solved: Record<string, SolvedEntry>;
  progress: Record<string, { attempts: number }>;
  totalSeconds: number | null;
  // Motivational gamification counter, +5 per solved puzzle. Not used for
  // ranking (that's totalSeconds) - purely a morale display for students.
  xp: number;
};
