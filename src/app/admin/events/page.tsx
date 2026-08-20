"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import AdminHeader from "../AdminHeader";
import ConfirmDeleteByName from "@/components/ConfirmDeleteByName";
import type { RallyEvent, Template } from "@/lib/types";

const STATUS_LABEL: Record<RallyEvent["status"], string> = {
  draft: "In Vorbereitung",
  active: "Läuft",
  finished: "Beendet",
};

type CreateMode = "choice" | "scratch" | "template";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<RallyEvent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mode, setMode] = useState<CreateMode>("choice");
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);

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

  // Auto-close is enforced server-side (an event older than 24h flips to
  // "finished" the next time anything touches it), but nudge that check
  // whenever a teacher opens this list too, so the split below stays fresh
  // without waiting for a group or admin action to trigger it elsewhere.
  useEffect(() => {
    fetch("/api/admin/events/close-stale", { method: "POST" }).catch(() => {});
  }, []);

  function resetToChoice() {
    setMode("choice");
    setName("");
    setTemplateId("");
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Bitte einen Namen für die Rallye eingeben.");
      return;
    }
    if (mode === "template" && !templateId) {
      setError("Bitte eine Vorlage auswählen.");
      return;
    }
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, templateId: mode === "template" ? templateId : undefined }),
    });
    setCreating(false);
    if (!res.ok) {
      setError("Rallye konnte nicht erstellt werden");
      return;
    }
    resetToChoice();
  }

  async function handleDeleteTemplate() {
    if (!deletingTemplate) return;
    await fetch(`/api/admin/templates/${deletingTemplate.id}`, { method: "DELETE" });
    setDeletingTemplate(null);
  }

  const openEvents = events.filter((e) => e.status !== "finished");
  const finishedEvents = events.filter((e) => e.status === "finished");

  function EventCard({ event }: { event: RallyEvent }) {
    return (
      <li>
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
    );
  }

  return (
    <>
      <AdminHeader title="Rallyes" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        {mode === "choice" && (
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm text-slate-500">
              Mit dieser App erstellst du als Lehrkraft Schulhaus-Rallyes: Du platzierst Stationen mit
              Rätseln auf Gebäudeplänen oder Karten. Deine Schüler:innen bilden Gruppen, laufen die
              Stationen ab und lösen dort die Rätsel, um Punkte zu sammeln.
            </p>
            <button
              type="button"
              onClick={() => setMode("scratch")}
              className="rounded-xl bg-slate-900 px-5 py-4 text-center font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Neue Rallye anlegen
            </button>
            <button
              type="button"
              onClick={() => setMode("template")}
              disabled={templates.length === 0}
              className="rounded-xl border border-slate-300 bg-white px-5 py-4 text-center font-semibold text-slate-800 shadow-sm hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Vorlage nutzen
            </button>
            {templates.length === 0 && (
              <p className="text-center text-xs text-slate-400">
                Noch keine Vorlagen vorhanden – lege zuerst eine neue Rallye an und speichere sie als
                Vorlage.
              </p>
            )}
          </div>
        )}

        {mode !== "choice" && (
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <button
              type="button"
              onClick={resetToChoice}
              className="self-start text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              ← Zurück
            </button>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={mode === "scratch" ? "Neue Rallye, z. B. Klasse 5a" : "Name der neuen Rallye"}
              className={`rounded-lg border px-4 py-2 ${
                error ? "border-red-400" : "border-slate-300"
              }`}
            />
            {mode === "template" && (
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                <option value="" disabled>
                  Vorlage wählen…
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              disabled={creating}
              className="self-start rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              Anlegen
            </button>
          </form>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <ul className="flex flex-col gap-3">
          {openEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {openEvents.length === 0 && (
            <p className="text-center text-slate-500">Noch keine laufenden Rallyes.</p>
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
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/admin/templates/${t.id}/stations`}
                      className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
                    >
                      Bearbeiten
                    </Link>
                    <button
                      onClick={() => setDeletingTemplate(t)}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Löschen
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {finishedEvents.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-500">
              Beendete Rallyes ({finishedEvents.length})
            </h2>
            <ul className="flex flex-col gap-3">
              {finishedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </ul>
          </section>
        )}
      </main>

      {deletingTemplate && (
        <ConfirmDeleteByName
          itemLabel="Vorlage"
          itemName={deletingTemplate.name}
          onConfirm={handleDeleteTemplate}
          onClose={() => setDeletingTemplate(null)}
        />
      )}
    </>
  );
}
