"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveGroupSession } from "@/lib/session";

export default function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, groupName }),
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
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-slate-900 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "Beitreten…" : "Los geht's"}
      </button>
    </form>
  );
}
