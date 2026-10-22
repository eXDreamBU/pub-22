# Offen

Die eine Liste offener Punkte. Erledigtes fliegt raus (die Geschichte steht in git).

## 1. Für Ilker
- Foto der Getränkekarte (Getränke, Größen, Preise) schicken, dann trage ich sie vorab ein.
- Am Ende auf dem iPad in der Bar testen: Kamera-Scan, Home-Bildschirm, Offline, Sichern in iCloud Drive.

## 2. Technik
- v0.1 bauen laut `docs/plan-0.1.html`: Datenmodell + Speicher, Deckel, Scannen (jsQR), Kunden/Karten (qrcode, drucken), Prämien/Rabatt, Einstellungen, Sichern/Wiederherstellen.
- PWA: Manifest, Icon, kleiner Service Worker; GitHub-Pages-Deploy-Workflow.
- `navigator.storage.persist()` beim Start anfragen; Erinnerung, wenn länger nicht gesichert.

## 3. Ideen
- Statistiken (Besuche, Umsatz pro Stammgast) – bewusst nicht in 0.1.
- Vorlage/no-mistakes: `no-mistakes ci-workflow` erzeugt bei Node-Projekten einen Go-Schritt (`setup-go`, `go.mod`); hier von Hand auf `setup-node` + `npm ci` umgestellt. Im Skill neues-projekt vermerken.
