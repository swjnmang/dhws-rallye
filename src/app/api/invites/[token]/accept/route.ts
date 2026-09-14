import { NextResponse } from "next/server";
import { requireSession, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { AppUser, OrgInvite } from "@/lib/types";

// Joins the caller into the invite's org as an active member immediately -
// skipping the normal request-and-approve flow. The invite itself is NOT
// consumed: it stays "pending" (reusable by any number of people) until the
// owner explicitly revokes it - only usedCount/acceptedByUid/acceptedAt are
// updated, purely for the owner's own information.
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
    {
      acceptedByUid: uid,
      acceptedAt: Date.now(),
      usedCount: FieldValue.increment(1),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true, orgId: invite.orgId });
}
