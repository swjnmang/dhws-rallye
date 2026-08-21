import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type { AppUser } from "@/lib/types";

// Called once, right after Firebase client-side sign-up, to create this
// account's users/{uid} membership doc. Writes stay Admin-SDK-only (same
// pattern as every other mutation in this app) - the client never writes
// Firestore directly, so this route re-verifies the freshly issued ID
// token itself rather than trusting the caller.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName : null;
  if (!idToken) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  let uid: string;
  let email: string;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email ?? "";
  } catch {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const userRef = adminDb().collection("users").doc(uid);
  const existing = await userRef.get();
  if (existing.exists) {
    return NextResponse.json({ error: "Konto existiert bereits" }, { status: 409 });
  }

  // No org yet - the user picks "create new" or "join existing" on
  // /admin/choose-org after verifying their email.
  const user: AppUser = {
    uid,
    email,
    displayName,
    orgId: null,
    orgRole: null,
    membershipStatus: "none",
    isSuperAdmin: false,
    createdAt: Date.now(),
    approvedAt: null,
    approvedByUid: null,
  };
  await userRef.set(user);

  return NextResponse.json({ ok: true });
}
