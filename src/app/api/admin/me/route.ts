import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { Organization } from "@/lib/types";

// Backs the header's "which org am I in" display and the
// /admin/organization page's state (none / pending / owner / member).
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

  let orgName: string | null = null;
  if (admin.orgId) {
    const orgDoc = await adminDb().collection("organizations").doc(admin.orgId).get();
    const org = orgDoc.data() as Organization | undefined;
    orgName = org?.name ?? admin.orgId;
  }

  return NextResponse.json({
    orgId: admin.orgId,
    orgName,
    orgRole: admin.orgRole,
    membershipStatus: admin.membershipStatus,
    isSuperAdmin: admin.isSuperAdmin,
  });
}
