"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

export default function LoginForm({ invite }: { invite: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteOrgName, setInviteOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (!invite) return;
    fetch(`/api/invites/${invite}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) setInviteOrgName(data.orgName);
      })
      .catch(() => {});
  }, [invite]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        setError("Anmeldung fehlgeschlagen");
        setLoading(false);
        return;
      }

      if (invite) {
        await fetch(`/api/invites/${invite}/accept`, { method: "POST" }).catch(() => {});
      }

      router.push("/admin/events");
      router.refresh();
    } catch {
      setError("E-Mail oder Passwort ist falsch");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold">Anmeldung</h1>
      {inviteOrgName && (
        <p className="-mt-4 max-w-sm text-center text-sm text-slate-600">
          Du wurdest eingeladen, <span className="font-semibold">{inviteOrgName}</span> beizutreten.
          Nach der Anmeldung wirst du direkt Mitglied.
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail-Adresse"
          className="rounded-lg border border-slate-300 px-4 py-3 text-lg"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          className="rounded-lg border border-slate-300 px-4 py-3 text-lg"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-6 py-3 text-lg font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Anmelden…" : "Anmelden"}
        </button>
        <p className="text-center text-sm text-slate-500">
          Noch kein Konto?{" "}
          <Link
            href={invite ? `/admin/register?invite=${invite}` : "/admin/register"}
            className="font-medium text-slate-900 hover:underline"
          >
            Registrieren
          </Link>
        </p>
      </form>
    </main>
  );
}
