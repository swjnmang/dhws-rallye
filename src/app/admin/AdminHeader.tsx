"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminHeader({ title }: { title: string }) {
  const router = useRouter();

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
      <button
        onClick={handleLogout}
        className="text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        Abmelden
      </button>
    </header>
  );
}
