import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import { validatePuzzleInput } from "@/lib/puzzle-input";
import type { Hotspot, Puzzle, PuzzleAnswer } from "@/lib/types";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { eventId } = await params;
  const body = await request.json().catch(() => null);

  const floorId = typeof body?.floorId === "string" ? body.floorId : "";
  const roomName = typeof body?.roomName === "string" ? body.roomName.trim() : "";
  const xPct = typeof body?.xPct === "number" ? body.xPct : null;
  const yPct = typeof body?.yPct === "number" ? body.yPct : null;
  const puzzleInput = validatePuzzleInput(body?.puzzle);

  if (!floorId || !roomName || xPct === null || yPct === null || !puzzleInput) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const eventRef = adminDb().collection("events").doc(eventId);
  const hotspotId = generateId();
  const puzzleId = generateId();

  const hotspot: Hotspot = { id: hotspotId, floorId, roomName, xPct, yPct, puzzleId };
  const puzzle: Puzzle = {
    id: puzzleId,
    hotspotId,
    type: puzzleInput.type,
    question: puzzleInput.question,
    options: puzzleInput.options,
    points: puzzleInput.points,
  };
  const answer: PuzzleAnswer = {
    correctOptionIndex: puzzleInput.correctOptionIndex,
    correctText: puzzleInput.correctText,
  };

  const batch = adminDb().batch();
  batch.set(eventRef.collection("hotspots").doc(hotspotId), hotspot);
  batch.set(eventRef.collection("puzzles").doc(puzzleId), puzzle);
  batch.set(eventRef.collection("puzzleAnswers").doc(puzzleId), answer);
  await batch.commit();

  return NextResponse.json({ hotspot, puzzle });
}
