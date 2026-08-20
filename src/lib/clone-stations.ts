import { adminDb } from "@/lib/firebase-admin";
import { generateId } from "@/lib/codes";
import type { CustomFloor, Hotspot, Puzzle, PuzzleAnswer } from "@/lib/types";

// Copies every custom floor/hotspot/puzzle/puzzleAnswer from one setId (an
// event or template) into a brand new set of docs under a new setId. Used
// both for "create event from template" and "save event as template".
export async function cloneStations(fromSetId: string, toSetId: string): Promise<void> {
  const db = adminDb();
  const [floorsSnap, hotspotsSnap, puzzlesSnap] = await Promise.all([
    db.collection("floors").where("setId", "==", fromSetId).get(),
    db.collection("hotspots").where("setId", "==", fromSetId).get(),
    db.collection("puzzles").where("setId", "==", fromSetId).get(),
  ]);

  // Custom floors get new ids, so hotspots placed on them need remapping.
  // Hotspots on one of the 3 fixed base floors (id "eg"/"og1"/"og2") are left
  // as-is since those floors aren't per-set data.
  const floorIdMap = new Map<string, string>();
  const floorBatch = db.batch();
  for (const floorDoc of floorsSnap.docs) {
    const oldFloor = floorDoc.data() as CustomFloor;
    const newFloorId = generateId();
    floorIdMap.set(oldFloor.id, newFloorId);
    const newFloor: CustomFloor = { ...oldFloor, id: newFloorId, setId: toSetId };
    floorBatch.set(db.collection("floors").doc(newFloorId), newFloor);
  }
  if (!floorsSnap.empty) await floorBatch.commit();

  if (hotspotsSnap.empty) return;

  const puzzleAnswerIds = puzzlesSnap.docs.map((d) => d.id);
  const answerSnaps = await Promise.all(
    puzzleAnswerIds.map((id) => db.collection("puzzleAnswers").doc(id).get())
  );
  const answersByPuzzleId = new Map(
    answerSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as PuzzleAnswer])
  );
  const puzzlesByHotspotId = new Map(
    puzzlesSnap.docs.map((d) => [d.data().hotspotId as string, d.data() as Puzzle])
  );

  const batch = db.batch();
  for (const hotspotDoc of hotspotsSnap.docs) {
    const oldHotspot = hotspotDoc.data() as Hotspot;
    const oldPuzzle = puzzlesByHotspotId.get(oldHotspot.id);
    if (!oldPuzzle) continue;

    const newHotspotId = generateId();
    const newPuzzleId = generateId();
    const newFloorId = floorIdMap.get(oldHotspot.floorId) ?? oldHotspot.floorId;

    const newHotspot: Hotspot = {
      ...oldHotspot,
      id: newHotspotId,
      setId: toSetId,
      floorId: newFloorId,
      puzzleId: newPuzzleId,
    };
    const newPuzzle: Puzzle = { ...oldPuzzle, id: newPuzzleId, setId: toSetId, hotspotId: newHotspotId };
    const answer = answersByPuzzleId.get(oldPuzzle.id);

    batch.set(db.collection("hotspots").doc(newHotspotId), newHotspot);
    batch.set(db.collection("puzzles").doc(newPuzzleId), newPuzzle);
    if (answer) {
      batch.set(db.collection("puzzleAnswers").doc(newPuzzleId), answer);
    }
  }
  await batch.commit();
}
