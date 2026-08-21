"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
    setResent(true);
  }

  async function handleContinue() {
    setChecking(true);
    setError(null);
    await auth.currentUser?.reload();
    if (!auth.currentUser?.emailVerified) {
      setError("Die E-Mail-Adresse ist noch nicht bestätigt.");
      setChecking(false);
      return;
    }
    // The bare (unverified) session cookie set at registration/login still
    // carries email_verified: false, so re-establish it now that the token
    // reflects the confirmed address before letting the layout re-check.
    const idToken = await auth.currentUser.getIdToken(true);
    await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    router.push("/admin/events");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">E-Mail-Adresse bestätigen</h1>
      <p className="max-w-sm text-slate-600">
        Wir haben dir einen Bestätigungslink per E-Mail geschickt. Bitte klicke auf den Link und komm
        dann hierher zurück.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleContinue}
          disabled={checking}
          className="rounded-xl bg-slate-900 px-6 py-3 text-lg font-semibold text-white disabled:opacity-50"
        >
          {checking ? "Prüft…" : "Ich habe bestätigt"}
        </button>
        <button
          onClick={handleResend}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          {resent ? "E-Mail erneut gesendet" : "E-Mail erneut senden"}
        </button>
      </div>
    </main>
  );
}
