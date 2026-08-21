import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import { FLOORS } from "@/lib/floors";
import { resolveSetOrgId } from "@/lib/org-scope";
import type { CustomFloor } from "@/lib/types";

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const body = await request.json().catch(() => null);
  const setId = typeof body?.setId === "string" ? body.setId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const kind = body?.kind === "map" ? "map" : body?.kind === "image" ? "image" : "";

  if (!setId || !name || !kind) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const setOrgId = await resolveSetOrgId(setId);
  if (!setOrgId || setOrgId !== admin.orgId) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  let floor: CustomFloor;
  const floorId = generateId();

  if (kind === "image") {
    const imagePath = typeof body?.imagePath === "string" ? body.imagePath : "";
    if (!imagePath) {
      return NextResponse.json({ error: "Bild fehlt" }, { status: 400 });
    }
    floor = {
      id: floorId,
      setId,
      name,
      order: 0,
      kind: "image",
      imagePath,
      centerLat: null,
      centerLng: null,
      zoom: null,
    };
  } else {
    const centerLat = typeof body?.centerLat === "number" ? body.centerLat : null;
    const centerLng = typeof body?.centerLng === "number" ? body.centerLng : null;
    const zoom = typeof body?.zoom === "number" ? body.zoom : null;
    if (centerLat === null || centerLng === null || zoom === null) {
      return NextResponse.json({ error: "Kartenausschnitt fehlt" }, { status: 400 });
    }
    floor = {
      id: floorId,
      setId,
      name,
      order: 0,
      kind: "map",
      imagePath: null,
      centerLat,
      centerLng,
      zoom,
    };
  }

  const floorsRef = adminDb().collection("floors");
  const countSnap = await floorsRef.where("setId", "==", setId).count().get();
  floor.order = FLOORS.length + countSnap.data().count;

  await floorsRef.doc(floorId).set(floor);

  return NextResponse.json({ floor });
}
