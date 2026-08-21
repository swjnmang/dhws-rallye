"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { FLOORS } from "@/lib/floors";
import type { CustomFloor, Hotspot, Puzzle, PuzzleAnswer } from "@/lib/types";

// Read-only view of every room's correct answer for a setId (event or
// template) - used both from the template list ("im Vorlagen-Bereich") and
// from a started rally, where the editable stations editor is no longer
// reachable. Correct answers never reach the public client SDK (see
// firestore.rules), so they're fetched once via the admin-gated API route.
export default function SolutionsView({ setId }: { setId: string }) {
  const [customFloors, setCustomFloors] = useState<CustomFloor[]>([]);
  const [removedFloorIds, setRemovedFloorIds] = useState<Set<string>>(new Set());
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [puzzles, setPuzzles] = useState<Record<string, Puzzle>>({});
  const [answers, setAnswers] = useState<Record<string, PuzzleAnswer>>({});
  const [loadingAnswers, setLoadingAnswers] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "floors"), where("setId", "==", setId));
    return onSnapshot(q, (snap) => setCustomFloors(snap.docs.map((d) => d.data() as CustomFloor)));
  }, [setId]);

  useEffect(() => {
    const q = query(collection(db, "removedFloors"), where("setId", "==", setId));
    return onSnapshot(q, (snap) => {
      setRemovedFloorIds(new Set(snap.docs.map((d) => d.data().floorId as string)));
    });
  }, [setId]);

  useEffect(() => {
    const q = query(collection(db, "hotspots"), where("setId", "==", setId));
    return onSnapshot(q, (snap) => setHotspots(snap.docs.map((d) => d.data() as Hotspot)));
  }, [setId]);

  useEffect(() => {
    const q = query(collection(db, "puzzles"), where("setId", "==", setId));
    return onSnapshot(q, (snap) => {
      const map: Record<string, Puzzle> = {};
      snap.docs.forEach((d) => {
        const puzzle = d.data() as Puzzle;
        map[puzzle.id] = puzzle;
      });
      setPuzzles(map);
    });
  }, [setId]);

  useEffect(() => {
    fetch(`/api/admin/solutions?setId=${setId}`)
      .then((res) => res.json())
      .then((data) => setAnswers(data.answers ?? {}))
      .finally(() => setLoadingAnswers(false));
  }, [setId]);

  const allFloors = useMemo(
    () =>
      [...FLOORS.filter((f) => !removedFloorIds.has(f.id)), ...customFloors].sort(
        (a, b) => a.order - b.order
      ),
    [customFloors, removedFloorIds]
  );

  const floorName = useMemo(() => {
    const map: Record<string, string> = {};
    allFloors.forEach((f) => (map[f.id] = f.name));
    return map;
  }, [allFloors]);

  const sortedHotspots = useMemo(
    () =>
      [...hotspots].sort((a, b) => {
        const floorOrderA = allFloors.findIndex((f) => f.id === a.floorId);
        const floorOrderB = allFloors.findIndex((f) => f.id === b.floorId);
        return floorOrderA - floorOrderB || a.number - b.number;
      }),
    [hotspots, allFloors]
  );

  function formatAnswer(puzzle: Puzzle, answer: PuzzleAnswer | undefined): string {
    if (!answer) return "—";
    if (puzzle.type === "mc") {
      return answer.correctOptionIndex !== null
        ? puzzle.options?.[answer.correctOptionIndex] ?? "—"
        : "—";
    }
    if (puzzle.type === "number") {
      return answer.correctNumber !== null ? String(answer.correctNumber) : "—";
    }
    return answer.correctText ?? "—";
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-6 py-10">
      {sortedHotspots.length === 0 && (
        <p className="text-center text-slate-500">Noch keine Rätsel eingerichtet.</p>
      )}
      {sortedHotspots.map((hotspot) => {
        const puzzle = hotspot.puzzleId ? puzzles[hotspot.puzzleId] : null;
        if (!puzzle) return null;
        return (
          <div
            key={hotspot.id}
            className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-400">
              {floorName[hotspot.floorId] ?? "Unbekannte Ebene"} · #{hotspot.number}{" "}
              {hotspot.roomName}
            </p>
            <p className="text-sm text-slate-700">{puzzle.question}</p>
            <p className="text-sm font-semibold text-emerald-700">
              Lösung: {loadingAnswers ? "…" : formatAnswer(puzzle, answers[puzzle.id])}
            </p>
          </div>
        );
      })}
    </main>
  );
}
