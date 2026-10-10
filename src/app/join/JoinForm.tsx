"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { saveGroupSession, getGroupSession, type GroupSession } from "@/lib/session";
import type { RallyEvent } from "@/lib/types";

export default function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [groupName, setGroupName] = useState("");
  const [className, setClassName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Landing here doesn't mean the group's session is gone (e.g. an
  // accidental back-button press from /play) - if one's still saved, offer
  // to resume it instead of only showing a blank join form.
  const [existingSession, setExistingSession] = useState<GroupSession | null>(null);
  // Whether the existing session's own rally has already finished - if so,
  // the join-a-different-rally form below is pointless clutter (and its
  // "Bereit" would just error anyway), so it's hidden in favor of just the
  // "Zurück zum Spiel" box, which routes into /play's own end-of-rally view.
  const [existingEventFinished, setExistingEventFinished] = useState(false);

  useEffect(() => {
    // Reading localStorage must happen after mount (it's unavailable during
    // SSR), so this can't be a lazy useState initializer without a hydration
    // mismatch between server and client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExistingSession(getGroupSession());
  }, []);

  useEffect(() => {
    if (!existingSession) return;
    let cancelled = false;
    getDoc(doc(db, "events", existingSession.eventId)).then((snap) => {
      if (cancelled || !snap.exists()) return;
      const event = snap.data() as RallyEvent;
      if (event.status === "finished") setExistingEventFinished(true);
    });
    return () => {
      cancelled = true;
    };
  }, [existingSession]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, groupName, className }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Beitritt fehlgeschlagen");
        return;
      }
      saveGroupSession({
        eventId: data.eventId,
        groupId: data.groupId,
        groupName,
        className,
        eventName: data.eventName,
      });
      router.push("/play");
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {existingSession && (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-ink bg-signal-soft px-5 py-4 text-left">
          <p className="text-base text-slate-700">
            Ihr seid bereits als <span className="font-semibold">{existingSession.groupName}</span>{" "}
            (Klasse {existingSession.className}) bei &bdquo;{existingSession.eventName}&ldquo;
            angemeldet.
          </p>
          <button
            type="button"
            onClick={() => router.push("/play")}
            className="min-h-14 rounded-xl border-2 border-ink bg-ink px-4 font-display text-xl font-extrabold uppercase tracking-wide text-white transition hover:bg-slate-700"
          >
            Zurück zum Spiel
          </button>
        </div>
      )}

      {!existingEventFinished && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-left">
            <label htmlFor="code" className="text-base font-semibold">
              Rallye-Code
            </label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="AB12CD"
              className="h-20 rounded-xl border-2 border-ink px-4 text-center font-display text-5xl font-extrabold uppercase tracking-[0.3em] placeholder:text-slate-300 focus:border-signal focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2 text-left sm:col-span-2">
              <label htmlFor="groupName" className="text-base font-semibold">
                Gruppenname
              </label>
              <input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                maxLength={40}
                placeholder="Z. B. Die Adler"
                className="h-15 rounded-xl border-2 border-ink px-4 text-xl placeholder:text-slate-400 focus:border-signal focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 text-left">
              <label htmlFor="className" className="text-base font-semibold">
                Klasse
              </label>
              <input
                id="className"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
                maxLength={20}
                placeholder="Z. B. 5a"
                className="h-15 rounded-xl border-2 border-ink px-4 text-xl placeholder:text-slate-400 focus:border-signal focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-base font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-17 items-center justify-center gap-3 rounded-xl border-2 border-ink bg-signal px-6 font-display text-3xl font-extrabold uppercase tracking-wide text-ink transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Beitreten…" : "Bereit"}
            {!loading && (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
