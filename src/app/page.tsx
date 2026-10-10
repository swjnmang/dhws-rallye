import Link from "next/link";
import ScreenshotSlider from "@/components/ScreenshotSlider";
import BrandMark from "@/components/BrandMark";

const PILLARS = [
  {
    title: "Eure eigene Karte",
    body: "Ladet Gebäudepläne, Schulhof-Fotos oder Kartenausschnitte hoch. Draußen geht es auch mit einer Live-Karte samt GPS.",
  },
  {
    title: "Eure eigenen Rätsel",
    body: "Setzt nummerierte Rätsel direkt auf den Plan und wählt, wie geantwortet wird: Auswahl, Wort, Zahl, Bild-Puzzle oder Dokument.",
  },
  {
    title: "Live gegeneinander",
    body: "Alle Gruppen starten gleichzeitig. Ihr seht ihren Fortschritt live, am Ende entscheidet die Rangliste.",
  },
];

const STEPS = [
  {
    title: "Rallye anlegen",
    body: "Als Lehrkraft registrieren und eine neue Rallye erstellen – komplett neu oder aus einer Vorlage.",
  },
  {
    title: "Rätsel setzen",
    body: "Grundriss hochladen, auf einen Raum tippen, Rätsel und Lösung eintragen. Fertig ist das erste Rätsel.",
  },
  {
    title: "Gruppen treten bei",
    body: "Die Gruppen scannen den QR-Code oder geben den Rallye-Code ein und warten in der Lobby.",
  },
  {
    title: "Gemeinsamer Start",
    body: "Ihr startet die Rallye für alle zugleich. Ab jetzt läuft die Zeit.",
  },
  {
    title: "Live begleiten",
    body: "Ihr seht, welche Gruppe wie viele Rätsel gelöst hat, und könnt Nachrichten an alle schicken.",
  },
  {
    title: "Rangliste",
    body: "Am Ende sehen alle Gruppen den Endstand. Die besten Zeiten landen im Highscore eurer Schule.",
  },
];

const FOR_TEACHERS = [
  "Mehrere Stockwerke oder Karten pro Rallye",
  "Rätsel mit Bildern, PDFs und Bild-Puzzles",
  "Beitritt per Code oder QR-Code, ganz ohne Schüler-Accounts",
  "Live-Übersicht und Nachricht an alle Gruppen",
  "Vorlagen speichern und im Kollegium teilen",
  "Gemeinsame Organisation für eure Schule",
];

const FOR_GROUPS = [
  "Ein Tablet oder Handy pro Gruppe genügt",
  "Grundriss mit allen Rätseln auf einen Blick",
  "Stockwerk antippen, Rätsel finden, Antwort eingeben",
  "Für jedes gelöste Rätsel gibt es XP",
  "Die Zeit läuft – je schneller, desto besser",
  "Am Ende die Rangliste aller Gruppen",
];

const PUZZLE_TYPES = ["Auswahl (Multiple Choice)", "Wort-Antwort", "Zahl-Antwort", "Bild-Puzzle", "PDF-Dokument"];

