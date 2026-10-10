"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import BrandMark from "@/components/BrandMark";

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
    <main className="ol-north flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" aria-label="Zur Startseite">
        <BrandMark />
      </Link>
      <h1 className="font-display text-4xl font-extrabold uppercase leading-none">Anmeldung</h1>
      {inviteOrgName && (
        <p className="-mt-4 max-w-sm text-center text-base text-slate-700">
          Du wurdest eingeladen, <span className="font-semibold">{inviteOrgName}</span> beizutreten.
          Nach der Anmeldung wirst du direkt Mitglied.
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border-2 border-ink bg-white p-6"
      >
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail-Adresse"
          aria-label="E-Mail-Adresse"
          className="h-14 rounded-xl border-2 border-ink px-4 text-lg placeholder:text-slate-500 focus:border-signal focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          aria-label="Passwort"
          className="h-14 rounded-xl border-2 border-ink px-4 text-lg placeholder:text-slate-500 focus:border-signal focus:outline-none"
        />
        {error && <p className="text-base font-medium text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-15 rounded-xl border-2 border-ink bg-signal px-6 font-display text-2xl font-extrabold uppercase tracking-wide text-ink transition hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? "Anmelden…" : "Anmelden"}
        </button>
        <p className="text-center text-base text-slate-600">
          Noch kein Konto?{" "}
          <Link
            href={invite ? `/admin/register?invite=${invite}` : "/admin/register"}
            className="font-semibold text-course underline-offset-4 hover:underline"
          >
            Registrieren
          </Link>
        </p>
      </form>
    </main>
  );
}
