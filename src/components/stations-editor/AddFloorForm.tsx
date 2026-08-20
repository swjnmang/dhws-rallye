"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import type { FloorKind } from "@/lib/types";

const DEFAULT_CENTER = { lat: 51.1657, lng: 10.4515 }; // roughly the middle of Germany
const DEFAULT_ZOOM = 19;

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
  const [kind, setKind] = useState<FloorKind>("image");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (kind !== "map" || !mapContainerRef.current || mapRef.current) return;

    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;
        const center = DEFAULT_CENTER;
        const map = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: DEFAULT_ZOOM,
          mapTypeId: "satellite",
        });
        mapRef.current = map;

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            if (cancelled) return;
            map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          });
        }
      })
      .catch((e) => setMapError(e.message));

    return () => {
      cancelled = true;
    };
  }, [kind]);

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
    setError(null);

    let body: Record<string, unknown>;
    if (kind === "image") {
      if (!imagePath) {
        setError("Bitte zuerst ein Bild hochladen");
        return;
      }
      body = { setId, name, kind, imagePath };
    } else {
      const map = mapRef.current;
      if (!map) {
        setError("Karte konnte nicht geladen werden");
        return;
      }
      const center = map.getCenter();
      if (!center) {
        setError("Kartenausschnitt fehlt");
        return;
      }
      body = { setId, name, kind, centerLat: center.lat(), centerLng: center.lng(), zoom: map.getZoom() };
    }

    setSaving(true);
    const res = await fetch("/api/admin/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">Neue Ebene hinzufügen</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Z. B. Turnhalle, Schulhof, Park"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Ebenen-Typ</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setKind("image")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                kind === "image" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"
              }`}
            >
              Bild
            </button>
            <button
              type="button"
              onClick={() => setKind("map")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                kind === "map" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"
              }`}
            >
              Google Maps (Live-GPS)
            </button>
          </div>
        </div>

        {kind === "image" ? (
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
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Kartenausschnitt (verschieben/zoomen, bis der richtige Bereich zu sehen ist)
            </label>
            {mapError ? (
              <p className="text-sm text-red-600">{mapError}</p>
            ) : (
              <div ref={mapContainerRef} className="h-64 w-full rounded-lg border border-slate-200" />
            )}
          </div>
        )}

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
