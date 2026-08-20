"use client";

import { use, useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import AdminHeader from "../../../AdminHeader";
import FloorUploader from "./FloorUploader";
import HotspotForm from "./HotspotForm";
import type { RallyEvent, Hotspot, Puzzle } from "@/lib/types";

const DEFAULT_FLOOR_NAMES = ["Erdgeschoss", "1. Obergeschoss", "2. Obergeschoss"];

export default function SetupPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [event, setEvent] = useState<RallyEvent | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [puzzles, setPuzzles] = useState<Record<string, Puzzle>>({});
  const [selectedFloorOrder, setSelectedFloorOrder] = useState(0);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingHotspotId, setEditingHotspotId] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(doc(db, "events", eventId), (snap) => {
      setEvent(snap.exists() ? (snap.data() as RallyEvent) : null);
    });
  }, [eventId]);

  useEffect(() => {
    return onSnapshot(collection(db, "events", eventId, "hotspots"), (snap) => {
      setHotspots(snap.docs.map((d) => d.data() as Hotspot));
    });
  }, [eventId]);

  useEffect(() => {
    return onSnapshot(collection(db, "events", eventId, "puzzles"), (snap) => {
      const map: Record<string, Puzzle> = {};
      snap.docs.forEach((d) => {
        const puzzle = d.data() as Puzzle;
        map[puzzle.id] = puzzle;
      });
      setPuzzles(map);
    });
  }, [eventId]);

  if (!event) {
    return (
      <>
        <AdminHeader title="Rätsel einrichten" />
        <main className="p-6 text-slate-500">Lade…</main>
      </>
    );
  }

  const currentFloor = event.floors.find((f) => f.order === selectedFloorOrder);
  const floorHotspots = currentFloor
    ? hotspots.filter((h) => h.floorId === currentFloor.id)
    : [];

  const editingHotspot = hotspots.find((h) => h.id === editingHotspotId) ?? null;
  const editingPuzzle = editingHotspot?.puzzleId ? puzzles[editingHotspot.puzzleId] : null;

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!currentFloor) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPosition({ x: xPct, y: yPct });
  }

  return (
    <>
      <AdminHeader title={`${event.name} – Rätsel einrichten`} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
        <nav className="flex gap-2">
          {DEFAULT_FLOOR_NAMES.map((defaultName, order) => (
            <button
              key={order}
              onClick={() => setSelectedFloorOrder(order)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                order === selectedFloorOrder
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {event.floors.find((f) => f.order === order)?.name ?? defaultName}
            </button>
          ))}
        </nav>

        <FloorUploader
          eventId={eventId}
          order={selectedFloorOrder}
          defaultName={DEFAULT_FLOOR_NAMES[selectedFloorOrder]}
          existingFloor={currentFloor}
        />

        {currentFloor && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">
              Klickt auf den Grundriss, um einen neuen Raum mit Rätsel anzulegen. Bestehende
              Marker anklicken, um sie zu bearbeiten.
            </p>
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
                  {hotspot.roomName.slice(0, 1).toUpperCase()}
                </button>
              ))}
            </div>

            <ul className="flex flex-col gap-1">
              {floorHotspots.map((hotspot) => (
                <li key={hotspot.id} className="text-sm text-slate-600">
                  • {hotspot.roomName}
                  {hotspot.puzzleId && puzzles[hotspot.puzzleId] && (
                    <span className="text-slate-400"> — {puzzles[hotspot.puzzleId].question}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {pendingPosition && currentFloor && (
        <HotspotForm
          eventId={eventId}
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
          eventId={eventId}
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
