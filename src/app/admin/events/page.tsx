"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import AdminHeader from "../AdminHeader";
import type { RallyEvent, Template } from "@/lib/types";

const STATUS_LABEL: Record<RallyEvent["status"], string> = {
  draft: "In Vorbereitung",
  active: "Läuft",
  finished: "Beendet",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<RallyEvent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => d.data() as RallyEvent));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "templates"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setTemplates(snap.docs.map((d) => d.data() as Template));
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
      body: JSON.stringify({ name, templateId: templateId || undefined }),
    });
    setCreating(false);
    if (!res.ok) {
      setError("Event konnte nicht erstellt werden");
      return;
    }
    setName("");
    setTemplateId("");
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Diese Vorlage wirklich löschen?")) return;
    await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
  }

  return (
    <>
      <AdminHeader title="Events" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Neues Event, z. B. Klasse 5a"
            className="rounded-lg border border-slate-300 px-4 py-2"
          />
          <div className="flex gap-3">
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              <option value="">Ohne Vorlage – von Grund auf neu</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  Vorlage: {t.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              Anlegen
            </button>
          </div>
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

        {templates.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-500">Vorlagen</h2>
            <ul className="flex flex-col gap-2">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm"
                >
                  <span className="font-medium text-slate-800">{t.name}</span>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Löschen
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
