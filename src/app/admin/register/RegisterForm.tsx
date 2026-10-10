"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import BrandMark from "@/components/BrandMark";

function firebaseErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "Für diese E-Mail-Adresse existiert bereits ein Konto.";
    case "auth/weak-password":
      return "Das Passwort muss mindestens 6 Zeichen lang sein.";
    case "auth/invalid-email":
      return "Bitte eine gültige E-Mail-Adresse eingeben.";
    default:
      return "Registrierung fehlgeschlagen. Bitte versuche es erneut.";
  }
}

export default function RegisterForm({ invite }: { invite: string | null }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteOrgName, setInviteOrgName] = useState<string | null>(null);
  const [inviteInvalid, setInviteInvalid] = useState(false);

  useEffect(() => {
    if (!invite) return;
    fetch(`/api/invites/${invite}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) setInviteOrgName(data.orgName);
        else setInviteInvalid(true);
      })
      .catch(() => setInviteInvalid(true));
  }, [invite]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      const [loginRes, membershipRes] = await Promise.all([
        fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }),
        fetch("/api/register-membership", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, displayName: displayName.trim() || null }),
        }),
      ]);

      if (!loginRes.ok || !membershipRes.ok) {
        setError("Registrierung fehlgeschlagen. Bitte versuche es erneut.");
        setLoading(false);
        return;
      }

      if (invite) {
        await fetch(`/api/invites/${invite}/accept`, { method: "POST" }).catch(() => {});
      }

      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      const code = err instanceof Error && "code" in err ? String((err as { code: string }).code) : "";
      setError(firebaseErrorMessage(code));
      setLoading(false);
    }
  }

  return (
    <main className="ol-north flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" aria-label="Zur Startseite">
        <BrandMark />
      </Link>
      <h1 className="font-display text-4xl font-extrabold uppercase leading-none">Als Rallyleiter:in registrieren</h1>
      {inviteOrgName && (
        <p className="-mt-4 max-w-sm text-center text-base text-slate-700">
          Du wurdest eingeladen, <span className="font-semibold">{inviteOrgName}</span> beizutreten.
          Nach der Registrierung wirst du direkt Mitglied.
        </p>
      )}
      {inviteInvalid && (
        <p className="-mt-4 max-w-sm text-center text-base font-medium text-amber-700">
          Dieser Einladungslink ist nicht mehr gültig. Du kannst dich trotzdem normal registrieren.
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border-2 border-ink bg-white p-6"
      >
        <input
          type="text"
          autoFocus
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Name"
          aria-label="Name"
          className="h-14 rounded-xl border-2 border-ink px-4 text-lg placeholder:text-slate-500 focus:border-signal focus:outline-none"
        />
        <input
          type="email"
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
          placeholder="Passwort (mind. 6 Zeichen)"
          aria-label="Passwort (mind. 6 Zeichen)"
          className="h-14 rounded-xl border-2 border-ink px-4 text-lg placeholder:text-slate-500 focus:border-signal focus:outline-none"
        />
        <input
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="Passwort wiederholen"
          aria-label="Passwort wiederholen"
          className="h-14 rounded-xl border-2 border-ink px-4 text-lg placeholder:text-slate-500 focus:border-signal focus:outline-none"
        />
        {error && <p className="text-base font-medium text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-15 rounded-xl border-2 border-ink bg-signal px-6 font-display text-2xl font-extrabold uppercase tracking-wide text-ink transition hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? "Registriert…" : "Registrieren"}
        </button>
        <p className="text-center text-base text-slate-600">
          Bereits registriert?{" "}
          <Link
            href={invite ? `/admin/login?invite=${invite}` : "/admin/login"}
            className="font-semibold text-course underline-offset-4 hover:underline"
          >
            Anmelden
          </Link>
        </p>
      </form>
    </main>
  );
}
