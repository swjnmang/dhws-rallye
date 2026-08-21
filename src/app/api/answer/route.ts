import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { distanceMeters } from "@/lib/geo";
import type { Group, Hotspot, Puzzle, PuzzleAnswer, RallyEvent } from "@/lib/types";

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip diacritics (e -> e, etc.)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const eventId = typeof body?.eventId === "string" ? body.eventId : "";
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";
  const puzzleId = typeof body?.puzzleId === "string" ? body.puzzleId : "";
  const answer = body?.answer;
  const currentLat = typeof body?.lat === "number" ? body.lat : null;
  const currentLng = typeof body?.lng === "number" ? body.lng : null;

  if (!eventId || !groupId || !puzzleId || answer === undefined) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const eventRef = adminDb().collection("events").doc(eventId);
  const groupRef = eventRef.collection("groups").doc(groupId);
  const puzzleRef = adminDb().collection("puzzles").doc(puzzleId);
  const answerRef = adminDb().collection("puzzleAnswers").doc(puzzleId);

  const [groupSnap, puzzleSnap, answerSnap, eventSnap] = await Promise.all([
    groupRef.get(),
    puzzleRef.get(),
    answerRef.get(),
    eventRef.get(),
  ]);

  if (!groupSnap.exists || !puzzleSnap.exists || !answerSnap.exists || !eventSnap.exists) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const group = groupSnap.data() as Group;
  const puzzle = puzzleSnap.data() as Puzzle;
  const correctAnswer = answerSnap.data() as PuzzleAnswer;
  const event = eventSnap.data() as RallyEvent;

  if (group.finishedAt) {
    return NextResponse.json({ correct: true, allSolved: true });
  }
  if (group.solved[puzzleId]) {
    return NextResponse.json({ correct: true, allSolved: false });
  }

  // Map-based stations require the group's tablet to actually be near the
  // hotspot's real-world coordinates - checked server-side too, not just in
  // the browser, so this can't be bypassed via devtools.
  const hotspotSnap = await adminDb().collection("hotspots").doc(puzzle.hotspotId).get();
  const hotspot = hotspotSnap.data() as Hotspot | undefined;
  if (hotspot?.lat !== null && hotspot?.lat !== undefined && hotspot.radiusMeters !== null) {
    if (currentLat === null || currentLng === null) {
      return NextResponse.json({ error: "Standort nicht verfügbar" }, { status: 400 });
    }
    const distance = distanceMeters(currentLat, currentLng, hotspot.lat, hotspot.lng!);
    if (distance > hotspot.radiusMeters) {
      return NextResponse.json({ error: "Ihr seid noch zu weit entfernt", tooFar: true }, { status: 403 });
    }
  }

  let isCorrect = false;
  if (puzzle.type === "mc") {
    isCorrect = typeof answer === "number" && answer === correctAnswer.correctOptionIndex;
  } else if (puzzle.type === "number") {
    isCorrect = typeof answer === "number" && answer === correctAnswer.correctNumber;
  } else if (puzzle.type === "jigsaw") {
    // No secret to protect here - "correct" just means every tile is back
    // in its original slot, which the client already knows how to check.
    const total = (puzzle.jigsawSize ?? 0) ** 2;
    isCorrect =
      Array.isArray(answer) &&
      answer.length === total &&
      answer.every((v, i) => v === i);
  } else {
    isCorrect =
      typeof answer === "string" &&
      correctAnswer.correctText !== null &&
      normalizeText(answer) === normalizeText(correctAnswer.correctText);
  }

  const previousAttempts = group.progress?.[puzzleId]?.attempts ?? 0;
  const attempts = previousAttempts + 1;
  const now = Date.now();

  const update: Record<string, unknown> = {
    [`progress.${puzzleId}.attempts`]: attempts,
  };

  let allSolved = false;

  if (isCorrect) {
    update[`solved.${puzzleId}`] = { solvedAt: now, attempts };
    update.xp = (group.xp ?? 0) + 5;

    const puzzlesCountSnap = await adminDb()
      .collection("puzzles")
      .where("setId", "==", eventId)
      .count()
      .get();
    const totalPuzzles = puzzlesCountSnap.data().count;
    const solvedCount = Object.keys(group.solved).length + 1;

    if (solvedCount >= totalPuzzles) {
      allSolved = true;
      update.finishedAt = now;
      update.totalSeconds = Math.round((now - (event.startedAt ?? now)) / 1000);
    }
  }

  await groupRef.update(update);

  return NextResponse.json({ correct: isCorrect, allSolved });
}
