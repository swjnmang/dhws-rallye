"use client";

import { useState } from "react";

export default function AddFloorForm({
  setId,
  onClose,
  onSaved,
}: {
  setId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/puzzle-images", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      setError("Bild-Upload fehlgeschlagen");
      return;
    }
    const data = await res.json();
    setImagePath(data.url);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!imagePath) {
      setError("Bitte zuerst ein Bild hochladen");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setId, name, imagePath }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Speichern fehlgeschlagen");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form
        onSubmit={handleSave}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">Neue Ebene hinzufügen</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Z. B. Turnhalle, Schulhof, 3. Obergeschoss"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">
            Grundriss- oder Kartenbild
          </label>
          {imagePath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePath} alt="" className="h-32 rounded-lg border border-slate-200" />
          )}
          <label className="w-fit cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-500">
            {uploading ? "Lädt hoch…" : imagePath ? "Bild ersetzen" : "Bild hochladen"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              disabled={uploading}
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Speichert…" : "Ebene anlegen"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
