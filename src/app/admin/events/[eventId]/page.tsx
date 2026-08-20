"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import QRCode from "qrcode";
import { db } from "@/lib/firebase-client";
import AdminHeader from "../../AdminHeader";
import type { RallyEvent, EventStatus } from "@/lib/types";

export default function EventOverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [event, setEvent] = useState<RallyEvent | null>(null);
  const [joinInfo, setJoinInfo] = useState<{ url: string; qrDataUrl: string } | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, "events", eventId), (snap) => {
      setEvent(snap.exists() ? (snap.data() as RallyEvent) : null);
    });
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    const url = `${window.location.origin}/join?code=${event.joinCode}`;
    QRCode.toDataURL(url, { width: 240, margin: 1 }).then((qrDataUrl) => {
      if (!cancelled) setJoinInfo({ url, qrDataUrl });
    });
    return () => {
      cancelled = true;
    };
  }, [event]);

  async function updateStatus(status: EventStatus) {
    setUpdating(true);
    await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(false);
  }

  if (!event) {
    return (
      <>
        <AdminHeader title="Event" />
        <main className="p-6 text-slate-500">Lade…</main>
      </>
    );
  }

  return (
    <>
      <AdminHeader title={event.name} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Status</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
              {event.status === "draft" && "In Vorbereitung"}
              {event.status === "active" && "Läuft"}
              {event.status === "finished" && "Beendet"}
            </span>
            {event.status === "draft" && (
              <button
                onClick={() => updateStatus("active")}
                disabled={updating}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Rallye starten
              </button>
            )}
            {event.status === "active" && (
              <button
                onClick={() => updateStatus("finished")}
                disabled={updating}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Rallye beenden
              </button>
            )}
            {event.status === "finished" && (
              <button
                onClick={() => updateStatus("active")}
                disabled={updating}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Wieder öffnen
              </button>
            )}
          </div>
        </section>

        <section className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">Beitritts-Code</p>
          <p className="font-mono text-4xl font-bold tracking-widest">{event.joinCode}</p>
          {joinInfo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={joinInfo.qrDataUrl} alt="QR-Code zum Beitreten" className="h-48 w-48" />
          )}
          <p className="break-all text-sm text-slate-500">{joinInfo?.url}</p>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href={`/admin/events/${eventId}/live`}
            className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center font-semibold text-slate-800 shadow-sm hover:border-slate-400"
          >
            Live-Übersicht
          </Link>
          <Link
            href={`/admin/events/${eventId}/results`}
            className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center font-semibold text-slate-800 shadow-sm hover:border-slate-400"
          >
            Rangliste
          </Link>
        </section>
      </main>
    </>
  );
}
