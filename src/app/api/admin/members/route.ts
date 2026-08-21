import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { AppUser } from "@/lib/types";

// Lists everyone in the caller's own org (active members and pending join
// requests) - only that org's owner may see it.
export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  if (admin.orgRole !== "owner") {
    return NextResponse.json({ error: "Nur der Organisations-Owner darf das sehen" }, { status: 403 });
  }

  const snap = await adminDb()
    .collection("users")
    .where("orgId", "==", admin.orgId)
    .get();
  const members = snap.docs
    .map((d) => d.data() as AppUser)
    .filter((u) => u.membershipStatus !== "none")
    .sort((a, b) => a.createdAt - b.createdAt);

  return NextResponse.json({ members });
}
