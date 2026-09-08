"use client";

import { createContext, useContext } from "react";
import type { AdminSummary } from "./admin-auth";

// Populated once by the protected layout's server-side render (it already
// pays for the session check + Firestore reads to gate the route) and
// handed down here so client components like AdminHeader don't each fire
// their own redundant /api/admin/me round trip on mount.
const AdminIdentityContext = createContext<AdminSummary | null>(null);

export function AdminIdentityProvider({
  value,
  children,
}: {
  value: AdminSummary;
  children: React.ReactNode;
}) {
  return (
    <AdminIdentityContext.Provider value={value}>{children}</AdminIdentityContext.Provider>
  );
}

// Returns null outside the (protected) route group - callers there should
// keep falling back to fetching /api/admin/me themselves (e.g. the
// organization page, which needs to refetch after its own mutations).
export function useAdminIdentity(): AdminSummary | null {
  return useContext(AdminIdentityContext);
}
