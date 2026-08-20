import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Schulhaus-Rallye
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Löst gemeinsam die Rätsel im Schulhaus – auf Zeit.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/join"
          className="rounded-xl bg-slate-900 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-slate-700"
        >
          Als Gruppe beitreten
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-slate-300 bg-white px-6 py-4 text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          Lehrkraft-Bereich
        </Link>
      </div>
    </main>
  );
}
