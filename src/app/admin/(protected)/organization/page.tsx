"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/app/admin/AdminHeader";
import type { AppUser, MembershipStatus, OrgRole } from "@/lib/types";

type Me = {
  orgName: string | null;
  orgRole: OrgRole | null;
  membershipStatus: MembershipStatus;
};

type OrgOption = { id: string; name: string };

export default function OrganizationPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<"choice" | "create" | "join">("choice");
  const [orgs, setOrgs] = useState<OrgOption[] | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [members, setMembers] = useState<AppUser[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadMe() {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => setMe(data));
  }

  function loadMembers() {
    fetch("/api/admin/members")
      .then((res) => (res.ok ? res.json() : { members: [] }))
      .then((data) => setMembers(data.members ?? []));
  }

  useEffect(loadMe, []);

  useEffect(() => {
    if (me?.membershipStatus === "active" && me.orgRole === "owner") loadMembers();
  }, [me]);

  useEffect(() => {
    if (mode === "join" && orgs === null) {
      fetch("/api/orgs")
        .then((res) => res.json())
        .then((data) => setOrgs(data.orgs ?? []));
    }
  }, [mode, orgs]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOrgName.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Organisation konnte nicht angelegt werden.");
      return;
    }
    setMode("choice");
    setNewOrgName("");
    loadMe();
  }

  async function handleJoin(orgId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orgs/${orgId}/join`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError("Beitrittsanfrage konnte nicht gesendet werden.");
      return;
    }
    setMode("choice");
    loadMe();
  }

  async function handleLeave() {
    setBusy(true);
    await fetch("/api/orgs/leave", { method: "POST" });
    setBusy(false);
    loadMe();
  }

  async function handleMemberAction(uid: string, action: "approve" | "reject") {
    setBusyUid(uid);
    await fetch(`/api/admin/members/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyUid(null);
    loadMembers();
  }

  const pending = members?.filter((m) => m.membershipStatus === "pending") ?? [];
  const active = members?.filter((m) => m.membershipStatus === "active") ?? [];

  return (
    <>
      <AdminHeader title="Organisation" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        {!me && <p className="text-center text-slate-500">Lädt…</p>}

        {me?.membershipStatus === "none" && mode === "choice" && (
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm text-slate-500">
              Du gehörst noch keiner Organisation an. Gründe eine neue oder tritt einer bestehenden bei.
            </p>
            <button
              type="button"
              onClick={() => setMode("create")}
              className="rounded-xl border border-slate-300 bg-white px-5 py-4 text-center font-semibold text-slate-800 shadow-sm transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
            >
              Neue Organisation gründen
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className="rounded-xl border border-slate-300 bg-white px-5 py-4 text-center font-semibold text-slate-800 shadow-sm transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
            >
              Bestehender Organisation beitreten
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setMode("choice")}
              className="self-start text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              ← Zurück
            </button>
            <input
              autoFocus
              value={newOrgName}
              onChange={(e) => {
                setNewOrgName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Name der Organisation, z. B. Musterschule"
              className="rounded-lg border border-slate-300 px-4 py-3 text-lg"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="self-start rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Legt an…" : "Organisation gründen"}
            </button>
          </form>
        )}

        {mode === "join" && (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setMode("choice")}
              className="self-start text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              ← Zurück
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {orgs === null && <p className="text-center text-slate-500">Lädt…</p>}
            {orgs !== null && orgs.length === 0 && (
              <p className="text-center text-sm text-slate-400">
                Es gibt noch keine Organisationen zum Beitreten. Gründe stattdessen eine neue.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {(orgs ?? []).map((org) => (
                <li
                  key={org.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm"
                >
                  <span className="font-medium text-slate-800">{org.name}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleJoin(org.id)}
                    className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline disabled:opacity-50"
                  >
                    Beitreten
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {me?.membershipStatus === "pending" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-slate-600">
              Deine Beitrittsanfrage für <span className="font-semibold">{me.orgName}</span> wartet
              noch auf Freigabe durch deren Owner.
            </p>
            <button
              onClick={handleLeave}
              disabled={busy}
              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Anfrage zurückziehen
            </button>
          </div>
        )}

        {me?.membershipStatus === "active" && me.orgRole === "member" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-slate-600">
              Du bist Mitglied von <span className="font-semibold">{me.orgName}</span>.
            </p>
            <button
              onClick={handleLeave}
              disabled={busy}
              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Organisation verlassen
            </button>
          </div>
        )}

        {me?.membershipStatus === "active" && me.orgRole === "owner" && (
          <div className="flex flex-col gap-8">
            <p className="text-center text-slate-600">
              Du bist Owner von <span className="font-semibold">{me.orgName}</span>.
            </p>

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
                        onClick={() => handleMemberAction(m.uid, "approve")}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline disabled:opacity-50"
                      >
                        Annehmen
                      </button>
                      <button
                        disabled={busyUid === m.uid}
                        onClick={() => handleMemberAction(m.uid, "reject")}
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
          </div>
        )}
      </main>
    </>
  );
}
