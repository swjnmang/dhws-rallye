import { NextResponse } from "next/server";
import { requireVerifiedUser, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { AppUser } from "@/lib/types";

// Requests membership in an existing org - lands as "pending" until that
// org's owner approves it on /admin/members.
export async function POST(_request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  let uid: string;
  try {
    const identity = await requireVerifiedUser();
    uid = identity.uid;
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { orgId } = await params;
  const orgDoc = await adminDb().collection("organizations").doc(orgId).get();
  if (!orgDoc.exists) {
    return NextResponse.json({ error: "Organisation nicht gefunden" }, { status: 404 });
  }

  const userRef = adminDb().collection("users").doc(uid);
  const userDoc = await userRef.get();
  const user = userDoc.data() as AppUser | undefined;
  if (user?.membershipStatus === "active") {
    return NextResponse.json({ error: "Du gehörst bereits einer Organisation an" }, { status: 409 });
  }

  await userRef.set(
    {
      orgId,
      orgRole: "member",
      membershipStatus: "pending",
      approvedAt: null,
      approvedByUid: null,
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
