"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type OrgOption = { id: string; name: string };

export default function ChooseOrgPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"choice" | "create" | "join">("choice");
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orgs")
      .then((res) => res.json())
      .then((data) => setOrgs(data.orgs ?? []))
      .finally(() => setLoadingOrgs(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOrgName.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Organisation konnte nicht angelegt werden.");
      return;
    }
    router.push("/admin/events");
    router.refresh();
  }

  async function handleJoin(orgId: string) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/orgs/${orgId}/join`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      setError("Beitrittsanfrage konnte nicht gesendet werden.");
      return;
    }
    router.push("/admin/pending");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold">Organisation wählen</h1>

      {mode === "choice" && (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={() => setMode("create")}
            className="rounded-xl border border-slate-300 bg-white px-5 py-4 text-center font-semibold text-slate-800 shadow-sm transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
          >
            Neue Organisation gründen
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className="rounded-xl border border-slate-300 bg-white px-5 py-4 text-center font-semibold text-slate-800 shadow-sm transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
          >
            Bestehender Organisation beitreten
          </button>
        </div>
      )}

      {mode === "create" && (
        <form onSubmit={handleCreate} className="flex w-full max-w-sm flex-col gap-4">
          <button
            type="button"
            onClick={() => setMode("choice")}
            className="self-start text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Zurück
          </button>
          <input
            autoFocus
            value={newOrgName}
            onChange={(e) => {
              setNewOrgName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Name der Organisation, z. B. Musterschule"
            className="rounded-lg border border-slate-300 px-4 py-3 text-lg"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-6 py-3 text-lg font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Legt an…" : "Organisation gründen"}
          </button>
        </form>
      )}

      {mode === "join" && (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <button
            type="button"
            onClick={() => setMode("choice")}
            className="self-start text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Zurück
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loadingOrgs && <p className="text-center text-slate-500">Lädt…</p>}
          {!loadingOrgs && orgs.length === 0 && (
            <p className="text-center text-sm text-slate-400">
              Es gibt noch keine Organisationen zum Beitreten. Gründe stattdessen eine neue.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {orgs.map((org) => (
              <li
                key={org.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm"
              >
                <span className="font-medium text-slate-800">{org.name}</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleJoin(org.id)}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline disabled:opacity-50"
                >
                  Beitreten
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
