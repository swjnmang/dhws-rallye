"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { getGroupSession, saveGroupSession, clearGroupSession, type GroupSession } from "@/lib/session";
import { formatDuration } from "@/lib/format";
import { sortGroupsByRank } from "@/lib/group-ranking";
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
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(
    null
  );

  // Starts unset rather than defaulting to FLOORS[0] (the hardcoded base
  // "Erdgeschoss") - the actual first floor to show depends on this event's
  // own floor order, which can put a custom floor (e.g. "Außenbereich")
  // ahead of the base ones. Synced to the real first floor once allFloors
  // is known, below.
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [showCorrectPopup, setShowCorrectPopup] = useState(false);
  const [ackingBroadcast, setAckingBroadcast] = useState(false);
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

  // A back-button press (accidental or not) shouldn't silently drop a group
  // out of the game - their session/progress is untouched either way, but
  // without this it just lands them on a blank join form that looks like
  // they got kicked out. Intercept it with a confirmation instead; "leave"
  // still goes to /join, which itself offers a "Zurück zum Spiel" button
  // for exactly this session.
  useEffect(() => {
    if (!session) return;
    window.history.pushState(null, "", window.location.href);
    function handlePopState() {
      window.history.pushState(null, "", window.location.href);
      const leave = window.confirm(
        "Wollt ihr das Spiel wirklich verlassen? Ihr könnt jederzeit wieder einsteigen."
      );
      if (leave) router.push("/join");
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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

  // customFloors/removedFloorIds both start empty and only fill in once
  // their Firestore listener has fired - these track whether that first
  // snapshot has actually arrived, so the initial-floor effect below
  // doesn't jump the gun and lock onto the base "Erdgeschoss" before an
  // earlier-ordered custom floor (e.g. "Außenbereich") has had a chance to
  // load in.
  const [customFloorsLoaded, setCustomFloorsLoaded] = useState(false);
  const [removedFloorsLoaded, setRemovedFloorsLoaded] = useState(false);

  useEffect(() => {
    if (!session) return;
    const q = query(collection(db, "floors"), where("setId", "==", session.eventId));
    return onSnapshot(q, (snap) => {
      setCustomFloors(snap.docs.map((d) => d.data() as CustomFloor));
      setCustomFloorsLoaded(true);
    });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const q = query(collection(db, "removedFloors"), where("setId", "==", session.eventId));
    return onSnapshot(q, (snap) => {
      setRemovedFloorIds(new Set(snap.docs.map((d) => d.data().floorId as string)));
      setRemovedFloorsLoaded(true);
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

  // Every group in the event, needed for the end-of-rally leaderboard (which
  // ranks all groups, not just this one).
  useEffect(() => {
    if (!session) return;
    const groupsRef = collection(db, "events", session.eventId, "groups");
    return onSnapshot(groupsRef, (snap) => setAllGroups(snap.docs.map((d) => d.data() as Group)));
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

  // Selects the real first floor (leftmost tab) once both floor sources
  // have loaded at least once, but only the first time - after that the
  // group's own tab clicks take over, and this must not fight them if
  // allFloors changes shape later (e.g. a floor gets removed mid-game).
  useEffect(() => {
    if (selectedFloorId || !customFloorsLoaded || !removedFloorsLoaded || allFloors.length === 0) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedFloorId(allFloors[0].id);
  }, [allFloors, selectedFloorId, customFloorsLoaded, removedFloorsLoaded]);

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

  async function handleAnswerSubmit(answer: string | number | number[]): Promise<boolean> {
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

  // Fullscreen must be requested synchronously inside a direct user gesture
  // or browsers silently ignore it - iOS Safari has no Fullscreen API at
  // all (element.requestFullscreen is undefined there), so this is a no-op
  // that leaves it in normal browser mode rather than throwing.
  function handleStartPlaying() {
    if (!session) return;
    const requestFullscreen = document.documentElement.requestFullscreen?.bind(
      document.documentElement
    );
    requestFullscreen?.().catch(() => {});
    const updated: GroupSession = { ...session, introSeen: true };
    saveGroupSession(updated);
    setSession(updated);
  }

  async function handleAckBroadcast(broadcastId: string) {
    if (!session) return;
    setAckingBroadcast(true);
    await fetch("/api/broadcast-ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: session.eventId,
        groupId: session.groupId,
        broadcastId,
      }),
    }).catch(() => {});
    setAckingBroadcast(false);
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

  if (event.status === "finished") {
    const ranked = sortGroupsByRank(allGroups);
    return (
      <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Die Rally ist vorbei! 🏁</h1>
          <p className="mt-1 text-slate-600">Hier ist der Endstand aller Gruppen.</p>
        </div>
        <ol className="flex w-full max-w-md flex-col gap-2">
          {ranked.map((g, index) => {
            const isOwn = g.id === session.groupId;
            const finished = g.finishedAt != null;
            const groupSolvedCount = Object.keys(g.solved).length;
            return (
              <li
                key={g.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                  isOwn ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-bold text-slate-400">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {g.name} {isOwn && <span className="text-emerald-600">(ihr)</span>}
                    </p>
                    <p className="text-xs text-slate-500">Klasse {g.className}</p>
                  </div>
                </div>
                <div className="text-right">
                  {finished ? (
                    <p className="font-mono font-bold tabular-nums">
                      {formatDuration(g.totalSeconds ?? 0)}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {groupSolvedCount} / {totalPuzzles} gelöst
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </main>
    );
  }

  // An unread message blocks play until acknowledged - a fresh broadcast's
  // id won't match what this group last confirmed, even if they'd already
  // acked an earlier one.
  const pendingBroadcast =
    event.broadcastMessage && event.broadcastMessage.id !== (group.ackedBroadcastId ?? null)
      ? event.broadcastMessage
      : null;

  if (!session.introSeen && !group.finishedAt) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-bold">Los geht&apos;s, {session.groupName}! 🚀</h1>
        <div className="flex max-w-md flex-col gap-3 text-left text-slate-600">
          <p>🗺️ Erkundet die Stationen und findet die Rätsel.</p>
          <p>⏱️ Die Zeit läuft ab jetzt – je schneller ihr fertig seid, desto besser.</p>
          <p>⭐ Für jedes gelöste Rätsel gibt es Erfahrungspunkte (XP).</p>
        </div>
        <button
          onClick={handleStartPlaying}
          className="rounded-xl bg-emerald-600 px-8 py-4 text-lg font-semibold text-white"
        >
          Los geht&apos;s!
        </button>
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

        {pendingBroadcast && (
          <BroadcastOverlay
            message={pendingBroadcast}
            acking={ackingBroadcast}
            onAck={() => handleAckBroadcast(pendingBroadcast.id)}
          />
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
          <div className="relative mx-auto w-full overflow-auto">
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

      {pendingBroadcast && (
        <BroadcastOverlay
          message={pendingBroadcast}
          acking={ackingBroadcast}
          onAck={() => handleAckBroadcast(pendingBroadcast.id)}
        />
      )}
    </main>
  );
}

// Sits above everything else (including an open puzzle modal) so the group
// can't keep playing past a message from the host until they confirm it.
function BroadcastOverlay({
  message,
  acking,
  onAck,
}: {
  message: { text: string };
  acking: boolean;
  onAck: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Nachricht von der Spielleitung
        </p>
        <p className="text-lg font-medium text-slate-900">{message.text}</p>
        <button
          onClick={onAck}
          disabled={acking}
          className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
