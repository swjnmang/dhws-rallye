"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import QRCode from "qrcode";
import { db } from "@/lib/firebase-client";
import AdminHeader from "@/app/admin/AdminHeader";
import ConfirmDeleteByName from "@/components/ConfirmDeleteByName";
import { canFinishEvent } from "@/lib/permissions";
import { formatDuration } from "@/lib/format";
import { sortGroupsByRank } from "@/lib/group-ranking";
import type { RallyEvent, EventStatus, Group } from "@/lib/types";

export default function EventOverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [event, setEvent] = useState<RallyEvent | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [puzzleCount, setPuzzleCount] = useState(0);
  const [joinInfo, setJoinInfo] = useState<{ url: string; qrDataUrl: string } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [removingGroup, setRemovingGroup] = useState<Group | null>(null);
  const [broadcastText, setBroadcastText] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);
  // Date.now() seeds the ticking clock; the interval below keeps it live.
  // eslint-disable-next-line react-hooks/purity
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    return onSnapshot(doc(db, "events", eventId), (snap) => {
      setEvent(snap.exists() ? (snap.data() as RallyEvent) : null);
    });
  }, [eventId]);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUid(data?.uid ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "events", eventId, "groups"), (snap) => {
      setGroups(snap.docs.map((d) => d.data() as Group));
    });
  }, [eventId]);

  useEffect(() => {
    const q = query(collection(db, "puzzles"), where("setId", "==", eventId));
    return onSnapshot(q, (snap) => setPuzzleCount(snap.docs.length));
  }, [eventId]);

  useEffect(() => {
    fetch("/api/admin/events/close-stale", { method: "POST" }).catch(() => {});
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

  // Only needed while the live group list (below) is ticking.
  useEffect(() => {
    if (event?.status === "draft") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [event?.status]);

  const sortedGroups = useMemo(() => sortGroupsByRank(groups), [groups]);

  async function updateStatus(status: EventStatus) {
    setUpdating(true);
    const res = await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Aktion fehlgeschlagen");
    }
  }

  function handleStartClick() {
    setTemplateName(event?.name ?? "");
    setShowTemplatePrompt(true);
  }

  async function handleSaveTemplateAndStart() {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName.trim(), sourceEventId: eventId }),
    });
    setSavingTemplate(false);
    if (!res.ok) {
      alert("Speichern als Vorlage fehlgeschlagen.");
      return;
    }
    setShowTemplatePrompt(false);
    await updateStatus("active");
  }

  async function handleStartWithoutSaving() {
    setShowTemplatePrompt(false);
    await updateStatus("active");
  }

  async function handleRemoveGroup() {
    if (!removingGroup) return;
    await fetch(`/api/admin/events/${eventId}/groups/${removingGroup.id}`, { method: "DELETE" });
    setRemovingGroup(null);
  }

  async function handleSendBroadcast() {
    const text = broadcastText.trim();
    if (!text) return;
    setSendingBroadcast(true);
    setBroadcastFeedback(null);
    const res = await fetch(`/api/admin/events/${eventId}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setSendingBroadcast(false);
    if (res.ok) {
      setBroadcastText("");
      setBroadcastFeedback("Nachricht gesendet.");
      return;
    }
    const data = await res.json().catch(() => null);
    setBroadcastFeedback(data?.error ?? "Senden fehlgeschlagen.");
  }

  if (!event) {
    return (
      <>
        <AdminHeader title="Rallye" />
        <main className="p-6 text-slate-500">Lade…</main>
      </>
    );
  }

  const isDraft = event.status === "draft";

  return (
    <>
      <AdminHeader title={event.name} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Status</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
              {event.status === "draft" && "Lobby – In Vorbereitung"}
              {event.status === "active" && "Läuft"}
              {event.status === "finished" && "Beendet"}
            </span>
            {event.status === "draft" && (
              <button
                onClick={handleStartClick}
                disabled={updating}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Rallye starten
              </button>
            )}
            {event.status === "active" && uid && canFinishEvent(uid, event) && (
              <button
                onClick={() => updateStatus("finished")}
                disabled={updating}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Rallye beenden
              </button>
            )}
            {event.status === "active" && uid && !canFinishEvent(uid, event) && (
              <p className="text-sm text-slate-500">
                Nur wer die Rallye angelegt oder gestartet hat, kann sie beenden.
              </p>
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

        {event.status === "active" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Nachricht an alle Gruppen</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="z. B. Noch 5 Minuten!"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={sendingBroadcast || !broadcastText.trim()}
                className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {sendingBroadcast ? "Sendet…" : "Senden"}
              </button>
            </div>
            {broadcastFeedback && (
              <p className="mt-2 text-sm text-slate-500">{broadcastFeedback}</p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Wird bei allen Gruppen eingeblendet und muss bestätigt werden, bevor sie
              weiterspielen können.
            </p>
          </section>
        )}

        {isDraft && (
          <section className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">Beitritts-Code</p>
            <p className="font-mono text-4xl font-bold tracking-widest">{event.joinCode}</p>
            {joinInfo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={joinInfo.qrDataUrl} alt="QR-Code zum Beitreten" className="h-48 w-48" />
            )}
            <p className="break-all text-sm text-slate-500">{joinInfo?.url}</p>
          </section>
        )}

        {isDraft && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Lobby ({groups.length} {groups.length === 1 ? "Gruppe" : "Gruppen"} bereit)
            </p>
            {groups.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Noch keine Gruppe beigetreten. Code oder QR-Code teilen, dann hier abwarten.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {groups.map((group) => (
                  <li
                    key={group.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-800">{group.name}</span>
                    <span className="text-slate-500">Klasse {group.className}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!isDraft && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Gruppen ({sortedGroups.length})</p>

            {sortedGroups.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Noch keine Gruppen beigetreten.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {sortedGroups.map((group, index) => {
                  const solvedCount = Object.keys(group.solved).length;
                  const elapsed = group.finishedAt
                    ? group.totalSeconds ?? 0
                    : event.startedAt
                    ? (now - event.startedAt) / 1000
                    : 0;
                  return (
                    <li
                      key={group.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                        group.finishedAt
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-sm font-bold text-slate-400">{index + 1}</span>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {group.name}{" "}
                            <span className="font-normal text-slate-400">· {group.className}</span>
                          </p>
                          <p className="text-sm text-slate-500">
                            {solvedCount} / {puzzleCount} Rätsel
                            {group.finishedAt && " — fertig"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-mono text-lg font-bold tabular-nums">
                          {formatDuration(elapsed)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setRemovingGroup(group)}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                          aria-label={`${group.name} entfernen`}
                        >
                          Entfernen
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section
          className={`grid grid-cols-1 gap-3 ${isDraft ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          {isDraft && (
            <Link
              href={`/admin/events/${eventId}/stations`}
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center font-semibold text-slate-800 shadow-sm hover:border-slate-400"
            >
              Rätsel bearbeiten
            </Link>
          )}
          <Link
            href={`/admin/events/${eventId}/solutions`}
            className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center font-semibold text-slate-800 shadow-sm hover:border-slate-400"
          >
            Lösungen anzeigen
          </Link>
          <Link
            href={`/admin/events/${eventId}/results`}
            className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center font-semibold text-slate-800 shadow-sm hover:border-slate-400"
          >
            Rangliste
          </Link>
        </section>
      </main>

      {showTemplatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">Als Vorlage speichern?</h2>
            <p className="text-sm text-slate-600">
              Speichere diese Rallye als Vorlage, damit du sie später erneut nutzen kannst.
            </p>
            <input
              autoFocus
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Name der Vorlage"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveTemplateAndStart}
                disabled={savingTemplate || !templateName.trim()}
                className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-40"
              >
                {savingTemplate ? "Speichert…" : "Als Vorlage speichern & starten"}
              </button>
              <button
                type="button"
                onClick={handleStartWithoutSaving}
                disabled={savingTemplate}
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 disabled:opacity-40"
              >
                Ohne Speichern starten
              </button>
              <button
                type="button"
                onClick={() => setShowTemplatePrompt(false)}
                disabled={savingTemplate}
                className="text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-40"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {removingGroup && (
        <ConfirmDeleteByName
          itemLabel="Gruppe"
          itemName={removingGroup.name}
          onConfirm={handleRemoveGroup}
          onClose={() => setRemovingGroup(null)}
        />
      )}
    </>
  );
}
