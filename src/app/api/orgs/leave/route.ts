import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";

// Withdraws a pending join request, or leaves an org as an ordinary
// member. Owners can't leave this way - an org always needs one, so
// stepping down/transferring ownership is out of scope for now.
export async function POST() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  if (admin.orgRole === "owner") {
    return NextResponse.json(
      { error: "Als Owner kannst du die Organisation nicht verlassen" },
      { status: 400 }
    );
  }

  await adminDb().collection("users").doc(admin.uid).set(
    { orgId: null, orgRole: null, membershipStatus: "none", approvedAt: null, approvedByUid: null },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
