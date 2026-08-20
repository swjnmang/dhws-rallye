"use client";

import { use, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { formatDuration } from "@/lib/format";
import AdminHeader from "../../../AdminHeader";
import type { Group } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ResultsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    return onSnapshot(collection(db, "events", eventId, "groups"), (snap) => {
      setGroups(snap.docs.map((d) => d.data() as Group));
    });
  }, [eventId]);

  const finishedGroups = useMemo(
    () =>
      groups
        .filter((g) => g.finishedAt != null)
        .sort((a, b) => (a.totalSeconds ?? 0) - (b.totalSeconds ?? 0)),
    [groups]
  );

  return (
    <>
      <AdminHeader title="Rangliste" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-6 py-10">
        {finishedGroups.length === 0 && (
          <p className="text-center text-slate-500">
            Noch keine Gruppe hat alle Rätsel gelöst.
          </p>
        )}
        {finishedGroups.map((group, index) => (
          <div
            key={group.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <span className="w-10 text-2xl">{MEDALS[index] ?? index + 1}</span>
              <p className="text-lg font-semibold text-slate-900">
                {group.name}{" "}
                <span className="text-base font-normal text-slate-400">· {group.className}</span>
              </p>
            </div>
            <p className="font-mono text-2xl font-bold tabular-nums">
              {formatDuration(group.totalSeconds ?? 0)}
            </p>
          </div>
        ))}
      </main>
    </>
  );
}
