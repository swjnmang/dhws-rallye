"use client";

import { use } from "react";
import AdminHeader from "../../../AdminHeader";
import SolutionsView from "@/components/SolutionsView";

export default function EventSolutionsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  return (
    <>
      <AdminHeader title="Lösungen" />
      <SolutionsView setId={eventId} />
    </>
  );
}
