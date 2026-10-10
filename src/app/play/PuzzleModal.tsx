"use client";

import { useState } from "react";
import type { Puzzle, PuzzleType } from "@/lib/types";
import JigsawPuzzle from "./JigsawPuzzle";

const TYPE_LABEL: Record<PuzzleType, string> = {
  mc: "Auswahl",
  text: "Wort-Antwort",
  number: "Zahl-Antwort",
  jigsaw: "Puzzle",
  pdf: "Dokument",
};

const inputClass =
  "h-18 min-w-0 flex-1 rounded-xl border-[3px] border-ink px-5 font-display text-4xl font-extrabold text-ink placeholder:font-sans placeholder:text-xl placeholder:font-normal placeholder:text-slate-400 focus:border-signal focus:outline-none";

const submitClass =
  "h-18 shrink-0 rounded-xl border-2 border-ink bg-signal px-7 font-display text-2xl font-extrabold uppercase tracking-wide text-ink transition hover:bg-amber-400 disabled:opacity-50";

export default function PuzzleModal({
  roomName,
  number,
  floorName,
  puzzle,
  onSubmit,
  onClose,
}: {
  roomName: string;
  number?: number;
  floorName?: string | null;
  puzzle: Puzzle;
  onSubmit: (answer: string | number | number[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const [textAnswer, setTextAnswer] = useState("");
  const [numberAnswer, setNumberAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wrongAttempt, setWrongAttempt] = useState(false);
  const [imageEnlarged, setImageEnlarged] = useState(false);

  async function submit(answer: string | number | number[]) {
    setSubmitting(true);
    setWrongAttempt(false);
    const correct = await onSubmit(answer);
    setSubmitting(false);
    if (!correct) {
      setWrongAttempt(true);
      setTextAnswer("");
      setNumberAnswer("");
    }
  }

  const kicker = [number != null ? `Rätsel ${number}` : null, floorName]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-stretch sm:justify-end">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="puzzle-room"
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t-[3px] border-ink bg-white sm:max-h-none sm:w-[600px] sm:max-w-full sm:rounded-none sm:border-l-[3px] sm:border-t-0"
      >
        <header className="flex items-center gap-4 border-b-2 border-ink px-6 py-5 sm:px-7">
          <span aria-hidden className="ol-flag h-14 w-14 shrink-0 rounded-md border-[3px] border-ink" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {kicker && <p className="ol-kicker">{kicker}</p>}
            <h2
              id="puzzle-room"
              className="truncate font-display text-3xl font-extrabold uppercase leading-none sm:text-[34px]"
            >
              {roomName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-white transition hover:bg-slate-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 sm:px-7">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-course-soft px-3 py-1.5 text-[15px] font-semibold text-emerald-800">
              {TYPE_LABEL[puzzle.type]}
            </span>
          </div>

          <p className="text-2xl font-semibold leading-snug text-ink">{puzzle.question}</p>

          {puzzle.type !== "jigsaw" && puzzle.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={puzzle.imageUrl}
              alt=""
              onClick={() => setImageEnlarged(true)}
              className="max-h-56 w-full cursor-zoom-in rounded-xl border-2 border-ink object-cover"
            />
          )}

          {puzzle.type === "jigsaw" && puzzle.imageUrl && (
            <JigsawPuzzle
              puzzleId={puzzle.id}
              imageUrl={puzzle.imageUrl}
              gridSize={puzzle.jigsawSize ?? 3}
              onSolved={(order) => submit(order)}
            />
          )}

          {puzzle.type === "pdf" && puzzle.documentUrl && (
            <a
              href={puzzle.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 items-center justify-center gap-3 rounded-xl border-2 border-ink px-4 text-lg font-semibold text-ink transition hover:bg-slate-100"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6" />
              </svg>
              PDF öffnen
            </a>
          )}

          {puzzle.type === "mc" && puzzle.options && (
            <div className="flex flex-col gap-3">
              {puzzle.options.map((option, index) => (
                <button
                  key={index}
                  disabled={submitting}
                  onClick={() => submit(index)}
                  className="flex min-h-15 items-center gap-4 rounded-xl border-2 border-ink px-4 py-3 text-left text-xl font-medium text-ink transition hover:bg-signal-soft disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-course font-display text-lg font-extrabold text-course">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          )}

          {(puzzle.type === "text" || puzzle.type === "pdf") && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (textAnswer.trim()) submit(textAnswer.trim());
              }}
              className="flex flex-col gap-2"
            >
              <label htmlFor="puzzle-text" className="text-base font-semibold">
                Eure Antwort
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="puzzle-text"
                  autoFocus
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Eure Antwort"
                  className={`${inputClass} font-sans! text-2xl! font-semibold!`}
                />
                <button
                  type="submit"
                  disabled={submitting || !textAnswer.trim()}
                  className={submitClass}
                >
                  {submitting ? "Prüfe…" : "Antworten"}
                </button>
              </div>
            </form>
          )}

          {puzzle.type === "number" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (numberAnswer.trim()) submit(Number(numberAnswer));
              }}
              className="flex flex-col gap-2"
            >
              <label htmlFor="puzzle-number" className="text-base font-semibold">
                Eure Zahl
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="puzzle-number"
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  value={numberAnswer}
                  onChange={(e) => setNumberAnswer(e.target.value)}
                  placeholder="Eure Zahl"
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={submitting || !numberAnswer.trim()}
                  className={submitClass}
                >
                  {submitting ? "Prüfe…" : "Antworten"}
                </button>
              </div>
            </form>
          )}

          {wrongAttempt && (
            <p
              role="status"
              className="rounded-xl border-2 border-signal bg-signal-soft px-4 py-3 text-lg font-semibold text-signal-ink"
            >
              Leider falsch – versucht es noch einmal!
            </p>
          )}

          <div className="mt-auto border-t-2 border-dashed border-slate-300 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 text-lg font-semibold text-slate-700 underline underline-offset-4 hover:text-ink"
            >
              Schließen
            </button>
          </div>
        </div>
      </section>

      {imageEnlarged && puzzle.imageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setImageEnlarged(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={puzzle.imageUrl}
            alt=""
            className="max-h-full max-w-full cursor-zoom-out rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
