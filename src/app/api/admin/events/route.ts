import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId, generateJoinCode } from "@/lib/codes";
import type { RallyEvent } from "@/lib/types";

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
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  }

  const eventsRef = adminDb().collection("events");

  let joinCode = generateJoinCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await eventsRef.where("joinCode", "==", joinCode).limit(1).get();
    if (existing.empty) break;
    joinCode = generateJoinCode();
  }

  const id = generateId();
  const event: RallyEvent = {
    id,
    name,
    status: "draft",
    joinCode,
    createdAt: Date.now(),
  };

  await eventsRef.doc(id).set(event);

  return NextResponse.json({ event });
}
