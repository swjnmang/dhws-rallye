import { cookies } from "next/headers";
import { adminAuth, adminDb } from "./firebase-admin";
import type { AppUser } from "./types";

export const ADMIN_COOKIE_NAME = "rallye_admin_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

// The id of the org every pre-existing (pre-multi-tenant) account and all
// new self-registrations land in during Phase 1, before the real org
// picker (join existing / create new) ships.
export const DEFAULT_ORG_ID = "dhws";

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
// finer distinction (to redirect to /admin/pending instead of /admin/login).
export class AdminMembershipError extends AdminAuthError {
  constructor(message = "Konto noch nicht freigeschaltet") {
    super(message);
    this.name = "AdminMembershipError";
  }
}

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

export type AdminIdentity = {
  uid: string;
  email: string;
  orgId: string;
  orgRole: AppUser["orgRole"];
  isSuperAdmin: boolean;
};

// Verifies the session cookie and loads the matching users/{uid} doc.
// Throws AdminAuthError if there's no valid session, AdminMembershipError
// if the session is valid but the account has no active org membership yet.
export async function requireAdmin(): Promise<AdminIdentity> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!sessionCookie) throw new AdminAuthError();

  let uid: string;
  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    throw new AdminAuthError();
  }

  const userDoc = await adminDb().collection("users").doc(uid).get();
  const user = userDoc.data() as AppUser | undefined;
  if (!user || user.membershipStatus !== "active") {
    throw new AdminMembershipError();
  }

  return {
    uid,
    email: user.email,
    orgId: user.orgId,
    orgRole: user.orgRole,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export async function requireSuperAdmin(): Promise<AdminIdentity> {
  const admin = await requireAdmin();
  if (!admin.isSuperAdmin) throw new AdminMembershipError("Kein Super-Admin-Zugriff");
  return admin;
}
