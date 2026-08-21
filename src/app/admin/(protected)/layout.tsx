import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import type { DecodedIdToken } from "firebase-admin/auth";

// Gates every route below this segment behind a real login: no session ->
// /admin/login, unverified email -> /admin/verify-email. Org membership is
// not a gate here - it's an optional layer managed from
// /admin/organization, reachable once you're already using the app. Sits
// outside this group so login/register/verify-email themselves don't get
// caught in the same redirect loop.
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

  return <>{children}</>;
}
