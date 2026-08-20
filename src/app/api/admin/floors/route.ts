import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import { FLOORS } from "@/lib/floors";
import type { CustomFloor } from "@/lib/types";

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
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const imagePath = typeof body?.imagePath === "string" ? body.imagePath : "";

  if (!setId || !name || !imagePath) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const floorsRef = adminDb().collection("floors");
  const countSnap = await floorsRef.where("setId", "==", setId).count().get();
  const order = FLOORS.length + countSnap.data().count;

  const floorId = generateId();
  const floor: CustomFloor = { id: floorId, setId, name, imagePath, order };
  await floorsRef.doc(floorId).set(floor);

  return NextResponse.json({ floor });
}
