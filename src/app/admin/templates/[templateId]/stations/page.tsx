"use client";

import { use, useEffect, useState } from "react";
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
      <StationsEditor setId={templateId} />
    </>
  );
}
