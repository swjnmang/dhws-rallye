export type PuzzleInput = {
  type: "mc" | "text" | "number" | "jigsaw";
  question: string;
  options: string[] | null;
  points: number;
  correctOptionIndex: number | null;
  correctText: string | null;
  correctNumber: number | null;
  jigsawSize: number | null;
};

const MIN_JIGSAW_SIZE = 2;
const MAX_JIGSAW_SIZE = 5;

export function validatePuzzleInput(body: unknown): PuzzleInput | null {
  const b = body as Record<string, unknown>;
  if (b?.type !== "mc" && b?.type !== "text" && b?.type !== "number" && b?.type !== "jigsaw") {
    return null;
  }
  if (typeof b.question !== "string" || !b.question.trim()) return null;

  const points = typeof b.points === "number" ? b.points : 1;

  if (b.type === "mc") {
    if (!Array.isArray(b.options) || b.options.length < 2) return null;
    if (typeof b.correctOptionIndex !== "number") return null;
    if (b.correctOptionIndex < 0 || b.correctOptionIndex >= b.options.length) return null;
    return {
      type: "mc",
      question: b.question.trim(),
      options: b.options.map((o) => String(o)),
      points,
      correctOptionIndex: b.correctOptionIndex,
      correctText: null,
      correctNumber: null,
      jigsawSize: null,
    };
  }

  if (b.type === "number") {
    if (typeof b.correctNumber !== "number" || Number.isNaN(b.correctNumber)) return null;
    return {
      type: "number",
      question: b.question.trim(),
      options: null,
      points,
      correctOptionIndex: null,
      correctText: null,
      correctNumber: b.correctNumber,
      jigsawSize: null,
    };
  }

  if (b.type === "jigsaw") {
    if (typeof b.imageUrl !== "string" || !b.imageUrl) return null;
    if (typeof b.jigsawSize !== "number" || b.jigsawSize < MIN_JIGSAW_SIZE || b.jigsawSize > MAX_JIGSAW_SIZE) {
      return null;
    }
    return {
      type: "jigsaw",
      question: b.question.trim(),
      options: null,
      points,
      correctOptionIndex: null,
      correctText: null,
      correctNumber: null,
      jigsawSize: b.jigsawSize,
    };
  }

  if (typeof b.correctText !== "string" || !b.correctText.trim()) return null;
  return {
    type: "text",
    question: b.question.trim(),
    options: null,
    points,
    correctOptionIndex: null,
    correctText: b.correctText.trim(),
    correctNumber: null,
    jigsawSize: null,
  };
}
