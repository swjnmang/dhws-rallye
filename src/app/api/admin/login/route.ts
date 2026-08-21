import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, SESSION_MAX_AGE_MS, createSessionCookie } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const idToken = typeof body?.idToken === "string" ? body.idToken : "";
    if (!idToken) {
      return NextResponse.json({ error: "Anmeldung fehlgeschlagen" }, { status: 401 });
    }

    const sessionCookie = await createSessionCookie(idToken);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return response;
  } catch (err) {
    // TEMP DIAGNOSTIC - remove after debugging prod 500
    return NextResponse.json(
      { error: "Anmeldung fehlgeschlagen", debug: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