export default function HomePage() {
  return (
    <>
      <main className="flex flex-1 flex-col">
        <div className="flex flex-col lg:min-h-[min(100dvh,860px)] lg:flex-row">
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
              <p className="pt-1 text-center text-sm text-slate-600">Kostenlos für Schulen.</p>
            </div>

            <ul className="flex w-full max-w-sm flex-col gap-3 border-t-2 border-ink pt-6 text-base text-slate-700">
              <HeroPoint>Schnitzeljagd durchs Schulhaus – auf eurem echten Grundriss</HeroPoint>
              <HeroPoint>Rätsel selbst erstellen und auf dem Plan platzieren</HeroPoint>
              <HeroPoint>Gruppen spielen per Tablet oder Handy, ihr seht alles live</HeroPoint>
            </ul>

            <a
              href="#wozu"
              className="flex items-center gap-2 text-base font-semibold text-course underline-offset-4 hover:underline"
            >
              Mehr erfahren
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 5v14M6 13l6 6 6-6" />
              </svg>
            </a>
          </section>
        </div>

        <section id="wozu" className="border-t-2 border-ink px-6 py-16 sm:px-10 lg:py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-10">
            <SectionHead kicker="Wozu ist My Rallye da?" title="Die Schulhaus-Rallye – digital">
              My Rallye macht aus eurem Schulgebäude, dem Schulhof oder der Umgebung ein Spielfeld.
              Ideal für Kennenlerntage der neuen Klassen, Projekttage, Wandertage oder als
              spielerische Wiederholung im Unterricht: Gruppen erkunden die Räume, lösen an jedem
              Ort ein Rätsel und treten dabei live gegeneinander an.
            </SectionHead>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {PILLARS.map((pillar, index) => (
                <article key={pillar.title} className="flex flex-col gap-3 rounded-xl border-2 border-ink bg-white p-6">
                  <NumberRing n={index + 1} />
                  <h3 className="font-display text-2xl font-extrabold uppercase leading-tight">{pillar.title}</h3>
                  <p className="text-base leading-relaxed text-slate-700">{pillar.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ol-north border-t-2 border-ink px-6 py-16 sm:px-10 lg:py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-10">
            <SectionHead kicker="So funktioniert’s" title="Eine Rallye in sechs Schritten" />
            <ol className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <NumberRing n={index + 1} filled={index === STEPS.length - 1} />
                  <div className="flex flex-col gap-1.5 pt-1">
                    <h3 className="font-display text-xl font-extrabold uppercase">{step.title}</h3>
                    <p className="text-base leading-relaxed text-slate-700">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t-2 border-ink px-6 py-16 sm:px-10 lg:py-20">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-10">
            <SectionHead kicker="Einblicke" title="So sieht es in der App aus" center>
              Blättere durch die Ansichten, die die Gruppen während einer Rallye sehen.
            </SectionHead>
            <ScreenshotSlider />
          </div>
        </section>

        <section className="border-t-2 border-ink bg-slate-50 px-6 py-16 sm:px-10 lg:py-20">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
            <FeatureList kicker="Für Lehrkräfte" title="Planen und leiten" items={FOR_TEACHERS} />
            <FeatureList kicker="Für Gruppen" title="Suchen und lösen" items={FOR_GROUPS} />
            <div className="flex flex-col gap-4 rounded-xl border-2 border-ink bg-white p-6 md:col-span-2">
              <h3 className="font-display text-2xl font-extrabold uppercase">Diese Rätselarten gibt es</h3>
              <ul className="flex flex-wrap gap-2.5">
                {PUZZLE_TYPES.map((type) => (
                  <li
                    key={type}
                    className="rounded-md bg-course-soft px-3.5 py-2 text-base font-semibold text-emerald-800"
                  >
                    {type}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="ol-north-dark bg-ink px-6 py-16 text-white sm:px-10">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">
                Bereit für eure erste Rallye?
              </h2>
              <p className="max-w-xl text-lg text-slate-300">
                Konto anlegen, Grundriss hochladen, erste Rätsel setzen – in wenigen Minuten
                startklar.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/admin/register"
                className="flex min-h-14 items-center justify-center rounded-xl border-2 border-white bg-signal px-7 font-display text-2xl font-extrabold uppercase tracking-wide text-ink transition hover:bg-amber-400"
              >
                Registrieren
              </Link>
              <Link
                href="/join"
                className="flex min-h-14 items-center justify-center rounded-xl border-2 border-white px-7 text-lg font-semibold text-white transition hover:bg-white/10"
              >
                Als Gruppe beitreten
              </Link>
            </div>
          </div>
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

function SectionHead({
  kicker,
  title,
  center = false,
  children,
}: {
  kicker: string;
  title: string;
  center?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex max-w-3xl flex-col gap-3 ${center ? "items-center text-center" : ""}`}>
      <p className="ol-kicker">{kicker}</p>
      <h2 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">{title}</h2>
      {children && <p className="text-lg leading-relaxed text-slate-700">{children}</p>}
    </div>
  );
}

function NumberRing({ n, filled = false }: { n: number; filled?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-course font-display text-2xl font-extrabold ${
        filled ? "bg-course text-white" : "bg-white text-course"
      }`}
    >
      {n}
    </span>
  );
}

function HeroPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden className="mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] border-course" />
      {children}
    </li>
  );
}

function FeatureList({ kicker, title, items }: { kicker: string; title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border-2 border-ink bg-white p-6">
      <div className="flex flex-col gap-1">
        <p className="ol-kicker">{kicker}</p>
        <h3 className="font-display text-3xl font-extrabold uppercase leading-none">{title}</h3>
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-base text-slate-800">
            <svg className="mt-0.5 shrink-0 text-course" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
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
