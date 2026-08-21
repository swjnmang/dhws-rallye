import { cookies } from "next/headers";
import { adminAuth, adminDb } from "./firebase-admin";
import type { AppUser } from "./types";

export const ADMIN_COOKIE_NAME = "rallye_admin_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

export class AdminAuthError extends Error {
  constructor(message = "Nicht angemeldet") {
    super(message);
    this.name = "AdminAuthError";
  }
}

// Thrown when the Firebase session itself is valid but the account isn't
// allowed to use the admin area yet (no active org membership). Extends
// AdminAuthError so every existing `catch (e) { if (e instanceof
// AdminAuthError) return 401 }` in the API routes keeps rejecting this case
// too without needing to change - only the login-gating layout needs the
// finer distinction (to redirect to /admin/choose-org or /admin/pending
// instead of /admin/login).
export class AdminMembershipError extends AdminAuthError {
  constructor(message = "Konto noch nicht freigeschaltet") {
    super(message);
    this.name = "AdminMembershipError";
  }
}

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

export type VerifiedIdentity = {
  uid: string;
  email: string;
};

// Verifies the session cookie and that the email is confirmed - the bare
// minimum to act as yourself (e.g. create/join an org), independent of
// whether you belong to an org yet. Throws AdminAuthError otherwise.
export async function requireVerifiedUser(): Promise<VerifiedIdentity> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!sessionCookie) throw new AdminAuthError();

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    if (!decoded.email_verified) throw new AdminAuthError();
    return { uid: decoded.uid, email: decoded.email ?? "" };
  } catch (err) {
    if (err instanceof AdminAuthError) throw err;
    throw new AdminAuthError();
  }
}

export type AdminIdentity = {
  uid: string;
  email: string;
  orgId: string;
  orgRole: NonNullable<AppUser["orgRole"]>;
  isSuperAdmin: boolean;
};

// Same as requireVerifiedUser, plus requires an active org membership.
// Throws AdminMembershipError if verified but not (yet) an active member
// of an org.
export async function requireAdmin(): Promise<AdminIdentity> {
  const { uid, email } = await requireVerifiedUser();

  const userDoc = await adminDb().collection("users").doc(uid).get();
  const user = userDoc.data() as AppUser | undefined;
  if (!user || user.membershipStatus !== "active" || !user.orgId || !user.orgRole) {
    throw new AdminMembershipError();
  }

  return { uid, email, orgId: user.orgId, orgRole: user.orgRole, isSuperAdmin: user.isSuperAdmin };
}

export async function requireSuperAdmin(): Promise<AdminIdentity> {
  const admin = await requireAdmin();
  if (!admin.isSuperAdmin) throw new AdminMembershipError("Kein Super-Admin-Zugriff");
  return admin;
}
