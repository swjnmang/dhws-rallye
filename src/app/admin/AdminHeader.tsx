"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminIdentity } from "@/lib/admin-identity";
import BrandMark from "@/components/BrandMark";

export default function AdminHeader({ title }: { title: string }) {
  const router = useRouter();
  const me = useAdminIdentity();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="bg-ink text-white">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/admin/events" aria-label="Zu den Rallyes">
            <BrandMark tone="dark" size="sm" />
          </Link>
          <nav className="flex items-center gap-1 text-[15px] font-medium">
            <Link
              href="/admin/events"
              className="rounded-md px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Rallyes
            </Link>
            <Link
              href="/admin/help"
              className="rounded-md px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Anleitungen
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {me?.orgName && (
            <Link
              href="/admin/organization"
              className="relative flex items-center gap-2 rounded-md border border-white/25 px-3 py-1.5 text-sm text-slate-200 transition hover:border-white/60 hover:text-white"
            >
              {me.orgName}
              {me.pendingCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-signal px-1 text-xs font-bold text-ink">
                  {me.pendingCount}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Abmelden
          </button>
        </div>
      </div>
      <div className="border-b-2 border-ink bg-white px-6 py-4 text-ink">
        <h1 className="font-display text-2xl font-extrabold uppercase leading-none tracking-wide sm:text-3xl">
          {title}
        </h1>
      </div>
    </header>
  );
}
