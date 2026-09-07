const STORAGE_KEY = "rallye_group_session";

export type GroupSession = {
  eventId: string;
  groupId: string;
  groupName: string;
  className: string;
  eventName: string;
  // Whether this group has already confirmed the pre-game "Los geht's"
  // explanation screen - shown once per join, not on every page load.
  introSeen?: boolean;
};

export function saveGroupSession(session: GroupSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getGroupSession(): GroupSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GroupSession;
  } catch {
    return null;
  }
}

export function clearGroupSession() {
  localStorage.removeItem(STORAGE_KEY);
}
