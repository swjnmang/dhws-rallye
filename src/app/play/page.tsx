"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { getGroupSession, clearGroupSession, type GroupSession } from "@/lib/session";
import { formatDuration } from "@/lib/format";
import { FLOORS } from "@/lib/floors";
import PuzzleModal from "./PuzzleModal";
import PlayMapView from "./PlayMapView";
import type { RallyEvent, CustomFloor, Hotspot, Puzzle, Group } from "@/lib/types";

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<GroupSession | null | undefined>(undefined);

  const [event, setEvent] = useState<RallyEvent | null>(null);
  const [customFloors, setCustomFloors] = useState<CustomFloor[]>([]);
  const [removedFloorIds, setRemovedFloorIds] = useState<Set<string>>(new Set());
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [puzzles, setPuzzles] = useState<Record<string, Puzzle>>({});
  const [group, setGroup] = useState<Group | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const [selectedFloorId, setSelectedFloorId] = useState<string>(FLOORS[0].id);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [showCorrectPopup, setShowCorrectPopup] = useState(false);
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
    const q = query(collection(db, "floors"), where("setId", "==", session.eventId));
    return onSnapshot(q, (snap) => setCustomFloors(snap.docs.map((d) => d.data() as CustomFloor)));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const q = query(collection(db, "removedFloors"), where("setId", "==", session.eventId));
    return onSnapshot(q, (snap) => {
      setRemovedFloorIds(new Set(snap.docs.map((d) => d.data().floorId as string)));
    });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const q = query(collection(db, "hotspots"), where("setId", "==", session.eventId));
    return onSnapshot(q, (snap) => setHotspots(snap.docs.map((d) => d.data() as Hotspot)));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const q = query(collection(db, "puzzles"), where("setId", "==", session.eventId));
    return onSnapshot(q, (snap) => {
      const map: Record<string, Puzzle> = {};
      snap.docs.forEach((d) => {
        const puzzle = d.data() as Puzzle;
        map[puzzle.id] = puzzle;
      });
      setPuzzles(map);
    });
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
    if (!group || group.finishedAt || !event?.startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [group, event]);

  useEffect(() => {
    if (!showCorrectPopup) return;
    const timer = setTimeout(() => setShowCorrectPopup(false), 2000);
    return () => clearTimeout(timer);
  }, [showCorrectPopup]);

  const allFloors = useMemo(
    () =>
      [...FLOORS.filter((f) => !removedFloorIds.has(f.id)), ...customFloors].sort(
        (a, b) => a.order - b.order
      ),
    [customFloors, removedFloorIds]
  );

  const totalPuzzles = Object.keys(puzzles).length;
  const solvedCount = group ? Object.keys(group.solved).length : 0;
  const elapsedSeconds =
    group && event?.startedAt ? ((group.finishedAt ?? now) - event.startedAt) / 1000 : 0;

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
        lat: currentPosition?.lat,
        lng: currentPosition?.lng,
      }),
    });
    const data = await res.json();
    if (data.correct) {
      setActiveHotspotId(null);
      setShowCorrectPopup(true);
    }
    return !!data.correct;
  }

  if (session === undefined || session === null || !event || !group) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate-500">Lade Rallye…</p>
      </main>
    );
  }

  if (event.status === "draft") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold">Ihr seid bereit, {session.groupName}! ⏳</h1>
        <p className="text-slate-600">
          Klasse {session.className} · wartet auf den Start durch die Lehrkraft …
        </p>
        <p className="text-sm text-slate-400">
          Diese Seite aktualisiert sich automatisch, sobald es losgeht.
        </p>
      </main>
    );
  }

  if (group.finishedAt) {
    return (
      <>
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

        {showCorrectPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-600 px-8 py-6 text-center shadow-xl">
              <p className="text-xl font-bold text-white">Super – eure Antwort war korrekt!</p>
              <p className="text-lg font-semibold text-white">+ 5 XP</p>
            </div>
          </div>
        )}
      </>
    );
  }

  const selectedFloor = allFloors.find((f) => f.id === selectedFloorId) ?? allFloors[0];

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm text-slate-500">
            {session.groupName} · Klasse {session.className}
          </p>
          <p className="text-sm font-medium text-slate-700">
            {solvedCount} / {totalPuzzles} Rätsel gelöst · {group.xp ?? 0} XP
          </p>
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums">
          {formatDuration(elapsedSeconds)}
        </p>
      </header>

      {allFloors.length > 1 && (
        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2">
          {allFloors.map((floor) => (
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
              {floor.kind === "map" && " 📍"}
            </button>
          ))}
        </nav>
      )}

      <div className="relative flex-1 overflow-hidden bg-slate-100">
        {selectedFloor.kind === "map" ? (
          <PlayMapView
            floor={selectedFloor as CustomFloor}
            hotspots={floorHotspots}
            isSolved={(hotspot) => (hotspot.puzzleId ? !!group.solved[hotspot.puzzleId] : false)}
            onOpenHotspot={(hotspotId) => setActiveHotspotId(hotspotId)}
            onPositionUpdate={(lat, lng) => setCurrentPosition({ lat, lng })}
          />
        ) : (
          <div className="relative mx-auto w-full max-w-3xl overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedFloor.imagePath!}
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
        )}
      </div>

      {activeHotspot && activePuzzle && (
        <PuzzleModal
          roomName={activeHotspot.roomName}
          puzzle={activePuzzle}
          onSubmit={handleAnswerSubmit}
          onClose={() => setActiveHotspotId(null)}
        />
      )}

      {showCorrectPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-600 px-8 py-6 text-center shadow-xl">
            <p className="text-xl font-bold text-white">Super – eure Antwort war korrekt!</p>
            <p className="text-lg font-semibold text-white">+ 5 XP</p>
          </div>
        </div>
      )}
    </main>
  );
}
