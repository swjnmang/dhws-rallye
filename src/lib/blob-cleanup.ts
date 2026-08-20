import { del } from "@vercel/blob";
import { adminDb } from "@/lib/firebase-admin";

// Cloning a template/event copies image URLs as-is (see clone-stations.ts),
// so the same blob can end up referenced by several docs across different
// events/templates. Only delete it once nothing else points at it, otherwise
// removing one event's puzzle/floor would break the image for every other
// event/template cloned from the same source.
export async function deleteBlobIfUnreferenced(
  collection: "puzzles" | "floors",
  field: "imageUrl" | "imagePath",
  url: string,
  excludeDocId: string
): Promise<void> {
  const snap = await adminDb().collection(collection).where(field, "==", url).get();
  const stillReferenced = snap.docs.some((d) => d.id !== excludeDocId);
  if (!stillReferenced) {
    await del(url).catch(() => {});
  }
}
