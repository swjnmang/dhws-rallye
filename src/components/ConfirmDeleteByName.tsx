"use client";

import { useState } from "react";

// A stronger confirmation than a native confirm() dialog, which is easy to
// click through by reflex: the admin must type the exact name of the thing
// they're deleting before the button becomes active.
export default function ConfirmDeleteByName({
  itemLabel,
  itemName,
  onConfirm,
  onClose,
}: {
  itemLabel: string;
  itemName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const matches = typed.trim() === itemName;

  async function handleConfirm() {
    if (!matches) return;
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border-[3px] border-ink bg-white p-6 shadow-xl">
        <h2 className="font-display text-2xl font-extrabold uppercase">{itemLabel} löschen</h2>
        <p className="text-sm text-slate-600">
          Das kann nicht rückgängig gemacht werden. Tippt zur Bestätigung den Namen{" "}
          <span className="font-semibold text-slate-900">&bdquo;{itemName}&ldquo;</span> ein:
        </p>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={itemName}
          className="h-12 rounded-lg border-2 border-ink px-3 focus:border-signal focus:outline-none"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!matches || deleting}
            className="min-h-12 rounded-lg border-2 border-ink bg-red-700 px-4 font-semibold text-white disabled:opacity-40"
          >
            {deleting ? "Löscht…" : "Endgültig löschen"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-lg border-2 border-ink bg-white px-4 font-semibold text-ink"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
