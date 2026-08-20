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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">{itemLabel} löschen</h2>
        <p className="text-sm text-slate-600">
          Das kann nicht rückgängig gemacht werden. Tippt zur Bestätigung den Namen{" "}
          <span className="font-semibold text-slate-900">&bdquo;{itemName}&ldquo;</span> ein:
        </p>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={itemName}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!matches || deleting}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
          >
            {deleting ? "Löscht…" : "Endgültig löschen"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
