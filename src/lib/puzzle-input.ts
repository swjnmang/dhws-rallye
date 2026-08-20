export type PuzzleInput = {
  type: "mc" | "text" | "number";
  question: string;
  options: string[] | null;
  points: number;
  correctOptionIndex: number | null;
  correctText: string | null;
  correctNumber: number | null;
};

export function validatePuzzleInput(body: unknown): PuzzleInput | null {
  const b = body as Record<string, unknown>;
  if (b?.type !== "mc" && b?.type !== "text" && b?.type !== "number") return null;
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
  };
}
