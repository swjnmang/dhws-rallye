import { del } from "@vercel/blob";
import { adminDb } from "@/lib/firebase-admin";

// Cloning a template/event copies the imageUrl string as-is (see
// clone-stations.ts), so the same blob can be referenced by several puzzle
// docs across different events/templates. Only delete it once nothing else
// points at it, otherwise removing one event's puzzle would break the image
// for every other event/template cloned from the same source.
export async function deleteImageIfUnreferenced(
  imageUrl: string,
  excludePuzzleId: string
): Promise<void> {
  const snap = await adminDb()
    .collection("puzzles")
    .where("imageUrl", "==", imageUrl)
    .get();
  const stillReferenced = snap.docs.some((d) => d.id !== excludePuzzleId);
  if (!stillReferenced) {
    await del(imageUrl).catch(() => {});
  }
}
