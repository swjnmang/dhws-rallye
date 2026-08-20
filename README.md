# Schulhaus-Rallye

Digitale Schulhaus-Rallye: Gruppen scannen sich per Code ein, treten einer
Lobby bei und lösen nach dem gemeinsamen Start Rätsel zu Räumen auf einem
Grundriss – dabei zeitlich getrackt. Die Lehrkraft sieht Lobby und Fortschritt
live und am Ende eine Rangliste.

Jedes Event (= ein Spiel-Durchlauf, z. B. für eine Klasse) hat seine eigenen
Räume/Stationen mit Rätseln, die unter „Rätsel einrichten" pro Event aufgebaut
werden. Ein fertig aufgebautes Event kann als **Vorlage** gespeichert werden,
damit andere Lehrkräfte beim Anlegen eines neuen Events darauf aufbauen können,
statt bei null anzufangen – Vorlagen lassen sich später über denselben Editor
auch wieder öffnen und weiterbearbeiten. Ein Event, das seit über 24 Stunden
läuft, wird automatisch als „beendet" markiert und wandert in einen eigenen
Bereich in der Event-Liste.

- **Frontend/Server:** Next.js (App Router, TypeScript), gehostet auf Vercel
- **Daten:** Firebase Firestore (kostenloser Spark-Tarif reicht aus)
- **Grundriss-Bilder:** Die 3 festen Basis-Ebenen (dieses Schulgebäude) liegen
  als statische Dateien unter [`public/floors/`](./public/floors) und werden
  in [`src/lib/floors.ts`](./src/lib/floors.ts) referenziert – Firebase
  Storage wird bewusst **nicht** verwendet. Um einen Grundriss zu ändern:
  Bilddatei am selben Pfad ersetzen und neu deployen. Lehrkräfte können pro
  Event zusätzlich beliebig viele **eigene Ebenen** hinzufügen (z. B. ein
  anderes Gebäude, eine Park-Karte) – die Bilder dafür gehen über Vercel Blob
  (siehe unten), genau wie Rätsel-Bilder.
- **Sicherheit:** Alle Schreibzugriffe und die Rätsel-Auswertung laufen über
  serverseitige Route-Handler mit dem Firebase Admin SDK. Lösungen werden nie
  an den Client geschickt.
- **Rätsel-Bilder:** Lehrkräfte können pro Rätsel ein Bild hochladen (Schüler
  können es antippen, um es zu vergrößern). Gespeichert in **Vercel Blob**
  (nicht Firebase Storage, da laufend und von mehreren Lehrkräften hochgeladen
  – passt nicht zu statischen Dateien wie bei den Grundrissen).
- **Live-GPS-Ebenen:** Eine Ebene kann statt eines Bildes eine **Google Maps**
  Karte sein (z. B. für den Schulhof oder einen Park). Stationen bekommen dann
  echte Koordinaten + einen Radius; Gruppen sehen ihre Live-Position und
  können ein Rätsel erst öffnen, wenn sie nah genug dran sind – das wird nicht
  nur im Browser, sondern auch serverseitig geprüft (`/api/answer`).

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

### 2. Vercel Blob Store anlegen (für Rätsel- und Ebenen-Bilder)

1. Im [Vercel-Dashboard](https://vercel.com/dashboard) → Projekt → Tab
   **„Storage"** → **„Create Database"** → **„Blob"**.
2. Access: **„Public"** wählen (nicht „Private" – die Bilder werden den
   Schülern direkt per URL angezeigt, ohne Token).
3. Beim Erstellen das Häkchen **„Add a read-write token env var to this
   connection"** setzen. Ist der Store mit dem Vercel-Projekt verknüpft,
   landet `BLOB_READ_WRITE_TOKEN` automatisch in den Projekt-Umgebungsvariablen.
4. Für lokales Testen: im Store unter „Quickstart" bzw. „.env.local" den
   Token-Wert kopieren → `BLOB_READ_WRITE_TOKEN` in `.env.local`.

### 3. Google Maps API-Key anlegen (für Live-GPS-Ebenen)

