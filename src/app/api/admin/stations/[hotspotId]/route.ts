import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { validatePuzzleInput } from "@/lib/puzzle-input";
import { deleteBlobIfUnreferenced } from "@/lib/blob-cleanup";
import { resolveSetOrgId } from "@/lib/org-scope";
import type { Hotspot, Puzzle, PuzzleAnswer } from "@/lib/types";

type Params = { params: Promise<{ hotspotId: string }> };

// Lets the edit form re-show the previously saved correct answer, which the
// public client SDK can never read directly (see firestore.rules).
export async function GET(_request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { hotspotId } = await params;
  const db = adminDb();
  const hotspotSnap = await db.collection("hotspots").doc(hotspotId).get();
  if (!hotspotSnap.exists) {
    return NextResponse.json({ error: "Hotspot nicht gefunden" }, { status: 404 });
  }
  const hotspot = hotspotSnap.data() as Hotspot;
  const setOrgId = await resolveSetOrgId(hotspot.setId);
  if (!setOrgId || setOrgId !== admin.orgId) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const puzzleId = hotspot.puzzleId;
  if (!puzzleId) {
    return NextResponse.json({ answer: null });
  }
  const answerSnap = await db.collection("puzzleAnswers").doc(puzzleId).get();
  return NextResponse.json({ answer: answerSnap.exists ? (answerSnap.data() as PuzzleAnswer) : null });
}

export async function PATCH(request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
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
  const hotspotData = hotspotSnap.data() as Hotspot;
  const setOrgId = await resolveSetOrgId(hotspotData.setId);
  if (!setOrgId || setOrgId !== admin.orgId) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const hotspotUpdate: Record<string, unknown> = {};
  if (typeof body?.roomName === "string" && body.roomName.trim()) {
    hotspotUpdate.roomName = body.roomName.trim();
  }
  if (typeof body?.xPct === "number") hotspotUpdate.xPct = body.xPct;
  if (typeof body?.yPct === "number") hotspotUpdate.yPct = body.yPct;
  if (typeof body?.radiusMeters === "number") hotspotUpdate.radiusMeters = body.radiusMeters;

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

    const puzzleId = hotspotData.puzzleId as string;
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
      jigsawSize: puzzleInput.jigsawSize,
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
  let admin;
  try {
    admin = await requireAdmin();
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
  const hotspot = hotspotSnap.data() as Hotspot;
  const setOrgId = await resolveSetOrgId(hotspot.setId);
  if (!setOrgId || setOrgId !== admin.orgId) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }
  const puzzleId = hotspot.puzzleId;

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
