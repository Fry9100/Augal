# Augentropfen Tracker

Eine kleine, installierbare Web-App (PWA) zum Protokollieren der Augentropfen mit Zeitstempel.

## Funktionen

- **Rechtes Auge**: getrennte Zähler für Dex (5×/Tag) und Flox (5×/Tag) inkl. Empfehlung,
  welches Medikament als Nächstes dran ist (stündlich abwechselnd, wie ärztlich verordnet).
- **Linkes Auge**: Zähler für Dex (5×/Tag).
- Ein Tap protokolliert die Dosis sofort mit aktueller Uhrzeit; "Rückgängig" korrigiert
  Fehltaps direkt über den Toast-Hinweis.
- Protokoll-Liste mit allen Einträgen des Tages (löschbar) sowie manuelle Nacherfassung
  über "+ manuell" (z. B. wenn man erst später einträgt).
- Tage lassen sich über die Pfeile in der Kopfzeile durchblättern (Verlauf).
- Alle Daten werden ausschließlich lokal auf dem Gerät gespeichert (`localStorage`) –
  es gibt keinen Server und keine Übertragung von Daten.
- Als PWA installierbar: funktioniert nach der Installation auch offline.

## Nutzung auf dem iPhone

1. Diese Dateien auf einem beliebigen statischen Webserver bereitstellen (z. B. GitHub Pages,
   Netlify, Vercel, oder einfach lokal per `npx serve .`).
2. Die URL auf dem iPhone 15 in **Safari** öffnen.
3. Über das Teilen-Symbol **„Zum Home-Bildschirm“** wählen.
4. Die App erscheint danach wie eine normale App mit eigenem Icon und startet im
   Vollbildmodus (ohne Safari-Leiste).

## Lokal testen

Da die App nur aus statischen Dateien besteht, reicht ein einfacher Webserver:

```bash
npx serve .
# oder
python3 -m http.server 8000
```

Danach im Browser `http://localhost:PORT` öffnen.

## Struktur

```
index.html            Haupt-UI
css/style.css          Styling (hell/dunkel, iPhone-Safe-Areas)
js/app.js               Logik: Speichern, Zählen, Empfehlungen, Verlauf
manifest.webmanifest    PWA-Manifest (Name, Icons, Startmodus)
sw.js                   Service Worker für Offline-Nutzung
icons/                  App-Icons
```
