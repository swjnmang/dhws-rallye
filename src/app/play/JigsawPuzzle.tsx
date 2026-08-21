"use client";

import { useEffect, useRef, useState } from "react";

// Deterministic per-puzzle shuffle (seeded from puzzleId) so the same group
// sees a stable arrangement across re-renders and reloads instead of a fresh
// shuffle every time the modal opens.
function seededShuffle(n: number, seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  let state = h >>> 0;
  function rand() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // A shuffle that happens to land on the solved order would look broken.
  if (arr.every((v, i) => v === i)) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

// Tap-to-swap rather than drag-and-drop: reliable on the phones/tablets
// students actually use for this, without fighting page scroll gestures.
export default function JigsawPuzzle({
  puzzleId,
  imageUrl,
  gridSize,
  onSolved,
}: {
  puzzleId: string;
  imageUrl: string;
  gridSize: number;
  onSolved: (order: number[]) => void;
}) {
  const total = gridSize * gridSize;
  const [order, setOrder] = useState<number[]>(() => seededShuffle(total, puzzleId));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (solvedRef.current) return;
    if (order.every((v, i) => v === i)) {
      solvedRef.current = true;
      onSolved(order);
    }
  }, [order, onSolved]);

  function handleTileClick(slot: number) {
    if (selectedSlot === null) {
      setSelectedSlot(slot);
      return;
    }
    if (selectedSlot === slot) {
      setSelectedSlot(null);
      return;
    }
    setOrder((prev) => {
      const next = [...prev];
      [next[selectedSlot], next[slot]] = [next[slot], next[selectedSlot]];
      return next;
    });
    setSelectedSlot(null);
  }

  return (
    <div
      className="mt-6 grid gap-1 overflow-hidden rounded-xl border border-slate-300 bg-slate-100"
      style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, aspectRatio: "1 / 1" }}
    >
      {order.map((originalIndex, slot) => {
        const row = Math.floor(originalIndex / gridSize);
        const col = originalIndex % gridSize;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => handleTileClick(slot)}
            aria-label={`Kachel ${slot + 1}`}
            className={`aspect-square bg-slate-200 bg-cover transition ${
              selectedSlot === slot ? "ring-4 ring-inset ring-indigo-500" : ""
            }`}
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
              backgroundPosition:
                gridSize > 1
                  ? `${(col / (gridSize - 1)) * 100}% ${(row / (gridSize - 1)) * 100}%`
                  : "0 0",
            }}
          />
        );
      })}
    </div>
  );
}
