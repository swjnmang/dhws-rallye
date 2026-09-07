import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <Link href="/" className="self-start text-sm font-medium text-slate-500 hover:text-slate-900">
        ← Zurück
      </Link>
      <h1 className="text-2xl font-bold">Impressum</h1>
      <p className="text-slate-500">Inhalt folgt in Kürze.</p>
    </main>
  );
}
