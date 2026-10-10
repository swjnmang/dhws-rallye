import { NextResponse } from "next/server";
import { requireVerifiedUser, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { AppUser } from "@/lib/types";

// Joins an existing org as an active member immediately - no owner approval
// needed, same as accepting an invite link (see
// /api/invites/[token]/accept). Also doubles as "switch org": a member
// already active elsewhere is simply moved over in this same write, no
// separate /api/orgs/leave call required first - members can freely jump
// between orgs on their own. approvedByUid is the joiner's own uid since
// there's no approver in this flow; kept non-null so the field still means
// "who vouched for this membership" consistently across every path that
// grants it (self, an invite's creator, or an actual approve action).
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

  // Already an active member of this exact org - nothing to do.
  if (user?.membershipStatus === "active" && user.orgId === orgId) {
    return NextResponse.json({ ok: true, orgId });
  }

  // Owners can't switch away directly - that would leave their current org
  // without anyone able to manage it (same restriction /api/orgs/leave
  // enforces). They need to hand the owner role to someone else first.
  if (user?.membershipStatus === "active" && user.orgRole === "owner") {
    return NextResponse.json(
      {
        error:
          "Als Owner kannst du nicht direkt wechseln - übertrage die Owner-Rolle zuerst an ein anderes Mitglied.",
      },
      { status: 409 }
    );
  }

  await userRef.set(
    {
      orgId,
      orgRole: "member",
      membershipStatus: "active",
      approvedAt: Date.now(),
      approvedByUid: uid,
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true, orgId });
}
