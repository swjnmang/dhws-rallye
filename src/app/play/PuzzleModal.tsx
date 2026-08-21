"use client";

import { useState } from "react";
import type { Puzzle } from "@/lib/types";
import JigsawPuzzle from "./JigsawPuzzle";

export default function PuzzleModal({
  roomName,
  puzzle,
  onSubmit,
  onClose,
}: {
  roomName: string;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm font-medium text-slate-500">{roomName}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{puzzle.question}</h2>

        {puzzle.type !== "jigsaw" && puzzle.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={puzzle.imageUrl}
            alt=""
            onClick={() => setImageEnlarged(true)}
            className="mt-4 max-h-48 w-full cursor-zoom-in rounded-xl border border-slate-200 object-cover"
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

        {puzzle.type === "mc" && puzzle.options && (
          <div className="mt-6 flex flex-col gap-3">
            {puzzle.options.map((option, index) => (
              <button
                key={index}
                disabled={submitting}
                onClick={() => submit(index)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-left text-lg transition hover:border-slate-900 hover:bg-slate-50 disabled:opacity-50"
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {puzzle.type === "text" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (textAnswer.trim()) submit(textAnswer.trim());
            }}
            className="mt-6 flex flex-col gap-3"
          >
            <input
              autoFocus
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Eure Antwort"
              className="rounded-xl border border-slate-300 px-4 py-3 text-lg"
            />
            <button
              type="submit"
              disabled={submitting || !textAnswer.trim()}
              className="rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Prüfe…" : "Antworten"}
            </button>
          </form>
        )}

        {puzzle.type === "number" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (numberAnswer.trim()) submit(Number(numberAnswer));
            }}
            className="mt-6 flex flex-col gap-3"
          >
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              value={numberAnswer}
              onChange={(e) => setNumberAnswer(e.target.value)}
              placeholder="Eure Zahl"
              className="rounded-xl border border-slate-300 px-4 py-3 text-lg"
            />
            <button
              type="submit"
              disabled={submitting || !numberAnswer.trim()}
              className="rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Prüfe…" : "Antworten"}
            </button>
          </form>
        )}

        {wrongAttempt && (
          <p className="mt-4 text-sm font-medium text-red-600">
            Leider falsch – versucht es noch einmal!
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-6 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Schließen
        </button>
      </div>

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
