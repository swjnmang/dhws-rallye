"use client";

import { Fragment, useState } from "react";

type ImageSlide = { key: string; kind: "image"; src: string; alt: string; caption: string };
type IntroSlide = { key: string; kind: "intro"; caption: string };
type Slide = ImageSlide | IntroSlide;

const INTRO_STEPS = [
  { label: "Registrieren", detail: "Als Lehrkraft kostenlos anmelden" },
  { label: "Einloggen", detail: "Mit deinem Account zurückkehren" },
  { label: "Rallye erstellen", detail: "Eigene Rallye für deine Schule anlegen" },
];

const SLIDES: Slide[] = [
  {
    key: "intro",
    kind: "intro",
    caption: "So legst du als Lehrkraft deine eigene Rallye an",
  },
  {
    key: "join",
    kind: "image",
    src: "/screenshots/join.png",
    alt: "Gruppe tritt einer Rallye mit einem Code bei",
    caption: "Mit einem Code oder QR-Code der Rallye beitreten",
  },
  {
    key: "play",
    kind: "image",
    src: "/screenshots/play.png",
    alt: "Grundriss mit Stationen, die eine Gruppe live abläuft",
    caption: "Stationen auf dem echten Grundriss live ablaufen",
  },
  {
    key: "puzzle",
    kind: "image",
    src: "/screenshots/puzzle.png",
    alt: "Eine Gruppe löst ein Rätsel an einer Station",
    caption: "An jeder Station wartet ein Rätsel",
  },
  {
    key: "results",
    kind: "image",
    src: "/screenshots/results.png",
    alt: "Rangliste aller Gruppen nach Ende der Rallye",
    caption: "Rangliste und Zeiten aller Gruppen am Ende",
  },
];

export default function ScreenshotSlider() {
  const [index, setIndex] = useState(0);

  function goTo(next: number) {
    setIndex((next + SLIDES.length) % SLIDES.length);
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border-2 border-ink bg-slate-100">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.key}
            className={`absolute inset-0 transition-opacity duration-500 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            {slide.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.src} alt={slide.alt} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center gap-1.5 bg-white px-3 sm:gap-3 sm:px-8">
                {INTRO_STEPS.map((step, stepIndex) => (
                  <Fragment key={step.label}>
                    <div className="flex flex-col items-center gap-1 text-center sm:gap-2 sm:max-w-[9rem]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[3px] border-course bg-white font-display text-xs font-extrabold text-course sm:h-10 sm:w-10 sm:text-base">
                        {stepIndex + 1}
                      </span>
                      <div>
                        <p className="font-display text-sm font-bold uppercase text-ink sm:text-lg">{step.label}</p>
                        <p className="hidden text-sm text-slate-600 sm:block">{step.detail}</p>
                      </div>
                    </div>
                    {stepIndex < INTRO_STEPS.length - 1 && (
                      <span className="text-course" aria-hidden>
                        →
                      </span>
                    )}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        ))}
        <p className="absolute inset-x-0 bottom-0 border-t-2 border-ink bg-ink px-4 py-2.5 text-left text-base font-medium text-white">
          {SLIDES[index].caption}
        </p>

        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Vorheriges Bild"
          className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-white text-xl font-bold text-ink transition hover:bg-slate-100"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Nächstes Bild"
          className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-white text-xl font-bold text-ink transition hover:bg-slate-100"
        >
          ›
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Bild ${i + 1} von ${SLIDES.length} anzeigen`}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-ink" : "w-2 bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