1. [Google Cloud Console](https://console.cloud.google.com) → Projekt
   auswählen/anlegen.
2. **APIs & Dienste → Bibliothek** → „Maps JavaScript API" suchen und
   aktivieren (dafür muss ein Rechnungskonto hinterlegt sein – für den
   Rahmen einer Schul-Rallye bleibt man im kostenlosen Kontingent von Google).
3. **APIs & Dienste → Anmeldedaten** → „Anmeldedaten erstellen" → „API-Schlüssel".
4. Den Schlüssel einschränken: „Anwendungseinschränkungen" → „HTTP-Verweis-URLs"
   → eure Vercel-Domain(s) eintragen (z. B. `https://dein-projekt.vercel.app/*`
   und für lokales Testen `http://localhost:3000/*`). „API-Einschränkungen" →
   nur „Maps JavaScript API" erlauben.

### 4. Umgebungsvariablen

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
- `BLOB_READ_WRITE_TOKEN` → aus Schritt 2
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → aus Schritt 3

### 5. Lokal starten

```bash
npm install
npm run dev
```

App läuft dann auf http://localhost:3000.

## Nutzung

1. Unter `/admin` mit dem Lehrkraft-Passwort anmelden.
2. Neues Event anlegen (z. B. „Klasse 5a") – entweder **ohne Vorlage** (von
   Grund auf neu) oder auf Basis einer vorhandenen **Vorlage**.
3. Unter **Rätsel einrichten**: zwischen den Ebenen wechseln und direkt auf
   den Grundriss (bzw. die Karte) klicken, um eine nummerierte Station mit
   Rätsel (Multiple-Choice, Texteingabe oder Zahl) anzulegen, optional mit
   Bild. Über **„+ Ebene hinzufügen"** lassen sich weitere Ebenen ergänzen –
   entweder mit eigenem Bild oder als **Google Maps (Live-GPS)**-Ebene für
   Bereiche im Freien (dort bekommt jede Station zusätzlich einen Radius in
   Metern, ab dem Gruppen das Rätsel öffnen dürfen). Neue Ebenen werden hinten
   angehängt, lassen sich per Ziehen oder über die ‹/›-Pfeile neu anordnen
   (die 3 festen Basis-Ebenen bleiben dabei immer vorne) und über sich selbst
   auch wieder löschen. Fertiges Event optional als **Vorlage speichern**,
   damit andere Lehrkräfte darauf aufbauen können – bestehende Vorlagen lassen
   sich unter „Events" anklicken, um sie im selben Editor zu bearbeiten. Zum
   Löschen einer Vorlage muss ihr Name zur Bestätigung eingetippt werden.
4. Gruppen rufen auf ihrem Tablet `/join` auf, geben den Code ein (oder
   scannen den QR-Code / öffnen den Link von der Event-Seite), tragen
   Gruppennamen und Klasse ein und klicken auf **„Bereit"**. Sie landen in
   einer Lobby und warten dort.
5. Auf der Event-Seite sieht die Lehrkraft die **Lobby** (wer ist bereit) und
   klickt auf **„Rallye starten"**, sobald alle da sind – erst dann startet
   die gemeinsame Zeitmessung und alle Gruppen wechseln automatisch ins Spiel.
6. Fortschritt und Zeiten live unter **Live-Übersicht** verfolgen, finale
   **Rangliste** nach Abschluss aller Gruppen anzeigen (z. B. per Beamer).
7. Läuft ein Event länger als 24 Stunden, wird es automatisch als „beendet"
   markiert (Prüfung läuft, sobald jemand die Events-Liste oder das Event
   öffnet – kein Cron-Job nötig) und erscheint unter „Beendete Events". Von
   dort lässt es sich über die Event-Seite jederzeit wieder öffnen.

> Hinweis: Beim Bearbeiten eines bestehenden Rätsels muss die richtige
> Antwort erneut eingegeben werden – sie wird aus Sicherheitsgründen nie an
> den Browser geschickt und ist daher beim Öffnen des Formulars nicht
> vorausgefüllt.

## Deployment auf Vercel

1. Repo mit einem Vercel-Projekt verknüpfen (Vercel-Dashboard →
   „Add New… → Project" → GitHub-Repo auswählen).
2. Alle Variablen aus `.env.local` unter _Project Settings → Environment
   Variables_ eintragen (auf Sonderzeichen im Passwort achten, siehe oben).
   `BLOB_READ_WRITE_TOKEN` ist bei mit dem Projekt verknüpftem Blob-Store
   meist schon automatisch vorhanden. Für `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   die Vercel-Produktions-Domain zu den erlaubten HTTP-Verweis-URLs des
   API-Keys hinzufügen (siehe oben), sonst funktionieren die GPS-Ebenen dort
   nicht.
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
      events/                    Event-Liste (laufende + beendete) + Vorlagen-Auswahl/-Verwaltung
      events/[eventId]           Übersicht, Status, Lobby
      events/[eventId]/stations  Editor-Seite (nutzt StationsEditor) + "Als Vorlage speichern"
      events/[eventId]/live      Live-Dashboard
      events/[eventId]/results   Abschluss-Rangliste
      templates/[templateId]/stations   Dieselbe Editor-Seite zum Bearbeiten einer Vorlage
    api/
      join/                      Gruppen-Beitritt (öffentlich)
      answer/                    Rätsel-Auswertung (öffentlich, prüft serverseitig)
      admin/                     Alle admin-geschützten Mutationen (Events, Stationen, Vorlagen)
      admin/events/close-stale   Markiert Events > 24h als "finished" (bei Bedarf aufgerufen)
  components/
    stations-editor/             Gemeinsamer Hotspot-/Rätsel-/Ebenen-Editor für Event & Vorlage
    ConfirmDeleteByName.tsx      "Namen eintippen"-Bestätigung für unwiderrufliche Löschungen
  lib/
    types.ts                     Gemeinsame Datentypen
    floors.ts                    Die 3 festen Basis-Ebenen (statische Dateien)
    clone-stations.ts            Kopiert Ebenen/Stationen zwischen Event/Vorlage (setId-basiert)
    blob-cleanup.ts              Löscht Vercel-Blob-Bilder nur, wenn kein Doc mehr darauf zeigt
    geo.ts                       Haversine-Abstandsberechnung (Live-GPS-Prüfung)
    google-maps-loader.ts        Lädt die Maps JavaScript API einmalig pro Seite
    firebase-client.ts           Firestore-Client (nur Lesezugriffe im Browser)
    firebase-admin.ts            Firebase Admin SDK (lazy, nur serverseitig)
```
