import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "rallye_admin_session";

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET environment variable is not set");
  }
  return secret;
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD environment variable is not set");
  }
  return password === expected;
}

export async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return !!value && value === getSessionSecret();
}

export async function requireAdmin(): Promise<void> {
  const ok = await isAdminRequest();
  if (!ok) {
    throw new AdminAuthError();
  }
}

export class AdminAuthError extends Error {
  constructor() {
    super("Not authorized");
    this.name = "AdminAuthError";
  }
}
