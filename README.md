# Schulhaus-Rallye

Digitale Schulhaus-Rallye: Gruppen scannen sich per Code ein, treten einer
Lobby bei und lösen nach dem gemeinsamen Start Rätsel zu Räumen auf einem
Grundriss – dabei zeitlich getrackt. Die Lehrkraft sieht Lobby und Fortschritt
live und am Ende eine Rangliste.

Jedes Event (= ein Spiel-Durchlauf, z. B. für eine Klasse) hat seine eigenen
Räume/Stationen mit Rätseln, die unter „Rätsel einrichten" pro Event aufgebaut
werden. Ein fertig aufgebautes Event kann als **Vorlage** gespeichert werden,
damit andere Lehrkräfte beim Anlegen eines neuen Events darauf aufbauen können,
statt bei null anzufangen.

- **Frontend/Server:** Next.js (App Router, TypeScript), gehostet auf Vercel
- **Daten:** Firebase Firestore (kostenloser Spark-Tarif reicht aus)
- **Grundriss-Bilder:** liegen als statische Dateien unter
  [`public/floors/`](./public/floors) und werden in
  [`src/lib/floors.ts`](./src/lib/floors.ts) referenziert – Firebase Storage
  wird bewusst **nicht** verwendet, da es inzwischen den kostenpflichtigen
  Blaze-Tarif voraussetzt. Um einen Grundriss zu ändern: Bilddatei am selben
  Pfad ersetzen und neu deployen.
- **Sicherheit:** Alle Schreibzugriffe und die Rätsel-Auswertung laufen über
  serverseitige Route-Handler mit dem Firebase Admin SDK. Lösungen werden nie
  an den Client geschickt.

## Einmalige Einrichtung

### 1. Firebase-Projekt anlegen

1. Auf [console.firebase.google.com](https://console.firebase.google.com) ein
   neues Projekt anlegen.
2. **Firestore Database** aktivieren (production mode).
3. Unter _Projekteinstellungen → Allgemein → Meine Apps_ eine **Web-App**
   hinzufügen. Die angezeigte Konfiguration (`apiKey`, `authDomain`, …) wird
   für die `NEXT_PUBLIC_FIREBASE_*`-Variablen gebraucht.
4. Unter _Projekteinstellungen → Dienstkonten_ auf **„Neuen privaten Schlüssel
   generieren"** klicken. Die heruntergeladene JSON-Datei wird für
   `FIREBASE_SERVICE_ACCOUNT_KEY` gebraucht (kompletter Inhalt als eine Zeile).
5. Die Firestore-Regeln aus [`firestore.rules`](./firestore.rules) in der
   Firebase Console unter _Firestore Database → Regeln_ einfügen und
   veröffentlichen.

### 2. Umgebungsvariablen

`.env.local.example` nach `.env.local` kopieren und ausfüllen:

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_FIREBASE_*` → aus der Web-App-Konfiguration (Schritt 1.4)
- `FIREBASE_SERVICE_ACCOUNT_KEY` → Inhalt der Service-Account-JSON (Schritt 1.4)
- `ADMIN_PASSWORD` → Passwort für den Lehrkraft-Bereich (`/admin`). Enthält das
  Passwort Sonderzeichen wie `#`, den Wert in Anführungszeichen setzen
  (`ADMIN_PASSWORD="Schule#1374"`), sonst wird alles ab dem `#` als Kommentar
  abgeschnitten.
- `ADMIN_SESSION_SECRET` → beliebiger langer Zufallsstring, z. B. mit
  `openssl rand -hex 32`

### 3. Lokal starten

```bash
npm install
npm run dev
```

App läuft dann auf http://localhost:3000.

## Nutzung

1. Unter `/admin` mit dem Lehrkraft-Passwort anmelden.
2. Neues Event anlegen (z. B. „Klasse 5a") – entweder **ohne Vorlage** (von
   Grund auf neu) oder auf Basis einer vorhandenen **Vorlage**.
3. Unter **Rätsel einrichten**: zwischen den drei Ebenen wechseln und direkt
   auf den Grundriss klicken, um eine nummerierte Station mit Rätsel
   (Multiple-Choice, Texteingabe oder Zahl) anzulegen. Optional als **Vorlage
   speichern**, damit andere Lehrkräfte darauf aufbauen können.
4. Gruppen rufen auf ihrem Tablet `/join` auf, geben den Code ein (oder
   scannen den QR-Code / öffnen den Link von der Event-Seite), tragen
   Gruppennamen und Klasse ein und klicken auf **„Bereit"**. Sie landen in
   einer Lobby und warten dort.
5. Auf der Event-Seite sieht die Lehrkraft die **Lobby** (wer ist bereit) und
   klickt auf **„Rallye starten"**, sobald alle da sind – erst dann startet
   die gemeinsame Zeitmessung und alle Gruppen wechseln automatisch ins Spiel.
6. Fortschritt und Zeiten live unter **Live-Übersicht** verfolgen, finale
   **Rangliste** nach Abschluss aller Gruppen anzeigen (z. B. per Beamer).

> Hinweis: Beim Bearbeiten eines bestehenden Rätsels muss die richtige
> Antwort erneut eingegeben werden – sie wird aus Sicherheitsgründen nie an
> den Browser geschickt und ist daher beim Öffnen des Formulars nicht
> vorausgefüllt.

## Deployment auf Vercel

1. Repo mit einem Vercel-Projekt verknüpfen (Vercel-Dashboard →
   „Add New… → Project" → GitHub-Repo auswählen).
2. Alle Variablen aus `.env.local` unter _Project Settings → Environment
   Variables_ eintragen (auf Sonderzeichen im Passwort achten, siehe oben).
3. Deployen. Der `ADMIN_SESSION_SECRET` sollte sich zwischen Preview- und
   Production-Deployments **nicht** ändern, sonst werden bestehende
   Admin-Logins ungültig.

## Projektstruktur

```
src/
  app/
    page.tsx                     Startseite
    join/                        Gruppen-Beitritt (Code/QR/Link) + Lobby
    play/                        Spielansicht der Gruppen (Grundriss + Rätsel + Timer)
    admin/                       Lehrkraft-Bereich (passwortgeschützt via src/proxy.ts)
      events/                    Event-Liste + Vorlagen-Auswahl beim Anlegen
      events/[eventId]           Übersicht, Status, Lobby
      events/[eventId]/stations  Hotspot-/Rätsel-Editor + "Als Vorlage speichern"
      events/[eventId]/live      Live-Dashboard
      events/[eventId]/results   Abschluss-Rangliste
    api/
      join/                      Gruppen-Beitritt (öffentlich)
      answer/                    Rätsel-Auswertung (öffentlich, prüft serverseitig)
      admin/                     Alle admin-geschützten Mutationen (Events, Stationen, Vorlagen)
  lib/
    types.ts                     Gemeinsame Datentypen
    clone-stations.ts            Kopiert Stationen zwischen Event/Vorlage (setId-basiert)
    firebase-client.ts           Firestore-Client (nur Lesezugriffe im Browser)
    firebase-admin.ts            Firebase Admin SDK (lazy, nur serverseitig)
```
