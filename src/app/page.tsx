import Link from "next/link";
import ScreenshotSlider from "@/components/ScreenshotSlider";
import BrandMark from "@/components/BrandMark";

export default function HomePage() {
  return (
    <>
      <main className="flex flex-1 flex-col lg:flex-row">
        <section className="ol-north-dark flex flex-col justify-between gap-10 bg-ink px-8 py-10 text-white lg:w-[44%] lg:px-12 lg:py-14">
          <BrandMark tone="dark" />
          <div className="flex flex-col gap-6">
            <CourseSketch />
            <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.92] sm:text-6xl">
              Auf die Rätsel,
              <br />
              fertig, los!
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-slate-300">
              Erstelle eigene Rallyes: Lade eigene Gebäudepläne oder Kartenausschnitte hoch, gestalte
              individuelle Rätsel und lass Gruppen live gegeneinander antreten.
            </p>
          </div>
          <Link
            href="/join"
            className="self-start text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            Ihr seid eine Gruppe? Hier mit dem Rallye-Code beitreten
          </Link>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12">
          <div className="flex w-full max-w-sm flex-col gap-3">
            <p className="ol-kicker">Für Lehrkräfte</p>
            <Link
              href="/admin/login"
              className="flex min-h-14 items-center justify-center rounded-xl border-2 border-ink bg-signal px-6 font-display text-2xl font-extrabold uppercase tracking-wide text-ink transition hover:bg-amber-400"
            >
              Login
            </Link>
            <Link
              href="/admin/register"
              className="flex min-h-14 items-center justify-center rounded-xl border-2 border-ink bg-white px-6 text-lg font-semibold text-ink transition hover:bg-slate-100"
            >
              Registrieren
            </Link>
          </div>

          <ScreenshotSlider />
        </section>
      </main>

      <footer className="border-t-2 border-ink px-6 py-4 text-center text-sm text-slate-500">
        <Link href="/impressum" className="hover:text-ink hover:underline">
          Impressum
        </Link>
      </footer>
    </>
  );
}

// Kleine OL-Bahn: Start-Dreieck und zwei Rätselkreise, verbunden in Violett.
function CourseSketch() {
  return (
    <svg width="220" height="120" viewBox="0 0 220 120" fill="none" aria-hidden>
      <path d="M30 104l20-34H10z" stroke="#D97BCF" strokeWidth="4" />
      <path d="M46 82L100 42L168 70" stroke="#D97BCF" strokeWidth="4" />
      <circle cx="100" cy="42" r="18" stroke="#D97BCF" strokeWidth="4" fill="#1B1B1F" />
      <circle cx="168" cy="70" r="18" stroke="#D97BCF" strokeWidth="4" fill="#1B1B1F" />
      <text x="122" y="30" fill="#D97BCF" fontWeight="800" fontSize="22">
        1
      </text>
      <text x="190" y="58" fill="#D97BCF" fontWeight="800" fontSize="22">
        2
      </text>
    </svg>
  );
}
