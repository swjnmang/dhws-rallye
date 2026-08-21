"use client";

import { use, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import AdminHeader from "@/app/admin/AdminHeader";
import SolutionsView from "@/components/SolutionsView";
import type { Template } from "@/lib/types";

export default function TemplateSolutionsPage({
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
      <AdminHeader title={template ? `Vorlage: ${template.name} – Lösungen` : "Lösungen"} />
      <SolutionsView setId={templateId} />
    </>
  );
}
