import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import { validatePuzzleInput } from "@/lib/puzzle-input";
import type { Hotspot, Puzzle, PuzzleAnswer } from "@/lib/types";

// Hotspots/puzzles live in shared top-level collections, scoped by `setId`
// (an eventId or a templateId) rather than nested under separate parents.
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const body = await request.json().catch(() => null);

  const setId = typeof body?.setId === "string" ? body.setId : "";
  const floorId = typeof body?.floorId === "string" ? body.floorId : "";
  const roomName = typeof body?.roomName === "string" ? body.roomName.trim() : "";
  const xPct = typeof body?.xPct === "number" ? body.xPct : null;
  const yPct = typeof body?.yPct === "number" ? body.yPct : null;
  const lat = typeof body?.lat === "number" ? body.lat : null;
  const lng = typeof body?.lng === "number" ? body.lng : null;
  const radiusMeters = typeof body?.radiusMeters === "number" ? body.radiusMeters : null;
  const puzzleInput = validatePuzzleInput(body?.puzzle);
  const imageUrl =
    typeof body?.puzzle?.imageUrl === "string" && body.puzzle.imageUrl ? body.puzzle.imageUrl : null;

  const hasImagePosition = xPct !== null && yPct !== null;
  const hasMapPosition = lat !== null && lng !== null && radiusMeters !== null;

  if (!setId || !floorId || !roomName || !puzzleInput || (!hasImagePosition && !hasMapPosition)) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const hotspotsRef = adminDb().collection("hotspots");
  const countSnap = await hotspotsRef.where("setId", "==", setId).count().get();
  const number = countSnap.data().count + 1;

  const hotspotId = generateId();
  const puzzleId = generateId();

  const hotspot: Hotspot = {
    id: hotspotId,
    setId,
    number,
    floorId,
    roomName,
    xPct,
    yPct,
    lat,
    lng,
    radiusMeters,
    puzzleId,
  };
  const puzzle: Puzzle = {
    id: puzzleId,
    setId,
    hotspotId,
    type: puzzleInput.type,
    question: puzzleInput.question,
    options: puzzleInput.options,
    points: puzzleInput.points,
    imageUrl,
    jigsawSize: puzzleInput.jigsawSize,
  };
  const answer: PuzzleAnswer = {
    correctOptionIndex: puzzleInput.correctOptionIndex,
    correctText: puzzleInput.correctText,
    correctNumber: puzzleInput.correctNumber,
  };

  const batch = adminDb().batch();
  batch.set(hotspotsRef.doc(hotspotId), hotspot);
  batch.set(adminDb().collection("puzzles").doc(puzzleId), puzzle);
  batch.set(adminDb().collection("puzzleAnswers").doc(puzzleId), answer);
  await batch.commit();

  return NextResponse.json({ hotspot, puzzle });
}
