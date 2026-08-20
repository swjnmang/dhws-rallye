import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { validatePuzzleInput } from "@/lib/puzzle-input";
import { deleteBlobIfUnreferenced } from "@/lib/blob-cleanup";
import type { Puzzle, PuzzleAnswer } from "@/lib/types";

type Params = { params: Promise<{ hotspotId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { hotspotId } = await params;
  const body = await request.json().catch(() => null);
  const hotspotRef = adminDb().collection("hotspots").doc(hotspotId);
  const hotspotSnap = await hotspotRef.get();
  if (!hotspotSnap.exists) {
    return NextResponse.json({ error: "Hotspot nicht gefunden" }, { status: 404 });
  }

  const hotspotUpdate: Record<string, unknown> = {};
  if (typeof body?.roomName === "string" && body.roomName.trim()) {
    hotspotUpdate.roomName = body.roomName.trim();
  }
  if (typeof body?.xPct === "number") hotspotUpdate.xPct = body.xPct;
  if (typeof body?.yPct === "number") hotspotUpdate.yPct = body.yPct;

  const batch = adminDb().batch();
  if (Object.keys(hotspotUpdate).length > 0) {
    batch.update(hotspotRef, hotspotUpdate);
  }

  if (body?.puzzle) {
    const puzzleInput = validatePuzzleInput(body.puzzle);
    if (!puzzleInput) {
      return NextResponse.json({ error: "Ungültiges Rätsel" }, { status: 400 });
    }
    const imageUrl =
      typeof body.puzzle.imageUrl === "string" && body.puzzle.imageUrl
        ? body.puzzle.imageUrl
        : null;

    const puzzleId = hotspotSnap.data()?.puzzleId as string;
    const puzzleRef = adminDb().collection("puzzles").doc(puzzleId);
    const puzzleSnap = await puzzleRef.get();
    const previousImageUrl = (puzzleSnap.data() as Puzzle | undefined)?.imageUrl ?? null;
    if (previousImageUrl && previousImageUrl !== imageUrl) {
      await deleteBlobIfUnreferenced("puzzles", "imageUrl", previousImageUrl, puzzleId);
    }

    const puzzleUpdate: Partial<Puzzle> = {
      type: puzzleInput.type,
      question: puzzleInput.question,
      options: puzzleInput.options,
      points: puzzleInput.points,
      imageUrl,
    };
    const answerUpdate: PuzzleAnswer = {
      correctOptionIndex: puzzleInput.correctOptionIndex,
      correctText: puzzleInput.correctText,
      correctNumber: puzzleInput.correctNumber,
    };
    batch.update(puzzleRef, puzzleUpdate);
    batch.set(adminDb().collection("puzzleAnswers").doc(puzzleId), answerUpdate);
  }

  await batch.commit();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { hotspotId } = await params;
  const hotspotRef = adminDb().collection("hotspots").doc(hotspotId);
  const hotspotSnap = await hotspotRef.get();
  if (!hotspotSnap.exists) {
    return NextResponse.json({ error: "Hotspot nicht gefunden" }, { status: 404 });
  }
  const puzzleId = hotspotSnap.data()?.puzzleId as string | null;

  const batch = adminDb().batch();
  batch.delete(hotspotRef);
  if (puzzleId) {
    const puzzleRef = adminDb().collection("puzzles").doc(puzzleId);
    const puzzleSnap = await puzzleRef.get();
    const imageUrl = (puzzleSnap.data() as Puzzle | undefined)?.imageUrl ?? null;
    if (imageUrl) {
      await deleteBlobIfUnreferenced("puzzles", "imageUrl", imageUrl, puzzleId);
    }
    batch.delete(puzzleRef);
    batch.delete(adminDb().collection("puzzleAnswers").doc(puzzleId));
  }
  await batch.commit();

  return NextResponse.json({ ok: true });
}
