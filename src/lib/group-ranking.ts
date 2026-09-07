import type { Group } from "./types";

// Finished groups first (fastest time wins), then unfinished groups by
// solved-count (most first), then by join order - shared between the
// teacher's live event view and the student end-of-rally leaderboard so both
// always agree on placement.
export function sortGroupsByRank(groups: Group[]): Group[] {
  return [...groups].sort((a, b) => {
    const aFinished = a.finishedAt != null;
    const bFinished = b.finishedAt != null;
    if (aFinished && bFinished) return (a.totalSeconds ?? 0) - (b.totalSeconds ?? 0);
    if (aFinished) return -1;
    if (bFinished) return 1;
    const aSolved = Object.keys(a.solved).length;
    const bSolved = Object.keys(b.solved).length;
    if (aSolved !== bSolved) return bSolved - aSolved;
    return a.joinedAt - b.joinedAt;
  });
}
