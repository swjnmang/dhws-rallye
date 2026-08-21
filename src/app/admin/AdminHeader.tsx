"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Me = { orgName: string | null; pendingCount: number };

export default function AdminHeader({ title }: { title: string }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMe(data ? { orgName: data.orgName, pendingCount: data.pendingCount } : null))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/events" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          Rallyes
        </Link>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {me?.orgName && (
          <Link
            href="/admin/organization"
            className="relative flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700"
          >
            {me.orgName}
            {me.pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                {me.pendingCount}
              </span>
            )}
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Abmelden
        </button>
      </div>
    </header>
  );
}
