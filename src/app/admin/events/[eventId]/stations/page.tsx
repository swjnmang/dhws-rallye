"use client";

import { use, useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { FLOORS } from "@/lib/floors";
import AdminHeader from "../../../AdminHeader";
import HotspotForm from "./HotspotForm";
import type { Hotspot, Puzzle } from "@/lib/types";

export default function EventStationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [puzzles, setPuzzles] = useState<Record<string, Puzzle>>({});
  const [selectedFloorId, setSelectedFloorId] = useState(FLOORS[0].id);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingHotspotId, setEditingHotspotId] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "hotspots"), where("setId", "==", eventId));
    return onSnapshot(q, (snap) => setHotspots(snap.docs.map((d) => d.data() as Hotspot)));
  }, [eventId]);

  useEffect(() => {
    const q = query(collection(db, "puzzles"), where("setId", "==", eventId));
    return onSnapshot(q, (snap) => {
      const map: Record<string, Puzzle> = {};
      snap.docs.forEach((d) => {
        const puzzle = d.data() as Puzzle;
        map[puzzle.id] = puzzle;
      });
      setPuzzles(map);
    });
  }, [eventId]);

  const currentFloor = FLOORS.find((f) => f.id === selectedFloorId)!;
  const floorHotspots = hotspots
    .filter((h) => h.floorId === currentFloor.id)
    .sort((a, b) => a.number - b.number);

  const editingHotspot = hotspots.find((h) => h.id === editingHotspotId) ?? null;
  const editingPuzzle = editingHotspot?.puzzleId ? puzzles[editingHotspot.puzzleId] : null;

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPosition({ x: xPct, y: yPct });
  }

  async function handleSaveAsTemplate() {
    const name = prompt("Name der Vorlage:");
    if (!name || !name.trim()) return;
    setSavingTemplate(true);
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), sourceEventId: eventId }),
    });
    setSavingTemplate(false);
    if (res.ok) {
      alert("Vorlage gespeichert – sichtbar unter Events.");
    } else {
      alert("Speichern als Vorlage fehlgeschlagen.");
    }
  }

  return (
    <>
      <AdminHeader title="Rätsel einrichten" />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Klickt auf den Grundriss, um eine neue nummerierte Station anzulegen. Bestehende
            Marker anklicken, um sie zu bearbeiten.
          </p>
          <button
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate || hotspots.length === 0}
            className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:opacity-50"
          >
            {savingTemplate ? "Speichert…" : "Als Vorlage speichern"}
          </button>
        </div>

        <nav className="flex gap-2">
          {FLOORS.map((floor) => (
            <button
              key={floor.id}
              onClick={() => setSelectedFloorId(floor.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                floor.id === selectedFloorId
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {floor.name}
            </button>
          ))}
        </nav>

        <section className="flex flex-col gap-3">
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentFloor.imagePath}
              alt={currentFloor.name}
              onClick={handleImageClick}
              className="w-full cursor-crosshair rounded-lg border border-slate-200"
            />
            {floorHotspots.map((hotspot) => (
              <button
                key={hotspot.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingHotspotId(hotspot.id);
                }}
                style={{ left: `${hotspot.xPct}%`, top: `${hotspot.yPct}%` }}
                className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-md"
                title={hotspot.roomName}
              >
                {hotspot.number}
              </button>
            ))}
          </div>

          <ul className="flex flex-col gap-1">
            {floorHotspots.map((hotspot) => (
              <li key={hotspot.id} className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">#{hotspot.number}</span>{" "}
                {hotspot.roomName}
                {hotspot.puzzleId && puzzles[hotspot.puzzleId] && (
                  <span className="text-slate-400"> — {puzzles[hotspot.puzzleId].question}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>

      {pendingPosition && (
        <HotspotForm
          setId={eventId}
          floorId={currentFloor.id}
          xPct={pendingPosition.x}
          yPct={pendingPosition.y}
          existing={null}
          onClose={() => setPendingPosition(null)}
          onSaved={() => setPendingPosition(null)}
          onDeleted={() => setPendingPosition(null)}
        />
      )}

      {editingHotspot && (
        <HotspotForm
          setId={eventId}
          floorId={editingHotspot.floorId}
          xPct={editingHotspot.xPct}
          yPct={editingHotspot.yPct}
          existing={editingPuzzle ? { hotspot: editingHotspot, puzzle: editingPuzzle } : null}
          onClose={() => setEditingHotspotId(null)}
          onSaved={() => setEditingHotspotId(null)}
          onDeleted={() => setEditingHotspotId(null)}
        />
      )}
    </>
  );
}
