import { cookies } from "next/headers";
import { adminAuth, adminDb } from "./firebase-admin";
import type { AppUser, Organization } from "./types";

export const ADMIN_COOKIE_NAME = "rallye_admin_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

export class AdminAuthError extends Error {
  constructor(message = "Nicht angemeldet") {
    super(message);
    this.name = "AdminAuthError";
  }
}

// Extends AdminAuthError so every existing `catch (e) { if (e instanceof
// AdminAuthError) return 401 }` in the API routes keeps rejecting this case
// too without needing to change. Only used for the super-admin check now -
// org membership itself is no longer a gate on using the app.
export class AdminMembershipError extends AdminAuthError {
  constructor(message = "Kein Zugriff") {
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

// Verifies just the session cookie itself, regardless of email-verified
// status - for the handful of actions (e.g. accepting an org invite) that
// need to run at registration time, before the verification email has even
// been clicked. Throws AdminAuthError otherwise.
export async function requireSession(): Promise<VerifiedIdentity> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!sessionCookie) throw new AdminAuthError();

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    return { uid: decoded.uid, email: decoded.email ?? "" };
  } catch {
    throw new AdminAuthError();
  }
}

// Same as requireSession, plus requires the email to be confirmed - the
// bare minimum to act as yourself for everything else.
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
  orgId: string | null;
  orgRole: AppUser["orgRole"];
  membershipStatus: AppUser["membershipStatus"];
  isSuperAdmin: boolean;
};

// Same as requireVerifiedUser, plus loads the users/{uid} doc. Using and
// managing the app (rallies, templates, ...) doesn't require belonging to
// an org - org membership is a separate, optional layer (see
// /admin/organization), not a login gate.
export async function requireAdmin(): Promise<AdminIdentity> {
  const { uid, email } = await requireVerifiedUser();

  const userDoc = await adminDb().collection("users").doc(uid).get();
  const user = userDoc.data() as AppUser | undefined;
  if (!user) throw new AdminAuthError();

  return {
    uid,
    email,
    orgId: user.orgId,
    orgRole: user.orgRole,
    membershipStatus: user.membershipStatus,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export async function requireSuperAdmin(): Promise<AdminIdentity> {
  const admin = await requireAdmin();
  if (!admin.isSuperAdmin) throw new AdminMembershipError("Kein Super-Admin-Zugriff");
  return admin;
}

export type AdminSummary = AdminIdentity & {
  orgName: string | null;
  pendingCount: number;
};

// Adds the org display name and (for owners) the pending-join-request count
// on top of an already-resolved identity - the extra reads /api/admin/me
// and the protected layout both need, kept in one place so they don't drift.
export async function loadAdminSummary(admin: AdminIdentity): Promise<AdminSummary> {
  let orgName: string | null = null;
  let pendingCount = 0;

  if (admin.orgId) {
    const orgDoc = await adminDb().collection("organizations").doc(admin.orgId).get();
    const org = orgDoc.data() as Organization | undefined;
    orgName = org?.name ?? admin.orgId;

    if (admin.orgRole === "owner") {
      const countSnap = await adminDb()
        .collection("users")
        .where("orgId", "==", admin.orgId)
        .where("membershipStatus", "==", "pending")
        .count()
        .get();
      pendingCount = countSnap.data().count;
    }
  }

  return { ...admin, orgName, pendingCount };
}
