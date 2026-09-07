"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveGroupSession, getGroupSession, type GroupSession } from "@/lib/session";

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

  useEffect(() => {
    // Reading localStorage must happen after mount (it's unavailable during
    // SSR), so this can't be a lazy useState initializer without a hydration
    // mismatch between server and client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExistingSession(getGroupSession());
  }, []);

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
    <div className="flex w-full max-w-sm flex-col gap-6">
      {existingSession && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-left">
          <p className="text-sm text-slate-600">
            Ihr seid bereits als <span className="font-semibold">{existingSession.groupName}</span>{" "}
            (Klasse {existingSession.className}) bei &bdquo;{existingSession.eventName}&ldquo;
            angemeldet.
          </p>
          <button
            type="button"
            onClick={() => router.push("/play")}
            className="rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Zurück zum Spiel
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="code" className="text-sm font-medium text-slate-700">
            Rallye-Code
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={6}
            placeholder="Z. B. AB12CD"
            className="rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl font-mono tracking-widest uppercase"
          />
        </div>

        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="groupName" className="text-sm font-medium text-slate-700">
            Gruppenname
          </label>
          <input
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            maxLength={40}
            placeholder="Z. B. Die Adler"
            className="rounded-lg border border-slate-300 px-4 py-3 text-lg"
          />
        </div>

        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="className" className="text-sm font-medium text-slate-700">
            Klasse
          </label>
          <input
            id="className"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            required
            maxLength={20}
            placeholder="Z. B. 5a"
            className="rounded-lg border border-slate-300 px-4 py-3 text-lg"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Beitreten…" : "Bereit"}
        </button>
      </form>
    </div>
  );
}
