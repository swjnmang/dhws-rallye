"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/app/admin/AdminHeader";
import type { HighscoreEntry } from "@/app/api/admin/highscore/route";

const MEDALS = ["🥇", "🥈", "🥉"];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("de-DE");
}

export default function HighscorePage() {
  const [entries, setEntries] = useState<HighscoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/highscore")
      .then((res) => res.json())
      .then((data) => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }, []);

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
            <p className="font-mono text-xl font-bold tabular-nums text-emerald-700">
              {entry.xpPerMinute.toFixed(1)} XP/min
            </p>
          </div>
        ))}
      </main>
    </>
  );
}
