"use client";

import { useEffect, useState } from "react";

type Slide = { src: string; alt: string; caption: string };

const SLIDES: Slide[] = [
  {
    src: "/screenshots/join.png",
    alt: "Gruppe tritt einer Rallye mit einem Code bei",
    caption: "Mit einem Code oder QR-Code der Rallye beitreten",
  },
  {
    src: "/screenshots/play.png",
    alt: "Grundriss mit Stationen, die eine Gruppe live abläuft",
    caption: "Stationen auf dem echten Grundriss live ablaufen",
  },
  {
    src: "/screenshots/puzzle.png",
    alt: "Eine Gruppe löst ein Rätsel an einer Station",
    caption: "An jeder Station wartet ein Rätsel",
  },
  {
    src: "/screenshots/results.png",
    alt: "Rangliste aller Gruppen nach Ende der Rallye",
    caption: "Rangliste und Zeiten aller Gruppen am Ende",
  },
];

const AUTOPLAY_MS = 4500;

export default function ScreenshotSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-2xl">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
        {SLIDES.map((slide, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8 text-left text-sm font-medium text-white">
          {SLIDES[index].caption}
        </p>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Bild ${i + 1} von ${SLIDES.length} anzeigen`}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-slate-900" : "w-2 bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
