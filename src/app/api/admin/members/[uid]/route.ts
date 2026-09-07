import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import type { AppUser } from "@/lib/types";

type Action = "approve" | "reject" | "promote" | "demote" | "remove";
const VALID_ACTIONS: Action[] = ["approve", "reject", "promote", "demote", "remove"];

// Manages one member of the caller's own org - approve/reject a pending
// join request, change an active member's role, or remove them entirely.
// Owner only, and never on yourself (avoids leaving the org ownerless by
// accident, or nobody being able to reverse a self-demotion).
export async function PATCH(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    throw e;
  }

  if (admin.orgRole !== "owner") {
    return NextResponse.json({ error: "Nur der Organisations-Owner darf das" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action as Action | undefined;
  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
  }

  const { uid } = await params;
  if (uid === admin.uid) {
    return NextResponse.json({ error: "Das geht nicht mit dem eigenen Konto" }, { status: 400 });
  }

  const memberRef = adminDb().collection("users").doc(uid);
  const memberDoc = await memberRef.get();
  const member = memberDoc.data() as AppUser | undefined;
  if (!member || member.orgId !== admin.orgId) {
    return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 });
  }

  if (action === "approve" || action === "reject") {
    if (member.membershipStatus !== "pending") {
      return NextResponse.json({ error: "Keine offene Beitrittsanfrage gefunden" }, { status: 404 });
    }
    if (action === "approve") {
      await memberRef.set(
        { membershipStatus: "active", approvedAt: Date.now(), approvedByUid: admin.uid },
        { merge: true }
      );
    } else {
      await memberRef.set(
        { orgId: null, orgRole: null, membershipStatus: "none", approvedAt: null, approvedByUid: null },
        { merge: true }
      );
    }
    return NextResponse.json({ ok: true });
  }

  // promote / demote / remove all act on an existing active member.
  if (member.membershipStatus !== "active") {
    return NextResponse.json({ error: "Kein aktives Mitglied" }, { status: 404 });
  }

  if (action === "promote") {
    if (member.orgRole === "owner") {
      return NextResponse.json({ error: "Ist bereits Owner" }, { status: 409 });
    }
    await memberRef.set({ orgRole: "owner" }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  // demote and remove both need the "don't leave the org ownerless" check.
  if (member.orgRole === "owner") {
    const ownersSnap = await adminDb()
      .collection("users")
      .where("orgId", "==", admin.orgId)
      .where("orgRole", "==", "owner")
      .where("membershipStatus", "==", "active")
      .get();
    if (ownersSnap.size <= 1) {
      return NextResponse.json(
        { error: "Es muss mindestens ein Owner in der Organisation bleiben" },
        { status: 409 }
      );
    }
  }

  if (action === "demote") {
    await memberRef.set({ orgRole: "member" }, { merge: true });
  } else {
    await memberRef.set(
      { orgId: null, orgRole: null, membershipStatus: "none", approvedAt: null, approvedByUid: null },
      { merge: true }
    );
  }

  return NextResponse.json({ ok: true });
}
