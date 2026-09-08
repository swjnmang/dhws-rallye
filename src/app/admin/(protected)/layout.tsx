import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ADMIN_COOKIE_NAME, loadAdminSummary, type AdminSummary } from "@/lib/admin-auth";
import { AdminIdentityProvider } from "@/lib/admin-identity";
import type { AppUser } from "@/lib/types";
import type { DecodedIdToken } from "firebase-admin/auth";

// Gates every route below this segment behind a real login: no session ->
// /admin/login, unverified email -> /admin/verify-email. Org membership is
// not a gate here - it's an optional layer managed from
// /admin/organization, reachable once you're already using the app. Sits
// outside this group so login/register/verify-email themselves don't get
// caught in the same redirect loop.
//
// Also resolves the full AdminSummary (org, role, pending count) once here
// and hands it down via AdminIdentityProvider, so pages/AdminHeader below
// don't each have to re-fetch /api/admin/me on mount - this route already
// pays for a session check on every request, so folding the Firestore
// user/org reads into it is free compared to a second client round trip.
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/admin/login");

  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    redirect("/admin/login");
  }

  if (!decoded.email_verified) redirect("/admin/verify-email");

  const userDoc = await adminDb().collection("users").doc(decoded.uid).get();
  const user = userDoc.data() as AppUser | undefined;

  // No users/{uid} doc should be reachable here in practice (it's created
  // synchronously at registration, before email verification is even
  // possible) - fall back to an "org-less" identity rather than redirecting,
  // matching how the client-side fetch used to degrade on any failure.
  const summary: AdminSummary = user
    ? await loadAdminSummary({
        uid: decoded.uid,
        email: decoded.email ?? "",
        orgId: user.orgId,
        orgRole: user.orgRole,
        membershipStatus: user.membershipStatus,
        isSuperAdmin: user.isSuperAdmin,
      })
    : {
        uid: decoded.uid,
        email: decoded.email ?? "",
        orgId: null,
        orgRole: null,
        membershipStatus: "none",
        isSuperAdmin: false,
        orgName: null,
        pendingCount: 0,
      };

  return <AdminIdentityProvider value={summary}>{children}</AdminIdentityProvider>;
}
