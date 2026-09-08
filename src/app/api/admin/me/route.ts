import { NextResponse } from "next/server";
import { requireAdmin, loadAdminSummary, AdminAuthError } from "@/lib/admin-auth";

// Backs the header's "which org am I in" display (incl. a pending-requests
// badge for owners) and the /admin/organization page's state (none /
// pending / owner / member) - both need to refetch this after their own
// mutations, unlike most other pages which get it for free from the
// protected layout's AdminIdentityProvider instead of calling this route.
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

  const summary = await loadAdminSummary(admin);
  return NextResponse.json(summary);
}
