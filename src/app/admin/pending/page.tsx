"use client";

import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">Warte auf Freigabe</h1>
      <p className="max-w-sm text-slate-600">
        Deine E-Mail-Adresse ist bestätigt. Ein Administrator deiner Organisation muss dein Konto noch
        freischalten, bevor du loslegen kannst.
      </p>
      <button
        onClick={handleLogout}
        className="text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        Abmelden
      </button>
    </main>
  );
}
