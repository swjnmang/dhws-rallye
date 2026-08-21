import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { PuzzleAnswer } from "@/lib/types";

// Correct answers are never readable by the public client SDK (see
// firestore.rules) so a teacher can only see them through this admin-gated
// route, which fetches them server-side via the Admin SDK.
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId");
  if (!setId) {
    return NextResponse.json({ error: "setId fehlt" }, { status: 400 });
  }

  const db = adminDb();
  const puzzlesSnap = await db.collection("puzzles").where("setId", "==", setId).get();
  const puzzleIds = puzzlesSnap.docs.map((d) => d.id);
  const answerSnaps = await Promise.all(
    puzzleIds.map((id) => db.collection("puzzleAnswers").doc(id).get())
  );

  const answers: Record<string, PuzzleAnswer> = {};
  answerSnaps.forEach((snap, i) => {
    if (snap.exists) answers[puzzleIds[i]] = snap.data() as PuzzleAnswer;
  });

  return NextResponse.json({ answers });
}
