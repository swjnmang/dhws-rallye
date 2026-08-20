import type { Floor } from "@/lib/types";

// The school building's floor plans rarely change, so they're checked into
// the repo as static files (public/floors/) instead of uploaded at runtime.
// To update a plan, replace the image file at the same path and redeploy.
export const FLOORS: Floor[] = [
  { id: "eg", name: "Erdgeschoss", imagePath: "/floors/erdgeschoss.png", order: 0 },
  { id: "og1", name: "1. Obergeschoss", imagePath: "/floors/1-og.png", order: 1 },
  { id: "og2", name: "2. Obergeschoss", imagePath: "/floors/2-og.png", order: 2 },
];
