import { NextResponse } from "next/server";
import { requireSession, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { AppUser, OrgInvite } from "@/lib/types";

// Consumes an invite, joining the caller into that org as an active member
// immediately - skipping the normal request-and-approve flow. Deliberately
// doesn't require email verification (see requireSession): this runs right
// at registration time, before the invitee has clicked their verification
// link, and setting org membership has no effect until they do anyway
// (the protected layout still gates everything else on it).
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  let uid: string;
  try {
    const session = await requireSession();
    uid = session.uid;
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const { token } = await params;
  const inviteRef = adminDb().collection("orgInvites").doc(token);
  const inviteSnap = await inviteRef.get();
  const invite = inviteSnap.data() as OrgInvite | undefined;
  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ error: "Einladung ungültig oder bereits verwendet" }, { status: 404 });
  }

  const userRef = adminDb().collection("users").doc(uid);
  const userSnap = await userRef.get();
  const user = userSnap.data() as AppUser | undefined;
  if (user?.membershipStatus === "active") {
    return NextResponse.json({ error: "Du gehörst bereits einer Organisation an" }, { status: 409 });
  }

  await userRef.set(
    {
      orgId: invite.orgId,
      orgRole: "member",
      membershipStatus: "active",
      approvedAt: Date.now(),
      approvedByUid: invite.createdByUid,
    },
    { merge: true }
  );
  await inviteRef.set(
    { status: "accepted", acceptedByUid: uid, acceptedAt: Date.now() },
    { merge: true }
  );

  return NextResponse.json({ ok: true, orgId: invite.orgId });
}
