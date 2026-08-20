"use client";

import { useState } from "react";
import type { Hotspot, Puzzle, PuzzleType } from "@/lib/types";

type ExistingData = {
  hotspot: Hotspot;
  puzzle: Puzzle;
};

export default function HotspotForm({
  floorId,
  xPct,
  yPct,
  existing,
  onClose,
  onSaved,
  onDeleted,
}: {
  floorId: string;
  xPct: number;
  yPct: number;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          }
        : type === "number"
        ? { type, question, correctNumber: Number(correctNumber), points: 1 }
        : { type, question, correctText, points: 1 };

    const body = existing
      ? { roomName, xPct, yPct, puzzle: puzzlePayload }
      : { floorId, roomName, xPct, yPct, puzzle: puzzlePayload };

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
