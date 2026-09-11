import Link from "next/link";
import ScreenshotSlider from "@/components/ScreenshotSlider";

export default function HomePage() {
  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">My Rallye</h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-slate-600">
            Erstelle eigene Rallyes: Lade eigene Gebäudepläne oder Kartenausschnitte hoch, gestalte
            individuelle Rätsel und lass Gruppen live gegeneinander antreten.
          </p>
        </div>

        <ScreenshotSlider />

        <div className="flex w-full max-w-sm flex-col gap-4">
          <Link
            href="/admin/login"
            className="rounded-xl bg-slate-900 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            Login
          </Link>
          <Link
            href="/admin/register"
            className="rounded-xl border border-slate-300 bg-white px-6 py-4 text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            Registrieren
          </Link>
        </div>
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-slate-400">
        <Link href="/impressum" className="hover:text-slate-600 hover:underline">
          Impressum
        </Link>
      </footer>
    </>
  );
}
