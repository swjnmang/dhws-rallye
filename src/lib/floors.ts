import type { Floor } from "@/lib/types";

// These 3 base floors (this school's building) rarely change, so they're
// checked into the repo as static files (public/floors/) instead of uploaded
// at runtime. To update a plan, replace the image file at the same path and
// redeploy. Teachers can add further image or live-GPS-map floors per event -
// see the `floors` Firestore collection (CustomFloor type) and
// /admin/.../stations.
export const FLOORS: Floor[] = [
  {
    id: "eg",
    name: "Erdgeschoss",
    order: 0,
    kind: "image",
    imagePath: "/floors/erdgeschoss.png",
    centerLat: null,
    centerLng: null,
    zoom: null,
  },
  {
    id: "og1",
    name: "1. Obergeschoss",
    order: 1,
    kind: "image",
    imagePath: "/floors/1-og.png",
    centerLat: null,
    centerLng: null,
    zoom: null,
  },
  {
    id: "og2",
    name: "2. Obergeschoss",
    order: 2,
    kind: "image",
    imagePath: "/floors/2-og.png",
    centerLat: null,
    centerLng: null,
    zoom: null,
  },
];
