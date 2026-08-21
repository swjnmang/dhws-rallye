import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import type { AppUser } from "@/lib/types";
import type { DecodedIdToken } from "firebase-admin/auth";

// Gates every route below this segment behind a real login: no session ->
// /admin/login, unverified email -> /admin/verify-email, verified but no
// org yet -> /admin/choose-org, org requested but not yet approved ->
// /admin/pending. Sits outside this group so
// login/register/verify-email/choose-org/pending themselves don't get
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

  const userDoc = await adminDb().collection("users").doc(decoded.uid).get();
  const user = userDoc.data() as AppUser | undefined;
  if (!user || user.membershipStatus === "none") redirect("/admin/choose-org");
  if (user.membershipStatus !== "active") redirect("/admin/pending");

  return <>{children}</>;
}
