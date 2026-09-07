import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { OrgInvite } from "@/lib/types";

// Revokes a pending invite - owner only, scoped to their own org.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
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

  const { inviteId } = await params;
  const inviteRef = adminDb().collection("orgInvites").doc(inviteId);
  const inviteSnap = await inviteRef.get();
  const invite = inviteSnap.data() as OrgInvite | undefined;
  if (!invite || invite.orgId !== admin.orgId) {
    return NextResponse.json({ error: "Einladung nicht gefunden" }, { status: 404 });
  }

  await inviteRef.set({ status: "revoked" }, { merge: true });

  return NextResponse.json({ ok: true });
}
