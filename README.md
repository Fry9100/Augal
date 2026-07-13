# Augentropfen Tracker

Eine kleine, installierbare Web-App (PWA) zum Protokollieren der Augentropfen mit Zeitstempel.

## Funktionen

- **Rechtes und linkes Auge**: je ein Zähler für Dex (4×/Tag).
- Ein Tap protokolliert die Dosis sofort mit aktueller Uhrzeit; "Rückgängig" korrigiert
  Fehltaps direkt über den Toast-Hinweis.
- Protokoll-Liste mit allen Einträgen des Tages (löschbar) sowie manuelle Nacherfassung
  über "+ manuell" (z. B. wenn man erst später einträgt).
- Tage lassen sich über die Pfeile in der Kopfzeile durchblättern (Verlauf).
- **Datensicherung**: JSON-Export (Kopieren oder als Datei speichern) und Import
  (führt vorhandene und importierte Einträge zusammen, ohne etwas zu überschreiben).
- Alle Daten werden ausschließlich lokal auf dem Gerät gespeichert (`localStorage`) –
  es gibt keinen Server und keine Übertragung von Daten.
- Als PWA installierbar: funktioniert nach der Installation auch offline.

## Live-URL

Läuft dauerhaft unter **https://fry9100.github.io/Augal/** (automatisches Deployment
per GitHub Actions bei jedem Push, siehe `.github/workflows/pages.yml`).

## Nutzung auf dem iPhone

1. Die Live-URL oben in **Safari** öffnen.
2. Über das Teilen-Symbol **„Zum Home-Bildschirm“** wählen.
3. Die App erscheint danach wie eine normale App mit eigenem Icon und startet im
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
index.html                     Haupt-UI
css/style.css                   Styling (hell/dunkel, iPhone-Safe-Areas)
js/app.js                        Logik: Speichern, Zählen, Export/Import, Verlauf
manifest.webmanifest             PWA-Manifest (Name, Icons, Startmodus)
sw.js                            Service Worker für Offline-Nutzung
icons/                           App-Icons
.github/workflows/pages.yml      Deployment nach GitHub Pages
```
