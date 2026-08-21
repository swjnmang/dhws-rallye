"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminHeader({ title }: { title: string }) {
  const router = useRouter();
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOrgName(data?.orgName ?? null))
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
        {orgName && <span className="text-sm text-slate-400">{orgName}</span>}
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
