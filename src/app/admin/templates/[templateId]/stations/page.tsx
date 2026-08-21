"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import AdminHeader from "../../../AdminHeader";
import StationsEditor from "@/components/stations-editor/StationsEditor";
import type { Template } from "@/lib/types";

export default function TemplateStationsPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const router = useRouter();
  const { templateId } = use(params);
  const [template, setTemplate] = useState<Template | null>(null);

  useEffect(() => {
    return onSnapshot(doc(db, "templates", templateId), (snap) => {
      setTemplate(snap.exists() ? (snap.data() as Template) : null);
    });
  }, [templateId]);

  return (
    <>
      <AdminHeader title={template ? `Vorlage: ${template.name}` : "Vorlage"} />
      <StationsEditor
        setId={templateId}
        extraHeaderActions={
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/events")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
            >
              ← Zurück
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/events")}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Speichern
            </button>
          </div>
        }
      />
    </>
  );
}
