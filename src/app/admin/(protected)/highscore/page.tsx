"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/app/admin/AdminHeader";
import { useAdminIdentity } from "@/lib/admin-identity";
import type { HighscoreEntry } from "@/app/api/admin/highscore/route";

const MEDALS = ["🥇", "🥈", "🥉"];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("de-DE");
}

export default function HighscorePage() {
  const identity = useAdminIdentity();
  const isOwner = identity?.orgRole === "owner";
  const [entries, setEntries] = useState<HighscoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingEntry, setRemovingEntry] = useState<HighscoreEntry | null>(null);
  const [resetting, setResetting] = useState(false);

  function loadEntries() {
    return fetch("/api/admin/highscore")
      .then((res) => res.json())
      .then((data) => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEntries();
  }, []);

  async function handleRemove() {
    if (!removingEntry) return;
    await fetch(`/api/admin/events/${removingEntry.eventId}/groups/${removingEntry.groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiddenFromHighscore: true }),
    });
    setRemovingEntry(null);
    loadEntries();
  }

  async function handleReset() {
    if (!confirm("Wirklich die komplette Highscore-Liste zurücksetzen? Die Ergebnisse der einzelnen Rallyes bleiben erhalten.")) {
      return;
    }
    setResetting(true);
    await fetch("/api/admin/highscore/reset", { method: "POST" });
    setResetting(false);
    loadEntries();
  }

  return (
    <>
      <AdminHeader title="Highscore" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-6 py-10">
        <p className="mb-2 text-center text-sm text-slate-500">
          Alle Gruppen, die eine Rallye vollständig abgeschlossen haben, sortiert nach XP pro Minute.
        </p>
        {loading && <p className="text-center text-slate-500">Lädt…</p>}
        {!loading && entries.length === 0 && (
          <p className="text-center text-slate-500">
            Noch keine Gruppe hat eine Rallye vollständig abgeschlossen.
          </p>
        )}
        {entries.map((entry, index) => (
          <div
            key={entry.groupId}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <span className="w-10 text-2xl">{MEDALS[index] ?? index + 1}</span>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {entry.name}{" "}
                  <span className="text-base font-normal text-slate-400">· {entry.className}</span>
                </p>
                <p className="text-xs text-slate-400">{formatDate(entry.finishedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-mono text-xl font-bold tabular-nums text-emerald-700">
                {entry.xpPerMinute.toFixed(1)} XP/min
              </p>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setRemovingEntry(entry)}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Entfernen
                </button>
              )}
            </div>
          </div>
        ))}

        {isOwner && entries.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="mt-4 self-center text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {resetting ? "Setzt zurück…" : "Highscore-Liste komplett zurücksetzen"}
          </button>
        )}
      </main>

      {removingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">Aus Highscore entfernen?</h2>
            <p className="text-sm text-slate-600">
              „{removingEntry.name}“ ({removingEntry.className}) wird aus der Highscore-Liste
              ausgeblendet. Das Ergebnis bleibt in der Rangliste der jeweiligen Rallye erhalten.
            </p>
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRemove}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
              >
                Entfernen
              </button>
              <button
                type="button"
                onClick={() => setRemovingEntry(null)}
                className="text-sm font-medium text-slate-500 hover:text-slate-900"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
