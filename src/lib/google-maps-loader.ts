"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let loaderPromise: Promise<void> | null = null;

// The Maps JS API loader is only safe to configure once per page; share a
// single in-flight/resolved promise across every component that needs it.
export function loadGoogleMaps(): Promise<void> {
  if (!loaderPromise) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ist nicht gesetzt"));
    }
    setOptions({ key: apiKey, v: "weekly" });
    loaderPromise = importLibrary("maps").then(() => undefined);
  }
  return loaderPromise;
}
