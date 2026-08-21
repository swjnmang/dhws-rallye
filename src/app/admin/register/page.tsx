"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

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

export default function AdminRegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
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

      router.push("/admin/verify-email");
      router.refresh();
    } catch (err) {
      const code = err instanceof Error && "code" in err ? String((err as { code: string }).code) : "";
      setError(firebaseErrorMessage(code));
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold">Als Rallyleiter:in registrieren</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <input
          type="text"
          autoFocus
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Name"
          className="rounded-lg border border-slate-300 px-4 py-3 text-lg"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail-Adresse"
          className="rounded-lg border border-slate-300 px-4 py-3 text-lg"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort (mind. 6 Zeichen)"
          className="rounded-lg border border-slate-300 px-4 py-3 text-lg"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-6 py-3 text-lg font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Registriert…" : "Registrieren"}
        </button>
        <p className="text-center text-sm text-slate-500">
          Bereits registriert?{" "}
          <Link href="/admin/login" className="font-medium text-slate-900 hover:underline">
            Anmelden
          </Link>
        </p>
      </form>
    </main>
  );
}
