"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import AdminHeader from "../AdminHeader";
import type { RallyEvent } from "@/lib/types";

const STATUS_LABEL: Record<RallyEvent["status"], string> = {
  draft: "In Vorbereitung",
  active: "Läuft",
  finished: "Beendet",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<RallyEvent[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => d.data() as RallyEvent));
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setCreating(false);
    if (!res.ok) {
      setError("Event konnte nicht erstellt werden");
      return;
    }
    setName("");
  }

  return (
    <>
      <AdminHeader title="Events" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Neues Event, z. B. Klasse 5a"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/admin/events/${event.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-slate-400"
              >
                <div>
                  <p className="font-semibold text-slate-900">{event.name}</p>
                  <p className="text-sm text-slate-500">Code: {event.joinCode}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {STATUS_LABEL[event.status]}
                </span>
              </Link>
            </li>
          ))}
          {events.length === 0 && (
            <p className="text-center text-slate-500">Noch keine Events angelegt.</p>
          )}
        </ul>
      </main>
    </>
  );
}
