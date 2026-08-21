"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/app/admin/AdminHeader";
import type { AppUser } from "@/lib/types";

export default function MembersPage() {
  const [members, setMembers] = useState<AppUser[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/members").then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      setMembers(data.members ?? []);
    });
  }

  useEffect(load, []);

  async function handleAction(uid: string, action: "approve" | "reject") {
    setBusyUid(uid);
    await fetch(`/api/admin/members/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyUid(null);
    load();
  }

  const pending = members?.filter((m) => m.membershipStatus === "pending") ?? [];
  const active = members?.filter((m) => m.membershipStatus === "active") ?? [];

  return (
    <>
      <AdminHeader title="Mitglieder" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        {forbidden && (
          <p className="text-center text-slate-500">
            Nur der Owner deiner Organisation kann Mitglieder verwalten.
          </p>
        )}

        {!forbidden && members === null && <p className="text-center text-slate-500">Lädt…</p>}

        {!forbidden && members !== null && (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Offene Beitrittsanfragen{pending.length > 0 && ` (${pending.length})`}
              </h2>
              <ul className="flex flex-col gap-2">
                {pending.map((m) => (
                  <li
                    key={m.uid}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{m.displayName ?? m.email}</p>
                      <p className="text-sm text-slate-500">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        disabled={busyUid === m.uid}
                        onClick={() => handleAction(m.uid, "approve")}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline disabled:opacity-50"
                      >
                        Annehmen
                      </button>
                      <button
                        disabled={busyUid === m.uid}
                        onClick={() => handleAction(m.uid, "reject")}
                        className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Ablehnen
                      </button>
                    </div>
                  </li>
                ))}
                {pending.length === 0 && (
                  <p className="text-center text-slate-500">Keine offenen Anfragen.</p>
                )}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-slate-900">Mitglieder ({active.length})</h2>
              <ul className="flex flex-col gap-2">
                {active.map((m) => (
                  <li
                    key={m.uid}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{m.displayName ?? m.email}</p>
                      <p className="text-sm text-slate-500">{m.email}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {m.orgRole === "owner" ? "Owner" : "Mitglied"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}
