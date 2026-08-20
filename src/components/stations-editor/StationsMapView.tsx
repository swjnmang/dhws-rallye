"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import type { CustomFloor, Hotspot } from "@/lib/types";

export default function StationsMapView({
  floor,
  hotspots,
  onMapClick,
  onMarkerClick,
}: {
  floor: CustomFloor;
  hotspots: Hotspot[];
  onMapClick: (lat: number, lng: number) => void;
  onMarkerClick: (hotspotId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clickHandlerRef = useRef(onMapClick);
  const markerClickHandlerRef = useRef(onMarkerClick);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clickHandlerRef.current = onMapClick;
    markerClickHandlerRef.current = onMarkerClick;
  }, [onMapClick, onMarkerClick]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: floor.centerLat!, lng: floor.centerLng! },
          zoom: floor.zoom ?? 19,
          mapTypeId: "satellite",
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) clickHandlerRef.current(e.latLng.lat(), e.latLng.lng());
        });
        mapRef.current = map;
      })
      .catch((e) => setError(e.message));

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
    // Only (re)create the map when switching to a different floor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = hotspots
      .filter((h) => h.lat !== null && h.lng !== null)
      .map((h) => {
        const marker = new google.maps.Marker({
          position: { lat: h.lat!, lng: h.lng! },
          map,
          label: { text: String(h.number), color: "white" },
          title: h.roomName,
        });
        marker.addListener("click", () => markerClickHandlerRef.current(h.id));
        return marker;
      });
  }, [hotspots]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return <div ref={containerRef} className="h-96 w-full rounded-lg border border-slate-200" />;
}
