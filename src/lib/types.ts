export type EventStatus = "draft" | "active" | "finished";

// A floor's image is a static file (public/floors/) - the building itself
// never changes, so this is a fixed constant, not Firestore data.
export type Floor = {
  id: string;
  name: string;
  imagePath: string;
  order: number;
};

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
export type Hotspot = {
  id: string;
  setId: string;
  number: number;
  floorId: string;
  roomName: string;
  xPct: number;
  yPct: number;
  puzzleId: string | null;
};

export type PuzzleType = "mc" | "text" | "number";

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

export type Group = {
  id: string;
  name: string;
  className: string;
  joinedAt: number;
  finishedAt: number | null;
  solved: Record<string, SolvedEntry>;
  progress: Record<string, { attempts: number }>;
  totalSeconds: number | null;
};
