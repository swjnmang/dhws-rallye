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
        <p className="ol-kicker">Lade Rallye…</p>
      </main>
    );
  }

  if (event.status === "draft") {
    return (
      <main className="ol-north flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <span aria-hidden className="ol-flag h-16 w-16 rounded-md border-[3px] border-ink" />
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none">
          Ihr seid bereit, {session.groupName}!
        </h1>
        <p className="text-xl text-slate-700">
          Klasse {session.className} · wartet auf den Start durch die Lehrkraft …
        </p>
        <p className="text-base text-slate-500">
          Diese Seite aktualisiert sich automatisch, sobald es losgeht.
        </p>
      </main>
    );
  }

  if (event.status === "finished") {
    const ranked = sortGroupsByRank(allGroups);
    const ownIndex = ranked.findIndex((g) => g.id === session.groupId);
    return (
      <main className="flex flex-1 flex-col lg:flex-row">
        <aside className="flex flex-col gap-7 bg-ink px-8 py-10 text-white lg:w-[380px] lg:shrink-0 lg:px-10 lg:py-12">
          <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-slate-300">
            Ziel erreicht
          </p>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.92] lg:text-6xl">
            Die Rallye ist vorbei!
          </h1>
          <div className="flex flex-col gap-4 rounded-xl border-2 border-white p-5">
            <p className="text-lg font-semibold">
              {session.groupName} · {session.className}
            </p>
            {ownIndex >= 0 && (
              <p className="flex items-baseline gap-3">
                <span className="font-display text-7xl font-extrabold leading-[0.8] text-amber-300">
                  {ownIndex + 1}.
                </span>
                <span className="text-lg text-slate-300">von {ranked.length} Gruppen</span>
              </p>
            )}
            <dl className="grid grid-cols-3 gap-2">
              <div>
                <dt className="text-sm text-slate-300">Gelöst</dt>
                <dd className="font-display text-3xl font-extrabold">
                  {solvedCount}/{totalPuzzles}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-300">XP</dt>
                <dd className="font-display text-3xl font-extrabold">{group.xp ?? 0}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-300">Zeit</dt>
                <dd className="font-display text-3xl font-extrabold tabular-nums">
                  {group.finishedAt ? formatDuration(group.totalSeconds ?? 0) : "–"}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <section className="flex flex-1 flex-col gap-5 px-6 py-10 lg:px-11 lg:py-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-4xl font-extrabold uppercase">Ergebnisliste</h2>
            <p className="text-base text-slate-600">{event.name}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-lg">
              <thead>
                <tr className="border-b-[3px] border-ink text-left">
                  <th className="ol-kicker w-16 px-2 py-2.5">Platz</th>
                  <th className="ol-kicker px-2 py-2.5">Gruppe</th>
                  <th className="ol-kicker px-2 py-2.5">Klasse</th>
                  <th className="ol-kicker px-2 py-2.5 text-right">Gelöst</th>
                  <th className="ol-kicker px-2 py-2.5 text-right">Zeit</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((g, index) => {
                  const isOwn = g.id === session.groupId;
                  const finished = g.finishedAt != null;
                  return (
                    <tr
                      key={g.id}
                      className={`h-15 border-b border-slate-200 ${isOwn ? "bg-signal-soft" : ""}`}
                    >
                      <td
                        className={`px-2 font-display text-2xl font-extrabold ${
                          index < 3 ? "text-course" : ""
                        }`}
                      >
                        {index + 1}.
                      </td>
                      <td className="px-2 font-semibold">
                        {g.name} {isOwn && <span className="font-bold text-course">(ihr)</span>}
                      </td>
                      <td className="px-2 text-slate-700">{g.className}</td>
                      <td className="px-2 text-right tabular-nums">
                        {Object.keys(g.solved).length} / {totalPuzzles}
                      </td>
                      <td className="px-2 text-right font-bold tabular-nums">
                        {finished ? formatDuration(g.totalSeconds ?? 0) : "–"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
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
      <main className="ol-north flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10 text-center">
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">
          Los geht&apos;s, {session.groupName}!
        </h1>
        <ul className="flex max-w-lg flex-col gap-3 text-left text-lg text-slate-700">
          <IntroLine icon={<MapIcon />}>Erkundet die Stationen und findet die Rätsel.</IntroLine>
          <IntroLine icon={<ClockIcon />}>
            Die Zeit läuft ab jetzt – je schneller ihr fertig seid, desto besser.
          </IntroLine>
          <IntroLine icon={<StarIcon />}>
            Für jedes gelöste Rätsel gibt es Erfahrungspunkte (XP).
          </IntroLine>
        </ul>
        <button
          onClick={handleStartPlaying}
          className="min-h-17 rounded-xl border-2 border-ink bg-signal px-12 font-display text-3xl font-extrabold uppercase tracking-wide text-ink transition hover:bg-amber-400"
        >
          Los geht&apos;s!
        </button>
      </main>
    );
  }

  if (group.finishedAt) {
    return (
      <>
        <main className="ol-north flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-course text-white">
            <CheckIcon size={40} />
          </span>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-none">
            Geschafft, {session.groupName}!
          </h1>
          <p className="text-xl text-slate-700">Ihr habt alle Rätsel gelöst.</p>
          <p className="font-display text-8xl font-extrabold tabular-nums">
            {formatDuration(group.totalSeconds ?? elapsedSeconds)}
          </p>
          <p className="text-base text-slate-600">
            Eure Zeit wurde gespeichert – die Lehrkraft sieht sie live im Ranking.
          </p>
        </main>

        {showCorrectPopup && <CorrectPopup />}

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
  const isSolved = (hotspot: Hotspot) =>
    hotspot.puzzleId ? !!group.solved[hotspot.puzzleId] : false;
  const sortedFloorHotspots = [...floorHotspots].sort((a, b) => a.number - b.number);
  const floorSolvedCount = floorHotspots.filter(isSolved).length;

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b-2 border-ink bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="ol-kicker truncate">
            {session.groupName} · Klasse {session.className}
          </p>
          <p className="font-display text-2xl font-extrabold leading-none sm:text-[26px]">
            {solvedCount} / {totalPuzzles} Rätsel{" "}
            <span className="text-course">· {group.xp ?? 0} XP</span>
          </p>
        </div>

        <div className="order-3 flex w-full min-w-0 justify-center lg:order-none lg:w-auto lg:flex-1">
          {allFloors.length > 1 && (
            <nav
              aria-label="Stockwerk"
              className="flex max-w-full overflow-x-auto rounded-xl border-2 border-ink"
            >
              {allFloors.map((floor, index) => {
                const onFloor = hotspots.filter((h) => h.floorId === floor.id && h.puzzleId);
                const solvedOnFloor = onFloor.filter(isSolved).length;
                const selected = floor.id === selectedFloor.id;
                return (
                  <button
                    key={floor.id}
                    onClick={() => setSelectedFloorId(floor.id)}
                    aria-pressed={selected}
                    className={`flex min-h-13 shrink-0 items-center gap-2 px-5 text-[17px] font-semibold transition ${
                      index > 0 ? "border-l-2 border-ink" : ""
                    } ${selected ? "bg-ink text-white" : "bg-white text-ink hover:bg-slate-100"}`}
                  >
                    {floor.kind === "map" && <PinIcon />}
                    {floor.name}
                    {onFloor.length > 0 && (
                      <span className={selected ? "text-slate-300" : "text-slate-500"}>
                        {solvedOnFloor}/{onFloor.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        <div className="ml-auto flex flex-col items-end lg:ml-0">
          <span className="ol-kicker">Zeit</span>
          <span className="font-display text-4xl font-extrabold leading-[0.9] tabular-nums sm:text-[44px]">
            {formatDuration(elapsedSeconds)}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="ol-north relative min-w-0 flex-1 overflow-hidden">
          {selectedFloor.kind === "map" ? (
            <PlayMapView
              floor={selectedFloor as CustomFloor}
              hotspots={floorHotspots}
              isSolved={isSolved}
              onOpenHotspot={(hotspotId) => setActiveHotspotId(hotspotId)}
              onPositionUpdate={(lat, lng) => setCurrentPosition({ lat, lng })}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-3 sm:p-5">
              <div className="relative max-h-full max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedFloor.imagePath!}
                  alt={selectedFloor.name}
                  className="block h-auto max-h-full w-auto max-w-full select-none"
                />
                {floorHotspots.map((hotspot) => {
                  const solved = isSolved(hotspot);
                  const active = hotspot.id === activeHotspotId;
                  return (
                    <button
                      key={hotspot.id}
                      onClick={() => !solved && setActiveHotspotId(hotspot.id)}
                      style={{ left: `${hotspot.xPct}%`, top: `${hotspot.yPct}%` }}
                      className={`absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center p-0 font-display text-xl font-extrabold shadow-[0_3px_10px_rgb(27_27_31/0.25)] ${
                        active
                          ? "ol-flag rounded-md border-[3px] border-ink"
                          : solved
                            ? "rounded-full border-4 border-course bg-course text-white"
                            : "rounded-full border-4 border-course bg-white text-course"
                      }`}
                      aria-label={`Rätsel ${hotspot.number}: ${hotspot.roomName}${
                        solved ? ", gelöst" : ""
                      }`}
                    >
                      {active ? null : solved ? <CheckIcon size={22} /> : hotspot.number}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside
          aria-label="Rätselliste"
          className="hidden w-80 shrink-0 flex-col border-l-2 border-ink bg-white lg:flex"
        >
          <div className="flex items-baseline justify-between px-5 pb-2 pt-4">
            <h2 className="truncate font-display text-2xl font-extrabold uppercase">
              {selectedFloor.name}
            </h2>
            <span className="shrink-0 pl-2 text-[15px] text-slate-600">
              {floorSolvedCount} von {floorHotspots.length} gelöst
            </span>
          </div>
          <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
            {sortedFloorHotspots.map((hotspot) => {
              const solved = isSolved(hotspot);
              const active = hotspot.id === activeHotspotId;
              // Auf Live-Karten muss die Gruppe vor Ort sein - dort öffnet nur
              // der Marker auf der Karte das Rätsel (mit Entfernungsprüfung).
              const openable = !solved && selectedFloor.kind !== "map";
              return (
                <li key={hotspot.id}>
                  <button
                    type="button"
                    disabled={!openable}
                    onClick={() => setActiveHotspotId(hotspot.id)}
                    className={`flex min-h-13 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[17px] font-medium text-ink transition enabled:hover:bg-slate-100 ${
                      active ? "bg-signal-soft" : ""
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[3px] border-course font-display text-base font-extrabold ${
                        solved ? "bg-course text-white" : "bg-white text-course"
                      }`}
                    >
                      {hotspot.number}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{hotspot.roomName}</span>
                    <span
                      className={`text-sm font-semibold ${
                        solved ? "text-course" : active ? "text-signal-ink" : "text-slate-500"
                      }`}
                    >
                      {solved ? "gelöst" : "offen"}
                    </span>
                  </button>
                </li>
              );
            })}
            {sortedFloorHotspots.length === 0 && (
              <li className="px-2.5 py-3 text-base text-slate-500">
                Auf diesem Stockwerk gibt es keine Rätsel.
              </li>
            )}
          </ul>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t-2 border-ink px-5 py-3 text-sm text-slate-700">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-course" />
              Gelöst
            </span>
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-[3px] border-course" />
              Offen
            </span>
            <span className="flex items-center gap-2">
              <span className="ol-flag h-4 w-4 rounded-[3px] border-2 border-ink" />
              Geöffnet
            </span>
          </div>
        </aside>
      </div>

      {activeHotspot && activePuzzle && (
        <PuzzleModal
          roomName={activeHotspot.roomName}
          number={activeHotspot.number}
          floorName={allFloors.find((f) => f.id === activeHotspot.floorId)?.name ?? null}
          puzzle={activePuzzle}
          onSubmit={handleAnswerSubmit}
          onClose={() => setActiveHotspotId(null)}
        />
      )}

      {showCorrectPopup && <CorrectPopup />}

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

function CorrectPopup() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4">
      <div
        role="status"
        className="flex flex-col items-center gap-2 rounded-xl border-2 border-ink bg-course px-10 py-7 text-center text-white shadow-xl"
      >
        <CheckIcon size={40} />
        <p className="font-display text-3xl font-extrabold uppercase">Richtig!</p>
        <p className="text-lg font-semibold">Super – eure Antwort war korrekt! + 5 XP</p>
      </div>
    </div>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        className="flex w-full max-w-md flex-col gap-5 rounded-xl border-[3px] border-ink bg-white p-7 text-center shadow-xl"
      >
        <p className="font-display text-sm font-bold uppercase tracking-[0.1em] text-signal-ink">
          Nachricht von der Spielleitung
        </p>
        <p className="text-2xl font-semibold text-ink">{message.text}</p>
        <button
          onClick={onAck}
          disabled={acking}
          className="min-h-14 rounded-xl border-2 border-ink bg-signal px-6 font-display text-2xl font-extrabold uppercase tracking-wide text-ink transition hover:bg-amber-400 disabled:opacity-50"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}

function IntroLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-course text-course">
        {icon}
      </span>
      <span className="pt-1">{children}</span>
    </li>
  );
}

function CheckIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Live-Karte"
    >
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z" />
    </svg>
  );
}
