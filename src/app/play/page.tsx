"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { getGroupSession, clearGroupSession, type GroupSession } from "@/lib/session";
import { formatDuration } from "@/lib/format";
import { FLOORS } from "@/lib/floors";
import PuzzleModal from "./PuzzleModal";
import type { RallyEvent, Hotspot, Puzzle, Group } from "@/lib/types";

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<GroupSession | null | undefined>(undefined);

  const [event, setEvent] = useState<RallyEvent | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [puzzles, setPuzzles] = useState<Record<string, Puzzle>>({});
  const [group, setGroup] = useState<Group | null>(null);

  const [selectedFloorId, setSelectedFloorId] = useState<string>(FLOORS[0].id);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  // Date.now() seeds the ticking clock; the interval below keeps it live.
  // eslint-disable-next-line react-hooks/purity
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Reading localStorage must happen after mount (it's unavailable during
    // SSR), so this can't be a lazy useState initializer without a hydration
    // mismatch between server and client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(getGroupSession());
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      router.replace("/join");
    }
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    const eventRef = doc(db, "events", session.eventId);
    const unsub = onSnapshot(eventRef, (snap) => {
      if (!snap.exists()) {
        clearGroupSession();
        router.replace("/join");
        return;
      }
      const data = snap.data() as RallyEvent;
      setEvent(data);
    });
    return unsub;
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    const unsub = onSnapshot(
      collection(db, "events", session.eventId, "hotspots"),
      (snap) => setHotspots(snap.docs.map((d) => d.data() as Hotspot))
    );
    return unsub;
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const unsub = onSnapshot(
      collection(db, "events", session.eventId, "puzzles"),
      (snap) => {
        const map: Record<string, Puzzle> = {};
        snap.docs.forEach((d) => {
          const puzzle = d.data() as Puzzle;
          map[puzzle.id] = puzzle;
        });
        setPuzzles(map);
      }
    );
    return unsub;
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const groupRef = doc(db, "events", session.eventId, "groups", session.groupId);
    const unsub = onSnapshot(groupRef, (snap) => {
      if (snap.exists()) setGroup(snap.data() as Group);
    });
    return unsub;
  }, [session]);

  useEffect(() => {
    if (!group || group.finishedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [group]);

  const totalPuzzles = Object.keys(puzzles).length;
  const solvedCount = group ? Object.keys(group.solved).length : 0;
  const elapsedSeconds = group
    ? ((group.finishedAt ?? now) - group.startedAt) / 1000
    : 0;

  const floorHotspots = useMemo(
    () => hotspots.filter((h) => h.floorId === selectedFloorId),
    [hotspots, selectedFloorId]
  );

  const activeHotspot = hotspots.find((h) => h.id === activeHotspotId) ?? null;
  const activePuzzle = activeHotspot?.puzzleId ? puzzles[activeHotspot.puzzleId] : null;

  async function handleAnswerSubmit(answer: string | number): Promise<boolean> {
    if (!session || !activeHotspot?.puzzleId) return false;
    const res = await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: session.eventId,
        groupId: session.groupId,
        puzzleId: activeHotspot.puzzleId,
        answer,
      }),
    });
    const data = await res.json();
    if (data.correct) setActiveHotspotId(null);
    return !!data.correct;
  }

  if (session === undefined || session === null || !event || !group) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate-500">Lade Rallye…</p>
      </main>
    );
  }

  if (group.finishedAt) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold">Geschafft, {session.groupName}! 🎉</h1>
        <p className="text-slate-600">Ihr habt alle Rätsel gelöst.</p>
        <p className="text-5xl font-mono font-bold tabular-nums">
          {formatDuration(group.totalSeconds ?? elapsedSeconds)}
        </p>
        <p className="text-sm text-slate-500">
          Eure Zeit wurde gespeichert – die Lehrkraft sieht sie live im Ranking.
        </p>
      </main>
    );
  }

  const selectedFloor = FLOORS.find((f) => f.id === selectedFloorId)!;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm text-slate-500">{session.groupName}</p>
          <p className="text-sm font-medium text-slate-700">
            {solvedCount} / {totalPuzzles} Rätsel gelöst
          </p>
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums">
          {formatDuration(elapsedSeconds)}
        </p>
      </header>

      {FLOORS.length > 1 && (
        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2">
          {FLOORS.map((floor) => (
            <button
              key={floor.id}
              onClick={() => setSelectedFloorId(floor.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                floor.id === selectedFloorId
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {floor.name}
            </button>
          ))}
        </nav>
      )}

      <div className="relative flex-1 overflow-auto bg-slate-100">
        <div className="relative mx-auto w-full max-w-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedFloor.imagePath}
            alt={selectedFloor.name}
            className="w-full select-none"
          />
          {floorHotspots.map((hotspot) => {
            const solved = hotspot.puzzleId ? !!group.solved[hotspot.puzzleId] : false;
            return (
              <button
                key={hotspot.id}
                onClick={() => !solved && setActiveHotspotId(hotspot.id)}
                style={{ left: `${hotspot.xPct}%`, top: `${hotspot.yPct}%` }}
                className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-lg font-bold shadow-md ${
                  solved
                    ? "bg-emerald-500 text-white"
                    : "bg-amber-400 text-white animate-pulse"
                }`}
                aria-label={hotspot.roomName}
              >
                {solved ? "✓" : "?"}
              </button>
            );
          })}
        </div>
      </div>

      {activeHotspot && activePuzzle && (
        <PuzzleModal
          roomName={activeHotspot.roomName}
          puzzle={activePuzzle}
          onSubmit={handleAnswerSubmit}
          onClose={() => setActiveHotspotId(null)}
        />
      )}
    </main>
  );
}
