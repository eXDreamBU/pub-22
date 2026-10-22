# Entscheidungen

| Nr | Datum | Entscheidung | Quelle | Wer | Status |
|---|---|---|---|---|---|
| E-001 | 22.10.2026 | Projekt angelegt: Kundenkarten-App (QR-Karte, Deckel, Punkte) für die Bar Pub 22, nur für den Inhaber auf einem iPad; Vorbild Mankido-Video | Stufe 0 im Chat, Instagram mnkd_germany | Ilker | gilt |
| E-002 | 22.10.2026 | Web-App (PWA) auf dem Home-Bildschirm statt nativer iPad-App, weil native Apps einen Mac mit Xcode brauchen und wir unter Windows bauen | Plan 0.1 | Claude, Ilker bestätigt | gilt |
| E-003 | 22.10.2026 | Technik: Vite + TypeScript + Svelte 5, Vitest; jsQR zum Scannen, weil iOS Safari BarcodeDetector nicht aktiviert hat (caniuse.com/mdn-api_barcodedetector); qrcode zum Erzeugen | Plan 0.1 | Claude | gilt |
| E-004 | 22.10.2026 | Daten nur auf dem iPad (localStorage, ein JSON-Paket), Sichern/Wiederherstellen als Datei ab 0.1; Home-Bildschirm-Apps fallen nicht unter Safaris 7-Tage-Löschung (bugs.webkit.org/show_bug.cgi?id=211775) | Stufe 0 + Plan 0.1 | Ilker | gilt |
| E-005 | 22.10.2026 | Punkte einstellbar, Start 1 € = 1 Punkt, abgerundet, auf den tatsächlich bezahlten Betrag | Stufe 0 | Ilker (Rundung: Claude) | gilt |
| E-006 | 22.10.2026 | Einlösen als feste Prämien und als €-Rabatt, beides vom Inhaber festgelegt | Stufe 0 | Ilker | gilt |
| E-007 | 22.10.2026 | Kundenkarte drucken oder als Bild aufs Handy; QR enthält nur eine zufällige Kunden-ID | Plan 0.1 | Claude | gilt |
| E-008 | 22.10.2026 | Hosting: GitHub Pages mit öffentlichem Repo (nur Code, nie Kundendaten) | Plan 0.1, Rückfrage im Chat | Ilker | gilt |
| E-009 | 22.10.2026 | Getränkekarte: Ilker schickt ein Foto, Claude trägt sie vorab ein; danach pflegt der Inhaber sie in den Einstellungen | Chat | Ilker | gilt |
| E-010 | 22.10.2026 | Keine Kasse: „Abrechnen“ zeigt Summe und Punkte, Zahlung läuft weiter über die TSE-Kasse | Plan 0.1 | Claude, Ilker bestätigt | gilt |
| E-011 | 22.10.2026 | Getränkekarte vom 11.04.2026 komplett als Startdaten (`src/lib/menu.ts`), inkl. Snacks, Flaschenverkauf, Wein 0,5 l; „Mix +0,50 €“ als eigene Kachel bei Spirituosen und Whisky | Chat | Ilker | gilt |
