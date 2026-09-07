import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { OrgInvite, Organization } from "@/lib/types";

// Public lookup so the register/login pages can show "you're invited to
// join X" before the visitor even has an account - deliberately returns
// only the org name, nothing else about the invite or the org.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inviteSnap = await adminDb().collection("orgInvites").doc(token).get();
  const invite = inviteSnap.data() as OrgInvite | undefined;
  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ valid: false });
  }

  const orgSnap = await adminDb().collection("organizations").doc(invite.orgId).get();
  const org = orgSnap.data() as Organization | undefined;

  return NextResponse.json({ valid: true, orgName: org?.name ?? invite.orgId });
}
