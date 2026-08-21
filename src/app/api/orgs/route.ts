import { NextResponse } from "next/server";
import { requireVerifiedUser, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import type { AppUser, Organization } from "@/lib/types";

// List of orgs a verified-but-orgless user can request to join. Deliberately
// its own endpoint rather than an open client-side Firestore read (there is
// no Firestore rule allowing that) - keeps organization names from being
// freely enumerable by anyone who isn't at least a logged-in, verified user.
export async function GET() {
  try {
    await requireVerifiedUser();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const snap = await adminDb().collection("organizations").orderBy("name").get();
  const orgs = snap.docs.map((d) => {
    const org = d.data() as Organization;
    return { id: org.id, name: org.name };
  });
  return NextResponse.json({ orgs });
}

// Creates a new org and immediately makes the requester its active owner -
// there's no one else who could approve a founder, so this is the one case
// membershipStatus goes straight to "active" without a separate approval.
export async function POST(request: Request) {
  let uid: string;
  let email: string;
  try {
    const identity = await requireVerifiedUser();
    uid = identity.uid;
    email = identity.email;
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  }

  const userRef = adminDb().collection("users").doc(uid);
  const userDoc = await userRef.get();
  const user = userDoc.data() as AppUser | undefined;
  if (user?.membershipStatus === "active") {
    return NextResponse.json({ error: "Du gehörst bereits einer Organisation an" }, { status: 409 });
  }

  const id = generateId();
  const org: Organization = { id, name, createdAt: Date.now(), createdByUid: uid };
  await adminDb().collection("organizations").doc(id).set(org);

  await userRef.set(
    {
      orgId: id,
      orgRole: "owner",
      membershipStatus: "active",
      approvedAt: Date.now(),
      approvedByUid: uid,
      email,
    },
    { merge: true }
  );

  return NextResponse.json({ org });
}
