import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, SESSION_MAX_AGE_MS, createSessionCookie } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  if (!idToken) {
    return NextResponse.json({ error: "Anmeldung fehlgeschlagen" }, { status: 401 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await createSessionCookie(idToken);
  } catch {
    return NextResponse.json({ error: "Anmeldung fehlgeschlagen" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return response;
}
