export type PuzzleInput = {
  type: "mc" | "text";
  question: string;
  options: string[] | null;
  points: number;
  correctOptionIndex: number | null;
  correctText: string | null;
};

export function validatePuzzleInput(body: unknown): PuzzleInput | null {
  const b = body as Record<string, unknown>;
  if (b?.type !== "mc" && b?.type !== "text") return null;
  if (typeof b.question !== "string" || !b.question.trim()) return null;

  if (b.type === "mc") {
    if (!Array.isArray(b.options) || b.options.length < 2) return null;
    if (typeof b.correctOptionIndex !== "number") return null;
    if (b.correctOptionIndex < 0 || b.correctOptionIndex >= b.options.length) return null;
    return {
      type: "mc",
      question: b.question.trim(),
      options: b.options.map((o) => String(o)),
      points: typeof b.points === "number" ? b.points : 1,
      correctOptionIndex: b.correctOptionIndex,
      correctText: null,
    };
  }

  if (typeof b.correctText !== "string" || !b.correctText.trim()) return null;
  return {
    type: "text",
    question: b.question.trim(),
    options: null,
    points: typeof b.points === "number" ? b.points : 1,
    correctOptionIndex: null,
    correctText: b.correctText.trim(),
  };
}
