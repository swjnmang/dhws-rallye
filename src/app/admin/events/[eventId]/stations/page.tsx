"use client";

import { use, useState } from "react";
import AdminHeader from "../../../AdminHeader";
import StationsEditor from "@/components/stations-editor/StationsEditor";

export default function EventStationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [savingTemplate, setSavingTemplate] = useState(false);

  async function handleSaveAsTemplate() {
    const name = prompt("Name der Vorlage:");
    if (!name || !name.trim()) return;
    setSavingTemplate(true);
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), sourceEventId: eventId }),
    });
    setSavingTemplate(false);
    if (res.ok) {
      alert("Vorlage gespeichert – sichtbar unter Rallyes.");
    } else {
      alert("Speichern als Vorlage fehlgeschlagen.");
    }
  }

  return (
    <>
      <AdminHeader title="Rätsel bearbeiten" />
      <StationsEditor
        setId={eventId}
        extraHeaderActions={
          <button
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate}
            className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:opacity-50"
          >
            {savingTemplate ? "Speichert…" : "Als Vorlage speichern"}
          </button>
        }
      />
    </>
  );
}
