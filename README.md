# Schulhaus-Rallye

Digitale Schulhaus-Rallye: Gruppen scannen sich per Code ein, lösen Rätsel zu
Räumen auf einem Grundriss und werden dabei zeitlich getrackt. Die Lehrkraft
sieht den Fortschritt live und am Ende eine Rangliste.

- **Frontend/Server:** Next.js (App Router, TypeScript), gehostet auf Vercel
- **Daten:** Firebase Firestore (+ Firebase Storage für die Grundriss-Bilder)
- **Sicherheit:** Alle Schreibzugriffe und die Rätsel-Auswertung laufen über
  serverseitige Route-Handler mit dem Firebase Admin SDK. Lösungen werden nie
  an den Client geschickt.

## Einmalige Einrichtung

### 1. Firebase-Projekt anlegen

1. Auf [console.firebase.google.com](https://console.firebase.google.com) ein
   neues Projekt anlegen.
2. **Firestore Database** aktivieren (production mode).
3. **Storage** aktivieren.
4. Unter _Projekteinstellungen → Allgemein → Meine Apps_ eine **Web-App**
   hinzufügen. Die angezeigte Konfiguration (`apiKey`, `authDomain`, …) wird
   für die `NEXT_PUBLIC_FIREBASE_*`-Variablen gebraucht.
5. Unter _Projekteinstellungen → Dienstkonten_ auf **„Neuen privaten Schlüssel
   generieren"** klicken. Die heruntergeladene JSON-Datei wird für
   `FIREBASE_SERVICE_ACCOUNT_KEY` gebraucht (kompletter Inhalt als eine Zeile).
6. Die Firestore-Regeln aus [`firestore.rules`](./firestore.rules) in der
   Firebase Console unter _Firestore Database → Regeln_ einfügen und
   veröffentlichen.

### 2. Umgebungsvariablen

`.env.local.example` nach `.env.local` kopieren und ausfüllen:

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_FIREBASE_*` → aus der Web-App-Konfiguration (Schritt 1.4)
- `FIREBASE_SERVICE_ACCOUNT_KEY` → Inhalt der Service-Account-JSON (Schritt 1.5)
- `FIREBASE_STORAGE_BUCKET` → Bucket-Name, z. B. `dein-projekt.firebasestorage.app`
- `ADMIN_PASSWORD` → Passwort für den Lehrkraft-Bereich (`/admin`)
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
2. Ein neues Event anlegen (z. B. „Klasse 5a").
3. Unter **Rätsel einrichten**: pro Ebene ein Grundriss-Bild hochladen, dann
   direkt auf das Bild klicken, um einen Raum mit Rätsel (Multiple-Choice
   oder Texteingabe) anzulegen.
4. Auf der Event-Übersicht die Rallye **starten** – erst danach können
   Gruppen beitreten.
5. Gruppen rufen auf ihrem Tablet `/join` auf, geben den Code ein (oder
   scannen den QR-Code / öffnen den Link von der Event-Seite) und wählen
   einen Gruppennamen.
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
   Variables_ eintragen.
3. Deployen. Der `ADMIN_SESSION_SECRET` sollte sich zwischen Preview- und
   Production-Deployments **nicht** ändern, sonst werden bestehende
   Admin-Logins ungültig.

## Projektstruktur

```
src/
  app/
    page.tsx                     Startseite
    join/                        Gruppen-Beitritt (Code/QR/Link)
    play/                        Spielansicht der Gruppen (Grundriss + Rätsel + Timer)
    admin/                       Lehrkraft-Bereich (passwortgeschützt via src/proxy.ts)
      events/[eventId]/setup     Grundriss-Upload + Hotspot-/Rätsel-Editor
      events/[eventId]/live      Live-Dashboard
      events/[eventId]/results   Abschluss-Rangliste
    api/
      join/                      Gruppen-Beitritt (öffentlich)
      answer/                    Rätsel-Auswertung (öffentlich, prüft serverseitig)
      admin/                     Alle admin-geschützten Mutationen
  lib/
    types.ts                     Gemeinsame Datentypen
    firebase-client.ts           Firestore-Client (nur Lesezugriffe im Browser)
    firebase-admin.ts            Firebase Admin SDK (lazy, nur serverseitig)
```
