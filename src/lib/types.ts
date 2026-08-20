export type EventStatus = "draft" | "active" | "finished";

// A floor's image is a compressed data URL, stored as its own Firestore
// document (subcollection) so each floor stays under the 1 MiB doc limit
// independently of the others and of the parent event document.
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
};

export type Hotspot = {
  id: string;
  floorId: string;
  roomName: string;
  xPct: number;
  yPct: number;
  puzzleId: string | null;
};

export type PuzzleType = "mc" | "text";

// Public shape - never contains the answer.
export type Puzzle = {
  id: string;
  hotspotId: string;
  type: PuzzleType;
  question: string;
  options: string[] | null;
  points: number;
};

export type PuzzleAnswer = {
  correctOptionIndex: number | null;
  correctText: string | null;
};

export type SolvedEntry = {
  solvedAt: number;
  attempts: number;
};

export type Group = {
  id: string;
  name: string;
  joinedAt: number;
  startedAt: number;
  finishedAt: number | null;
  solved: Record<string, SolvedEntry>;
  progress: Record<string, { attempts: number }>;
  totalSeconds: number | null;
};
