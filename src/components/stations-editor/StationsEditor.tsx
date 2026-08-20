"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { FLOORS } from "@/lib/floors";
import HotspotForm, { type Position } from "./HotspotForm";
import AddFloorForm from "./AddFloorForm";
import StationsMapView from "./StationsMapView";
import type { CustomFloor, Hotspot, Puzzle } from "@/lib/types";

// Shared by the per-event editor (/admin/events/[eventId]/stations) and the
// template editor (/admin/templates/[templateId]/stations) - both are just
// "edit the stations for this setId", they only differ in page chrome.
export default function StationsEditor({
  setId,
  extraHeaderActions,
}: {
  setId: string;
  extraHeaderActions?: React.ReactNode;
}) {
  const [customFloors, setCustomFloors] = useState<CustomFloor[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [puzzles, setPuzzles] = useState<Record<string, Puzzle>>({});
  const [selectedFloorId, setSelectedFloorId] = useState(FLOORS[0].id);
  const [pendingPosition, setPendingPosition] = useState<Position | null>(null);
  const [editingHotspotId, setEditingHotspotId] = useState<string | null>(null);
  const [addingFloor, setAddingFloor] = useState(false);
  const [draggedFloorId, setDraggedFloorId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "floors"), where("setId", "==", setId));
    return onSnapshot(q, (snap) => setCustomFloors(snap.docs.map((d) => d.data() as CustomFloor)));
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

  const allFloors = useMemo(
    () => [...FLOORS, ...customFloors].sort((a, b) => a.order - b.order),
    [customFloors]
  );
  const sortedCustomFloors = useMemo(
    () => [...customFloors].sort((a, b) => a.order - b.order),
    [customFloors]
  );

  const currentFloor = allFloors.find((f) => f.id === selectedFloorId) ?? allFloors[0];
  const currentCustomFloor = customFloors.find((f) => f.id === currentFloor?.id) ?? null;
  const floorHotspots = hotspots
    .filter((h) => h.floorId === currentFloor?.id)
    .sort((a, b) => a.number - b.number);

  const editingHotspot = hotspots.find((h) => h.id === editingHotspotId) ?? null;
  const editingPuzzle = editingHotspot?.puzzleId ? puzzles[editingHotspot.puzzleId] : null;
  const editingPosition: Position | null = editingHotspot
    ? editingHotspot.lat !== null
      ? { kind: "map", lat: editingHotspot.lat, lng: editingHotspot.lng! }
      : { kind: "image", xPct: editingHotspot.xPct!, yPct: editingHotspot.yPct! }
    : null;

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPosition({ kind: "image", xPct, yPct });
  }

  async function handleDeleteFloor() {
    if (!currentCustomFloor) return;
    if (
      !confirm(
        `Ebene "${currentCustomFloor.name}" wirklich löschen? Alle Räume/Rätsel darauf werden mitgelöscht.`
      )
    )
      return;
    await fetch(`/api/admin/floors/${currentCustomFloor.id}`, { method: "DELETE" });
    setSelectedFloorId(FLOORS[0].id);
  }

  async function persistFloorOrder(floorId: string, order: number) {
    await fetch(`/api/admin/floors/${floorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
  }

  // Computes an order value for a floor being inserted at `insertBeforeIndex`
  // into `list` (which no longer contains the floor being moved), as the
  // midpoint between its new neighbors. This lets a custom floor land
  // anywhere in the full sequence - including before the fixed base floors,
  // whose order (0/1/2) never changes - without renumbering everything else.
  function computeInsertOrder(list: (typeof allFloors), insertBeforeIndex: number): number {
    const prev = list[insertBeforeIndex - 1];
    const next = list[insertBeforeIndex];
    if (prev && next) return (prev.order + next.order) / 2;
    if (next) return next.order - 1;
    if (prev) return prev.order + 1;
    return 0;
  }

  async function handleDropFloor(targetFloorId: string) {
    if (!draggedFloorId || draggedFloorId === targetFloorId) return;
    const remaining = allFloors.filter((f) => f.id !== draggedFloorId);
    const insertBeforeIndex = remaining.findIndex((f) => f.id === targetFloorId);
    if (insertBeforeIndex === -1) return;

    const newOrder = computeInsertOrder(remaining, insertBeforeIndex);
    setDraggedFloorId(null);
    await persistFloorOrder(draggedFloorId, newOrder);
  }

  async function handleMoveFloor(floorId: string, direction: -1 | 1) {
    const index = allFloors.findIndex((f) => f.id === floorId);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= allFloors.length) return;

    const remaining = allFloors.filter((f) => f.id !== floorId);
    const targetFloor = allFloors[swapIndex];
    const targetIndexInRemaining = remaining.findIndex((f) => f.id === targetFloor.id);
    const insertBeforeIndex = direction === -1 ? targetIndexInRemaining : targetIndexInRemaining + 1;

    const newOrder = computeInsertOrder(remaining, insertBeforeIndex);
    await persistFloorOrder(floorId, newOrder);
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Klickt auf den Grundriss bzw. die Karte, um eine neue nummerierte Station anzulegen.
            Bestehende Marker anklicken, um sie zu bearbeiten.
          </p>
          {extraHeaderActions}
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {allFloors.map((floor, floorIndex) => {
            const isCustom = sortedCustomFloors.some((f) => f.id === floor.id);
            const isBeingDragged = draggedFloorId !== null && draggedFloorId !== floor.id;
            return (
              <div key={floor.id} className="flex items-center gap-0.5">
                {isCustom && (
                  <button
                    type="button"
                    onClick={() => handleMoveFloor(floor.id, -1)}
                    disabled={floorIndex === 0}
                    aria-label="Ebene nach links verschieben"
                    className="rounded-full px-1.5 py-2 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                  >
                    ‹
                  </button>
                )}
                <button
                  draggable={isCustom}
                  onDragStart={() => setDraggedFloorId(floor.id)}
                  onDragOver={(e) => isBeingDragged && e.preventDefault()}
                  onDrop={() => isBeingDragged && handleDropFloor(floor.id)}
                  onDragEnd={() => setDraggedFloorId(null)}
                  onClick={() => setSelectedFloorId(floor.id)}
                  title={isCustom ? "Ziehen oder Pfeile nutzen, um die Reihenfolge zu ändern" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    isCustom ? "cursor-grab active:cursor-grabbing" : ""
                  } ${draggedFloorId === floor.id ? "opacity-40" : ""} ${
                    floor.id === selectedFloorId
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {floor.name}
                  {floor.kind === "map" && " 📍"}
                </button>
                {isCustom && (
                  <button
                    type="button"
                    onClick={() => handleMoveFloor(floor.id, 1)}
                    disabled={floorIndex === allFloors.length - 1}
                    aria-label="Ebene nach rechts verschieben"
                    className="rounded-full px-1.5 py-2 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                  >
                    ›
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={() => setAddingFloor(true)}
            className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-500"
          >
            + Ebene hinzufügen
          </button>
        </nav>
        {customFloors.length > 1 && (
          <p className="-mt-6 text-xs text-slate-400">
            Tipp: Eigene Ebenen lassen sich per Ziehen (Drag &amp; Drop) neu anordnen.
          </p>
        )}

        {currentFloor && (
          <section className="flex flex-col gap-3">
            {currentCustomFloor && (
              <button
                onClick={handleDeleteFloor}
                className="w-fit text-sm font-medium text-red-600 hover:text-red-800"
              >
                Diese Ebene löschen
              </button>
            )}

            {currentFloor.kind === "map" ? (
              <StationsMapView
                floor={currentFloor as CustomFloor}
                hotspots={floorHotspots}
                onMapClick={(lat, lng) => setPendingPosition({ kind: "map", lat, lng })}
                onMarkerClick={(hotspotId) => setEditingHotspotId(hotspotId)}
              />
            ) : (
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentFloor.imagePath!}
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
            )}

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
        )}
      </main>

      {pendingPosition && currentFloor && (
        <HotspotForm
          setId={setId}
          floorId={currentFloor.id}
          position={pendingPosition}
          existing={null}
          onClose={() => setPendingPosition(null)}
          onSaved={() => setPendingPosition(null)}
          onDeleted={() => setPendingPosition(null)}
        />
      )}

      {editingHotspot && editingPosition && (
        <HotspotForm
          setId={setId}
          floorId={editingHotspot.floorId}
          position={editingPosition}
          existing={editingPuzzle ? { hotspot: editingHotspot, puzzle: editingPuzzle } : null}
          onClose={() => setEditingHotspotId(null)}
          onSaved={() => setEditingHotspotId(null)}
          onDeleted={() => setEditingHotspotId(null)}
        />
      )}

      {addingFloor && (
        <AddFloorForm
          setId={setId}
          onClose={() => setAddingFloor(false)}
          onSaved={() => setAddingFloor(false)}
        />
      )}
    </>
  );
}
