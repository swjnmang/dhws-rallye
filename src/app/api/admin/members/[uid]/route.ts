import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { AppUser } from "@/lib/types";

// Approve or reject a pending join request for the caller's own org - only
// that org's owner may act on it.
export async function PATCH(request: Request, { params }: { params: Promise<{ uid: string }> }) {
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

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
  }

  const { uid } = await params;
  const memberRef = adminDb().collection("users").doc(uid);
  const memberDoc = await memberRef.get();
  const member = memberDoc.data() as AppUser | undefined;
  if (!member || member.orgId !== admin.orgId || member.membershipStatus !== "pending") {
    return NextResponse.json({ error: "Keine offene Beitrittsanfrage gefunden" }, { status: 404 });
  }

  if (action === "approve") {
    await memberRef.set(
      { membershipStatus: "active", approvedAt: Date.now(), approvedByUid: admin.uid },
      { merge: true }
    );
  } else {
    await memberRef.set(
      { orgId: null, orgRole: null, membershipStatus: "none", approvedAt: null, approvedByUid: null },
      { merge: true }
    );
  }

  return NextResponse.json({ ok: true });
}
