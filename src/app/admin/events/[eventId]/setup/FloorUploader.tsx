"use client";

import { useRef, useState } from "react";
import { compressImageToDataUrl } from "@/lib/image-compress";
import type { Floor } from "@/lib/types";

export default function FloorUploader({
  eventId,
  order,
  defaultName,
  existingFloor,
}: {
  eventId: string;
  order: number;
  defaultName: string;
  existingFloor: Floor | undefined;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(existingFloor?.name ?? defaultName);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const imageDataUrl = await compressImageToDataUrl(file);
      const res = await fetch(`/api/admin/events/${eventId}/floors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || defaultName, order, imageDataUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Upload fehlgeschlagen");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {existingFloor && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={existingFloor.imagePath}
          alt={existingFloor.name}
          className="max-h-40 w-full rounded-lg border border-slate-200 object-contain"
        />
      )}

      <label className="cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-600 hover:border-slate-500">
        {uploading
          ? "Lädt hoch…"
          : existingFloor
          ? "Grundriss ersetzen"
          : "Grundriss-Bild hochladen"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
