"use client";

import { useState } from "react";
import type { Hotspot, Puzzle, PuzzleType } from "@/lib/types";

type ExistingData = {
  hotspot: Hotspot;
  puzzle: Puzzle;
};

export type Position =
  | { kind: "image"; xPct: number; yPct: number }
  | { kind: "map"; lat: number; lng: number };

const DEFAULT_RADIUS_METERS = 25;

export default function HotspotForm({
  setId,
  floorId,
  position,
  existing,
  onClose,
  onSaved,
  onDeleted,
}: {
  setId: string;
  floorId: string;
  position: Position;
  existing: ExistingData | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [roomName, setRoomName] = useState(existing?.hotspot.roomName ?? "");
  const [type, setType] = useState<PuzzleType>(existing?.puzzle.type ?? "mc");
  const [question, setQuestion] = useState(existing?.puzzle.question ?? "");
  const [options, setOptions] = useState<string[]>(
    existing?.puzzle.options ?? ["", "", "", ""]
  );
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [correctText, setCorrectText] = useState("");
  const [correctNumber, setCorrectNumber] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(
    existing?.hotspot.radiusMeters ?? DEFAULT_RADIUS_METERS
  );
  const [imageUrl, setImageUrl] = useState<string | null>(existing?.puzzle.imageUrl ?? null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMap = existing ? existing.hotspot.lat !== null : position.kind === "map";

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/puzzle-images", { method: "POST", body: formData });
    setUploadingImage(false);
    if (!res.ok) {
      setError("Bild-Upload fehlgeschlagen");
      return;
    }
    const data = await res.json();
    setImageUrl(data.url);
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const cleanedOptions = options.map((o) => o.trim()).filter(Boolean);
    const puzzlePayload =
      type === "mc"
        ? {
            type,
            question,
            options: cleanedOptions,
            correctOptionIndex,
            points: 1,
            imageUrl,
          }
        : type === "number"
        ? { type, question, correctNumber: Number(correctNumber), points: 1, imageUrl }
        : { type, question, correctText, points: 1, imageUrl };

    const positionFields = existing
      ? isMap
        ? { radiusMeters }
        : {}
      : position.kind === "map"
      ? { lat: position.lat, lng: position.lng, radiusMeters }
      : { xPct: position.xPct, yPct: position.yPct };

    const body = existing
      ? { roomName, ...positionFields, puzzle: puzzlePayload }
      : { setId, floorId, roomName, ...positionFields, puzzle: puzzlePayload };

    const url = existing
      ? `/api/admin/stations/${existing.hotspot.id}`
      : `/api/admin/stations`;

    const res = await fetch(url, {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Speichern fehlgeschlagen – bitte Eingaben prüfen");
      return;
    }
    onSaved();
  }

  async function handleDelete() {
    if (!existing) return;
    if (!confirm(`Raum "${existing.hotspot.roomName}" wirklich löschen?`)) return;
    setSaving(true);
    await fetch(`/api/admin/stations/${existing.hotspot.id}`, { method: "DELETE" });
    setSaving(false);
    onDeleted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form
        onSubmit={handleSave}
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">
          {existing
            ? `Raum #${existing.hotspot.number} bearbeiten`
            : "Neuen Raum anlegen"}
        </h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Raumname</label>
          <input
            required
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        {isMap && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Radius, in dem das Rätsel geöffnet werden kann (Meter)
            </label>
            <input
              required
              type="number"
              inputMode="numeric"
              min={5}
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <p className="text-xs text-slate-500">
              GPS ist im Freien meist auf ca. 10–20 m genau – ein kleinerer Radius kann die Gruppen frustrieren.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Rätsel-Typ</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("mc")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                type === "mc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"
              }`}
            >
              Multiple-Choice
            </button>
            <button
              type="button"
              onClick={() => setType("text")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                type === "text" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"
              }`}
            >
              Texteingabe
            </button>
            <button
              type="button"
              onClick={() => setType("number")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                type === "number" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"
              }`}
            >
              Zahl
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Frage</label>
          <textarea
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        {type === "mc" ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Antwortoptionen (richtige markieren)
            </label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={correctOptionIndex === index}
                  onChange={() => setCorrectOptionIndex(index)}
                />
                <input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            ))}
          </div>
        ) : type === "number" ? (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Richtige Zahl</label>
            <input
              required
              type="number"
              inputMode="numeric"
              value={correctNumber}
              onChange={(e) => setCorrectNumber(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Richtige Antwort</label>
            <input
              required
              value={correctText}
              onChange={(e) => setCorrectText(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Bild (optional)</label>
          {imageUrl && (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-32 rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow"
                aria-label="Bild entfernen"
              >
                ✕
              </button>
            </div>
          )}
          <label className="w-fit cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-500">
            {uploadingImage ? "Lädt hoch…" : imageUrl ? "Bild ersetzen" : "Bild hochladen"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              disabled={uploadingImage}
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Speichert…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
            >
              Abbrechen
            </button>
          </div>
          {existing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Löschen
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
