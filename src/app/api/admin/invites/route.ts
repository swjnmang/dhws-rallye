import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import type { OrgInvite } from "@/lib/types";

// Lists pending invites for the caller's own org - owner only.
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
    return NextResponse.json({ error: "Nur der Organisations-Owner darf das" }, { status: 403 });
  }

  const snap = await adminDb()
    .collection("orgInvites")
    .where("orgId", "==", admin.orgId)
    .where("status", "==", "pending")
    .get();
  const invites = snap.docs
    .map((d) => d.data() as OrgInvite)
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ invites });
}

// Creates a shareable invite link the owner hands out directly (no
// automatic email sending) - reusable by any number of people, each of whom
// joins the org as an active member immediately on registration, skipping
// the normal request-and-approve flow. Stays valid until the owner revokes
// it (see DELETE /api/admin/invites/[inviteId]).
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
  if (admin.orgRole !== "owner" || !admin.orgId) {
    return NextResponse.json({ error: "Nur der Organisations-Owner darf das" }, { status: 403 });
  }

  const id = generateId();
  const invite: OrgInvite = {
    id,
    orgId: admin.orgId,
    createdByUid: admin.uid,
    createdAt: Date.now(),
    status: "pending",
    acceptedByUid: null,
    acceptedAt: null,
    usedCount: 0,
  };
  await adminDb().collection("orgInvites").doc(id).set(invite);

  const origin = new URL(request.url).origin;
  return NextResponse.json({ invite, url: `${origin}/admin/register?invite=${id}` });
}
