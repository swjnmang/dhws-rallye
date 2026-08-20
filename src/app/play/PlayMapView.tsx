"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { distanceMeters } from "@/lib/geo";
import type { CustomFloor, Hotspot } from "@/lib/types";

export default function PlayMapView({
  floor,
  hotspots,
  isSolved,
  onOpenHotspot,
  onPositionUpdate,
}: {
  floor: CustomFloor;
  hotspots: Hotspot[];
  isSolved: (hotspot: Hotspot) => boolean;
  onOpenHotspot: (hotspotId: string) => void;
  onPositionUpdate: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const meMarkerRef = useRef<google.maps.Marker | null>(null);
  const hotspotMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);
  const hotspotsRef = useRef<Hotspot[]>(hotspots);
  const isSolvedRef = useRef(isSolved);
  const onOpenRef = useRef(onOpenHotspot);

  const [error, setError] = useState<string | null>(null);
  const [tooFarMessage, setTooFarMessage] = useState<string | null>(null);
  const onPositionUpdateRef = useRef(onPositionUpdate);

  useEffect(() => {
    hotspotsRef.current = hotspots;
    isSolvedRef.current = isSolved;
    onOpenRef.current = onOpenHotspot;
    onPositionUpdateRef.current = onPositionUpdate;
  }, [hotspots, isSolved, onOpenHotspot, onPositionUpdate]);

  function handleHotspotClick(hotspot: Hotspot) {
    if (isSolvedRef.current(hotspot)) return;
    const pos = positionRef.current;
    if (!pos || hotspot.lat === null || hotspot.lng === null) {
      setTooFarMessage("Standort wird noch ermittelt …");
      setTimeout(() => setTooFarMessage(null), 2500);
      return;
    }
    const distance = distanceMeters(pos.lat, pos.lng, hotspot.lat, hotspot.lng);
    if (distance > (hotspot.radiusMeters ?? 25)) {
      setTooFarMessage(`Noch ca. ${Math.round(distance)} m entfernt – kommt näher heran!`);
      setTimeout(() => setTooFarMessage(null), 2500);
      return;
    }
    onOpenRef.current(hotspot.id);
  }

  // Create the map once per floor.
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const markers = hotspotMarkersRef.current;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: floor.centerLat!, lng: floor.centerLng! },
          zoom: floor.zoom ?? 19,
          mapTypeId: "satellite",
          disableDefaultUI: true,
          zoomControl: true,
        });
        mapRef.current = map;
      })
      .catch((e) => setError(e.message));

    return () => {
      cancelled = true;
      markers.forEach((m) => m.setMap(null));
      markers.clear();
      meMarkerRef.current?.setMap(null);
      meMarkerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor.id]);

  // Keep hotspot markers in sync (colored by solved state).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    hotspotMarkersRef.current.forEach((m) => m.setMap(null));
    hotspotMarkersRef.current.clear();
    hotspots.forEach((hotspot) => {
      if (hotspot.lat === null || hotspot.lng === null) return;
      const solved = isSolved(hotspot);
      const marker = new google.maps.Marker({
        position: { lat: hotspot.lat, lng: hotspot.lng },
        map,
        label: { text: solved ? "✓" : "?", color: "white", fontWeight: "bold" },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: solved ? "#10b981" : "#f59e0b",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        },
        title: hotspot.roomName,
      });
      marker.addListener("click", () => handleHotspotClick(hotspot));
      hotspotMarkersRef.current.set(hotspot.id, marker);
    });
  }, [hotspots, isSolved]);

  // Live GPS tracking.
  useEffect(() => {
    if (!navigator.geolocation) {
      // One-off capability check on mount, not a subscription callback -
      // there's no external event to hang this off of.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Standortbestimmung wird von diesem Gerät nicht unterstützt");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        positionRef.current = point;
        onPositionUpdateRef.current(point.lat, point.lng);
        const map = mapRef.current;
        if (!map) return;
        if (!meMarkerRef.current) {
          meMarkerRef.current = new google.maps.Marker({
            position: point,
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 3,
            },
            zIndex: 999,
            title: "Euer Standort",
          });
        } else {
          meMarkerRef.current.setPosition(point);
        }
      },
      () => setError("Standortzugriff verweigert – bitte in den Geräteeinstellungen erlauben"),
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div className="relative h-full w-full">
      {error && (
        <p className="absolute inset-x-0 top-0 z-10 bg-red-600 px-4 py-2 text-center text-sm text-white">
          {error}
        </p>
      )}
      {tooFarMessage && (
        <p className="absolute inset-x-0 top-0 z-10 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          {tooFarMessage}
        </p>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
