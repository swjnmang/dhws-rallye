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
import { useAdminIdentity } from "@/lib/admin-identity";
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
  const [showJoinInfo, setShowJoinInfo] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const identity = useAdminIdentity();
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
        <main className="p-6 text-slate-600">Lade…</main>
      </>
    );
  }

  const isDraft = event.status === "draft";
  const totalSolved = groups.reduce((sum, g) => sum + Object.keys(g.solved).length, 0);
  const finishedGroups = groups.filter((g) => g.finishedAt != null).length;
  const sinceStart = event.startedAt ? (now - event.startedAt) / 1000 : 0;

  return (
    <>
      <AdminHeader title={event.name} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <section className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border-2 border-ink bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={event.status} />
            <span
              className="rounded-md border-2 border-ink px-3 py-1 font-display text-xl font-extrabold tracking-[0.14em]"
              title="Beitritts-Code"
            >
              {event.joinCode}
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            {isDraft && (
              <Link href={`/admin/events/${eventId}/stations`} className={outlineButton}>
                Rätsel bearbeiten
              </Link>
            )}
            <Link href={`/admin/events/${eventId}/solutions`} className={outlineButton}>
              Lösungen anzeigen
            </Link>
            <Link href={`/admin/events/${eventId}/results`} className={outlineButton}>
              Rangliste
            </Link>
            {event.status === "draft" && (
              <button onClick={handleStartClick} disabled={updating} className={signalButton}>
                Rallye starten
              </button>
            )}
            {event.status === "active" && identity && canFinishEvent(identity, event) && (
              <button
                onClick={() => updateStatus("finished")}
                disabled={updating}
                className={inkButton}
              >
                Rallye beenden
              </button>
            )}
            {event.status === "finished" && (
              <button
                onClick={() => updateStatus("active")}
                disabled={updating}
                className={inkButton}
              >
                Wieder öffnen
              </button>
            )}
          </div>
          {event.status === "active" && identity && !canFinishEvent(identity, event) && (
            <p className="w-full text-sm text-slate-600">
              Nur wer die Rallye angelegt oder gestartet hat, oder der Organisations-Owner, kann
              sie beenden.
            </p>
          )}
        </section>

        <section
          aria-label="Kennzahlen"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <Kpi label={isDraft ? "Status" : "Seit Start"}>
            {isDraft ? "Lobby" : formatDuration(sinceStart)}
          </Kpi>
          <Kpi label={isDraft ? "Gruppen bereit" : "Gruppen"}>{groups.length}</Kpi>
          <Kpi label="Gelöste Rätsel">
            {totalSolved}
            {groups.length > 0 && puzzleCount > 0 && (
              <span className="text-2xl text-slate-500"> / {groups.length * puzzleCount}</span>
            )}
          </Kpi>
          <Kpi label="Fertige Gruppen">
            {finishedGroups}
            {groups.length > 0 && (
              <span className="text-2xl text-slate-500"> / {groups.length}</span>
            )}
          </Kpi>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {isDraft ? (
            <section className={card}>
              <h2 className={cardTitle}>
                Lobby ({groups.length} {groups.length === 1 ? "Gruppe" : "Gruppen"} bereit)
              </h2>
              {groups.length === 0 ? (
                <p className="text-base text-slate-600">
                  Noch keine Gruppe beigetreten. Code oder QR-Code teilen, dann hier abwarten.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {groups.map((group) => (
                    <li
                      key={group.id}
                      className="flex min-h-12 items-center justify-between border-b border-slate-200 px-1 text-base last:border-b-0"
                    >
                      <span className="font-semibold">{group.name}</span>
                      <span className="text-slate-600">Klasse {group.className}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className={card}>
              <h2 className={cardTitle}>Live-Rangliste ({sortedGroups.length})</h2>
              {sortedGroups.length === 0 ? (
                <p className="text-base text-slate-600">Noch keine Gruppen beigetreten.</p>
              ) : (
                <ul className="flex flex-col">
                  {sortedGroups.map((group, index) => {
                    const solvedCount = Object.keys(group.solved).length;
                    const pct = puzzleCount > 0 ? Math.round((solvedCount / puzzleCount) * 100) : 0;
                    const elapsed = group.finishedAt
                      ? group.totalSeconds ?? 0
                      : event.startedAt
                      ? (now - event.startedAt) / 1000
                      : 0;
                    return (
                      <li
                        key={group.id}
                        className={`grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 px-1 py-3 last:border-b-0 ${
                          group.finishedAt ? "bg-course-soft" : ""
                        }`}
                      >
                        <span className="font-display text-2xl font-extrabold">{index + 1}</span>
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <p className="truncate font-semibold">
                              {group.name}{" "}
                              <span className="font-normal text-slate-600">· {group.className}</span>
                            </p>
                            <p className="text-sm text-slate-600">
                              {solvedCount} / {puzzleCount} Rätsel
                              {group.finishedAt && " — fertig"}
                            </p>
                          </div>
                          <div className="h-2 rounded-full bg-emerald-100">
                            <div
                              className="h-2 rounded-full bg-course"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-display text-xl font-extrabold tabular-nums">
                            {formatDuration(elapsed)}
                          </p>
                          <button
                            type="button"
                            onClick={() => setRemovingGroup(group)}
                            className="min-h-10 rounded-md px-2 text-sm font-semibold text-red-700 hover:bg-red-50"
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

          <div className="flex flex-col gap-6">
            {isDraft && (
              <section className={`${card} items-center text-center`}>
                <h2 className={cardTitle}>Beitritts-Code</h2>
                <p className="font-display text-5xl font-extrabold tracking-[0.2em]">
                  {event.joinCode}
                </p>
                {joinInfo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={joinInfo.qrDataUrl}
                    alt="QR-Code zum Beitreten"
                    className="h-48 w-48 rounded-md border-2 border-ink p-1"
                  />
                )}
                <p className="break-all text-sm text-slate-600">{joinInfo?.url}</p>
              </section>
            )}

            {event.status === "active" && (
              <section className={card}>
                <button
                  type="button"
                  onClick={() => setShowJoinInfo((v) => !v)}
                  aria-expanded={showJoinInfo}
                  className={`${outlineButton} w-full`}
                >
                  {showJoinInfo ? "Beitritts-Code ausblenden" : "Beitritts-Code anzeigen"}
                </button>
                {showJoinInfo && (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-sm text-slate-600">
                      Falls eine Gruppe den Browser versehentlich geschlossen hat: erneut scannen
                      oder den Code eingeben, um zurück ins laufende Spiel zu kommen.
                    </p>
                    <p className="font-display text-5xl font-extrabold tracking-[0.2em]">
                      {event.joinCode}
                    </p>
                    {joinInfo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={joinInfo.qrDataUrl}
                        alt="QR-Code zum Beitreten"
                        className="h-48 w-48 rounded-md border-2 border-ink p-1"
                      />
                    )}
                    <p className="break-all text-sm text-slate-600">{joinInfo?.url}</p>
                  </div>
                )}
              </section>
            )}

            {event.status === "active" && (
              <section className={card}>
                <h2 className={cardTitle}>Nachricht an alle Gruppen</h2>
                <div className="flex flex-col gap-2">
                  <input
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="z. B. Noch 5 Minuten!"
                    aria-label="Nachricht an alle Gruppen"
                    className="h-12 rounded-lg border-2 border-ink px-3 text-base focus:border-signal focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendBroadcast}
                    disabled={sendingBroadcast || !broadcastText.trim()}
                    className={`${inkButton} w-full`}
                  >
                    {sendingBroadcast ? "Sendet…" : "Senden"}
                  </button>
                </div>
                {broadcastFeedback && <p className="text-sm text-slate-700">{broadcastFeedback}</p>}
                <p className="text-sm text-slate-600">
                  Wird bei allen Gruppen eingeblendet und muss bestätigt werden, bevor sie
                  weiterspielen können.
                </p>
              </section>
            )}
          </div>
        </div>
      </main>

      {showTemplatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border-[3px] border-ink bg-white p-6 shadow-xl">
            <h2 className="font-display text-2xl font-extrabold uppercase">Als Vorlage speichern?</h2>
            <p className="text-base text-slate-700">
              Speichere diese Rallye als Vorlage, damit du sie später erneut nutzen kannst.
            </p>
            <input
              autoFocus
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Name der Vorlage"
              aria-label="Name der Vorlage"
              className="h-12 rounded-lg border-2 border-ink px-3 focus:border-signal focus:outline-none"
            />
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveTemplateAndStart}
                disabled={savingTemplate || !templateName.trim()}
                className={signalButton}
              >
                {savingTemplate ? "Speichert…" : "Als Vorlage speichern & starten"}
              </button>
              <button
                type="button"
                onClick={handleStartWithoutSaving}
                disabled={savingTemplate}
                className={outlineButton}
              >
                Ohne Speichern starten
              </button>
              <button
                type="button"
                onClick={() => setShowTemplatePrompt(false)}
                disabled={savingTemplate}
                className="min-h-11 text-base font-semibold text-slate-600 hover:text-ink disabled:opacity-40"
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

const card = "flex flex-col gap-4 rounded-xl border-2 border-ink bg-white p-5";
const cardTitle = "font-display text-2xl font-extrabold uppercase leading-none";
const buttonBase =
  "inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-ink px-4 text-[15px] font-semibold transition disabled:opacity-50";
const outlineButton = `${buttonBase} bg-white text-ink hover:bg-slate-100`;
const inkButton = `${buttonBase} bg-ink text-white hover:bg-slate-700`;
const signalButton = `${buttonBase} bg-signal text-ink hover:bg-amber-400`;

const STATUS_STYLE: Record<EventStatus, { label: string; className: string; dot: string }> = {
  draft: { label: "Lobby – In Vorbereitung", className: "bg-slate-100 text-ink", dot: "bg-slate-500" },
  active: { label: "Läuft", className: "bg-signal-soft text-signal-ink", dot: "bg-signal" },
  finished: { label: "Beendet", className: "bg-course-soft text-emerald-800", dot: "bg-course" },
};

function StatusPill({ status }: { status: EventStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold ${style.className}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function Kpi({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-white px-5 py-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="font-display text-4xl font-extrabold leading-tight tabular-nums">{children}</p>
    </div>
  );
}
