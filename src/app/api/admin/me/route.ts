import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { Organization } from "@/lib/types";

// Backs the header's "which org am I in" display and the owner-only
// "Mitglieder" link - resolved server-side since organizations isn't
// client-readable.
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

  const orgDoc = await adminDb().collection("organizations").doc(admin.orgId).get();
  const org = orgDoc.data() as Organization | undefined;

  return NextResponse.json({
    orgId: admin.orgId,
    orgName: org?.name ?? admin.orgId,
    orgRole: admin.orgRole,
    isSuperAdmin: admin.isSuperAdmin,
  });
}
