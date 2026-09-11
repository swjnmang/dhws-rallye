import AdminHeader from "@/app/admin/AdminHeader";

type Step = { title: string; body: string };

const RALLYE_STEPS: Step[] = [
  {
    title: "1. Rallye anlegen",
    body:
      'Klicke auf der Startseite auf "Neue Rallye anlegen". Du kannst entweder komplett neu ' +
      "starten oder eine vorhandene Vorlage nutzen, die dann als fertige Kopie übernommen wird " +
      "(inklusive aller Ebenen, Stationen und Rätsel).",
  },
  {
    title: "2. Ebenen anlegen",
    body:
      'Öffne die Rallye und wähle "Rätsel bearbeiten". Über "+ Ebene hinzufügen" lädst du einen ' +
      "Grundriss oder Kartenausschnitt als Bild hoch (z. B. Stockwerksplan, Schulhof-Foto, " +
      "Umgebungskarte). Jede Ebene bekommt einen eigenen Namen, z. B. \"Erdgeschoss\" oder " +
      '"Schulhof". Mehrere eigene Ebenen lassen sich per Drag & Drop oder den Pfeil-Buttons neu ' +
      "anordnen.",
  },
  {
    title: "3. Stationen setzen & Rätsel erstellen",
    body:
      "Klicke auf eine Stelle im Grundriss, um dort eine nummerierte Station anzulegen. Vergib " +
      "einen Raum-/Stationsnamen und wähle einen Rätseltyp: Multiple Choice, Freitext, Zahl, " +
      "Puzzle (aus einem hochgeladenen Bild) oder PDF-Dokument (die Antwort steckt im Dokument). " +
      "Trage die richtige Lösung ein und speichere - der Marker erscheint danach direkt auf der " +
      "Karte. Bestehende Marker anklicken, um sie zu bearbeiten oder zu löschen.",
  },
  {
    title: "4. Rallye starten",
    body:
      "Solange die Rallye im Status \"In Vorbereitung\" ist, siehst du Beitritts-Code und QR-Code " +
      "in der Lobby. Schüler:innen treten über /join mit Code oder QR bei und bilden Gruppen. " +
      'Sobald alle bereit sind, startest du über "Rallye starten" - optional speicherst du die ' +
      "Rallye dabei gleich als Vorlage für die Zukunft.",
  },
  {
    title: "5. Live begleiten & beenden",
    body:
      "Während die Rallye läuft, siehst du den Fortschritt aller Gruppen live (gelöste Rätsel, " +
      "Zeit) und kannst eine Nachricht an alle Gruppen senden. Über \"Rallye beenden\" schließt du " +
      'sie ab; die Rangliste steht dann für Schüler:innen und unter "Rangliste" auch für dich ' +
      "bereit.",
  },
  {
    title: "6. Vorlagen wiederverwenden",
    body:
      'Unter "Vorlage erstellen / bearbeiten" verwaltest du eigene Vorlagen: neu anlegen, ' +
      "bearbeiten, als Kopie übernehmen oder löschen. Vorlagen enthalten alle Ebenen, Stationen " +
      "und Rätsel und lassen sich beliebig oft als Basis für neue Rallyes nutzen.",
  },
];

export default function AdminHelpPage() {
  return (
    <>
      <AdminHeader title="Anleitungen" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        <p className="text-sm text-slate-600">
          Kurzer Leitfaden, wie du eine eigene Schulhaus-Rallye anlegst - vom ersten Grundriss bis
          zur laufenden Rallye.
        </p>

        <ol className="flex flex-col gap-6">
          {RALLYE_STEPS.map((step) => (
            <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
