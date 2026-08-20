"use client";

import { useRef, useState } from "react";
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

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name || defaultName);
    formData.append("order", String(order));

    const res = await fetch(`/api/admin/events/${eventId}/floors`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    if (!res.ok) setError("Upload fehlgeschlagen");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
