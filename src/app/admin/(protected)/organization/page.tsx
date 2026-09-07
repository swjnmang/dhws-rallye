"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/app/admin/AdminHeader";
import type { AppUser, MembershipStatus, OrgInvite, OrgRole } from "@/lib/types";

type Me = {
  uid: string;
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
  const [invites, setInvites] = useState<OrgInvite[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [orgNameDraft, setOrgNameDraft] = useState("");
  const [savingOrgName, setSavingOrgName] = useState(false);
  const [orgNameSaved, setOrgNameSaved] = useState(false);

  const [invitingBusy, setInvitingBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  function loadMe() {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => {
        setMe(data);
        if (data.membershipStatus === "active" && data.orgRole === "owner") {
          setOrgNameDraft(data.orgName ?? "");
        }
      });
  }

  function loadMembers() {
    fetch("/api/admin/members")
      .then((res) => (res.ok ? res.json() : { members: [] }))
      .then((data) => setMembers(data.members ?? []));
  }

  function loadInvites() {
    fetch("/api/admin/invites")
      .then((res) => (res.ok ? res.json() : { invites: [] }))
      .then((data) => setInvites(data.invites ?? []));
  }

  useEffect(loadMe, []);

  useEffect(() => {
    if (me?.membershipStatus === "active" && me.orgRole === "owner") {
      loadMembers();
      loadInvites();
    }
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

  async function handleMemberAction(
    uid: string,
    action: "approve" | "reject" | "promote" | "demote" | "remove"
  ) {
    setBusyUid(uid);
    const res = await fetch(`/api/admin/members/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyUid(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Aktion fehlgeschlagen");
    }
    loadMembers();
  }

  async function handleSaveOrgName(e: React.FormEvent) {
    e.preventDefault();
    if (!orgNameDraft.trim()) return;
    setSavingOrgName(true);
    setOrgNameSaved(false);
    const res = await fetch("/api/orgs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgNameDraft.trim() }),
    });
    setSavingOrgName(false);
    if (res.ok) {
      setOrgNameSaved(true);
      loadMe();
    }
  }

  async function handleCreateInvite() {
    setInvitingBusy(true);
    setInviteError(null);
    const res = await fetch("/api/admin/invites", { method: "POST" });
    setInvitingBusy(false);
    if (!res.ok) {
      setInviteError("Link konnte nicht erstellt werden.");
      return;
    }
    const data = await res.json();
    loadInvites();
    navigator.clipboard?.writeText(data.url).catch(() => {});
    setCopiedInviteId(data.invite.id);
    setTimeout(() => setCopiedInviteId(null), 3000);
  }

  async function handleCopyInvite(invite: OrgInvite) {
    const url = `${window.location.origin}/admin/register?invite=${invite.id}`;
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId(null), 3000);
  }

  async function handleRevokeInvite(inviteId: string) {
    await fetch(`/api/admin/invites/${inviteId}`, { method: "DELETE" });
    loadInvites();
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
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-slate-900">Organisation</h2>
              <form onSubmit={handleSaveOrgName} className="flex gap-2">
                <input
                  value={orgNameDraft}
                  onChange={(e) => {
                    setOrgNameDraft(e.target.value);
                    setOrgNameSaved(false);
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2"
                />
                <button
                  type="submit"
                  disabled={savingOrgName || !orgNameDraft.trim()}
                  className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {savingOrgName ? "Speichert…" : "Speichern"}
                </button>
              </form>
              {orgNameSaved && <p className="text-sm text-emerald-700">Gespeichert.</p>}
            </section>

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
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {m.orgRole === "owner" ? "Owner" : "Mitglied"}
                      </span>
                      {m.uid !== me.uid && (
                        <>
                          <button
                            disabled={busyUid === m.uid}
                            onClick={() =>
                              handleMemberAction(m.uid, m.orgRole === "owner" ? "demote" : "promote")
                            }
                            className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline disabled:opacity-50"
                          >
                            {m.orgRole === "owner" ? "Zum Mitglied machen" : "Zum Owner machen"}
                          </button>
                          <button
                            disabled={busyUid === m.uid}
                            onClick={() => {
                              if (confirm(`"${m.displayName ?? m.email}" aus der Organisation entfernen?`)) {
                                handleMemberAction(m.uid, "remove");
                              }
                            }}
                            className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Entfernen
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-slate-900">Einladungslinks</h2>
              <p className="text-xs text-slate-500">
                Erstellt einen Link, über den jemand direkt als Mitglied beitritt, ohne Freigabe
                abzuwarten. Es wird keine E-Mail verschickt – der Link wird kopiert, damit du ihn
                selbst weitergeben kannst (per Mail, Chat o. Ä.).
              </p>
              <button
                type="button"
                onClick={handleCreateInvite}
                disabled={invitingBusy}
                className="self-start rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {invitingBusy ? "Erstellt…" : "Neuen Link erstellen"}
              </button>
              {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}

              <ul className="flex flex-col gap-2">
                {(invites ?? []).map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm"
                  >
                    <span className="text-sm text-slate-700">
                      Erstellt am{" "}
                      {new Date(invite.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleCopyInvite(invite)}
                        className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
                      >
                        {copiedInviteId === invite.id ? "Kopiert!" : "Link kopieren"}
                      </button>
                      <button
                        onClick={() => handleRevokeInvite(invite.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Zurückziehen
                      </button>
                    </div>
                  </li>
                ))}
                {invites !== null && invites.length === 0 && (
                  <p className="text-center text-sm text-slate-400">Keine aktiven Einladungslinks.</p>
                )}
              </ul>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
