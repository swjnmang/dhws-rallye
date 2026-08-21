"use client";

import { use, useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { formatDuration } from "@/lib/format";
import AdminHeader from "@/app/admin/AdminHeader";
import type { Group, RallyEvent } from "@/lib/types";

export default function LivePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [event, setEvent] = useState<RallyEvent | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [puzzleCount, setPuzzleCount] = useState(0);
  // Date.now() seeds the ticking clock; the interval below keeps it live.
  // eslint-disable-next-line react-hooks/purity
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    return onSnapshot(doc(db, "events", eventId), (snap) => {
      setEvent(snap.exists() ? (snap.data() as RallyEvent) : null);
    });
  }, [eventId]);

  useEffect(() => {
    return onSnapshot(collection(db, "events", eventId, "groups"), (snap) => {
      setGroups(snap.docs.map((d) => d.data() as Group));
    });
  }, [eventId]);

  useEffect(() => {
    const q = query(collection(db, "puzzles"), where("setId", "==", eventId));
    return onSnapshot(q, (snap) => setPuzzleCount(snap.docs.length));
  }, [eventId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aFinished = a.finishedAt != null;
      const bFinished = b.finishedAt != null;
      if (aFinished && bFinished) return (a.totalSeconds ?? 0) - (b.totalSeconds ?? 0);
      if (aFinished) return -1;
      if (bFinished) return 1;
      const aSolved = Object.keys(a.solved).length;
      const bSolved = Object.keys(b.solved).length;
      if (aSolved !== bSolved) return bSolved - aSolved;
      return a.joinedAt - b.joinedAt;
    });
  }, [groups]);

  return (
    <>
      <AdminHeader title="Live-Übersicht" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
        {sortedGroups.length === 0 && (
          <p className="text-center text-slate-500">Noch keine Gruppen beigetreten.</p>
        )}
        <div className="flex flex-col gap-2">
          {sortedGroups.map((group, index) => {
            const solvedCount = Object.keys(group.solved).length;
            const elapsed = group.finishedAt
              ? group.totalSeconds ?? 0
              : event?.startedAt
              ? (now - event.startedAt) / 1000
              : 0;
            return (
              <div
                key={group.id}
                className={`flex items-center justify-between rounded-xl border px-5 py-4 shadow-sm ${
                  group.finishedAt ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="w-6 text-lg font-bold text-slate-400">{index + 1}</span>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {group.name}{" "}
                      <span className="font-normal text-slate-400">· {group.className}</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {solvedCount} / {puzzleCount} Rätsel
                      {group.finishedAt && " — fertig"}
                    </p>
                  </div>
                </div>
                <p className="font-mono text-xl font-bold tabular-nums">
                  {formatDuration(elapsed)}
                </p>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
