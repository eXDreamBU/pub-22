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
| E-010 | 22.10.2026 | Keine Kasse: „Abrechnen“ zeigt Summe und Punkte, Zahlung läuft weiter über die TSE-Kasse | Plan 0.1 | Claude, Ilker bestätigt | ersetzt durch E-019 |
| E-011 | 22.10.2026 | Getränkekarte vom 11.04.2026 komplett als Startdaten (`src/lib/menu.ts`), inkl. Snacks, Flaschenverkauf, Wein 0,5 l; „Mix +0,50 €“ als eigene Kachel bei Spirituosen und Whisky | Chat | Ilker | gilt |
| E-012 | 22.10.2026 | QR-Inhalt `PUB22:<zufällige ID>`; fremde QR-Codes werden beim Scannen ignoriert | Bau 0.1 | Claude | gilt |
| E-013 | 22.10.2026 | Einlösen: Punkte werden erst beim Abrechnen abgezogen; €-Rabatt in Stufen (Start 100 P. = 5 €), höchstens bis zur Summe; Prämien werden gratis ausgegeben und nicht gebucht; Punkte nur auf den bezahlten Betrag | Bau 0.1, Plan 0.1 | Claude | gilt |
| E-014 | 22.10.2026 | Offline per handgeschriebenem Service Worker (keine neue Abhängigkeit); Seiten erst aus dem Netz (3 s), sonst aus dem Speicher | Bau 0.1 | Claude | gilt |
| E-015 | 22.10.2026 | Sichern über das Teilen-Menü des iPads („In Dateien sichern“ → iCloud Drive), Erinnerung nach 7 Tagen ohne Sicherung | Bau 0.1, Plan 0.1 | Claude | gilt |
| E-016 | 22.10.2026 | Scanner startet mit der Vorderkamera (Gast hält die Karte vors iPad), Umschalten per Knopf | Chat | Ilker | gilt |
| E-017 | 22.10.2026 | Start-Werte Einlösen bestätigt: 100 P. = Freigetränk bis 3,30 €, 100 P. = 5 € Rabatt | Chat | Ilker | gilt |
| E-018 | 22.10.2026 | GitHub Pages eingeschaltet (Quelle GitHub Actions, Workflow `pages.yml`) | Chat | Ilker | gilt |
| E-019 | 22.10.2026 | Die Bar hat keine TSE-Kasse, sondern eine offene Ladenkasse; „Abrechnen“ heißt kassieren (Knopf „Bezahlt“), die Schichtsumme geht in den Kassenbericht | Chat, Plan 0.2 | Ilker | gilt |
| E-020 | 22.10.2026 | Schichtabschluss per Knopf, erst wenn kein Deckel offen ist; zeigt Gesamtsumme, Summe je Kategorie, Rabatt, Freigetränke, dazu eine Notiz; danach festgeschrieben | Plan 0.2 | Ilker | gilt |
| E-021 | 22.10.2026 | Neue Seite „Umsatz“ ohne PIN: Schichten, Woche/Monat, meistverkaufte Getränke, Kunden-Rangliste (Umsatz, Deckel, Rabatt), CSV-Export | Plan 0.2 | Ilker | gilt |
| E-022 | 22.10.2026 | 0.2 wird gebaut und auf dem iPad getestet; in der Bar ersetzt die App die Papier-Deckel erst nach Antwort des Steuerberaters (App als elektronisches Aufzeichnungssystem, recherche/_eingang/kassensichv-offene-ladenkasse-app.md) | Chat | Ilker | gilt |
| E-023 | 22.10.2026 | Die App löscht abgerechnete Deckel und Schichten nie von selbst (Aufbewahrungspflicht wahrscheinlich 10 Jahre) | Plan 0.2, Recherche | Claude | gilt |
| E-024 | 22.10.2026 | Zusammen zahlen: im Abrechnen-Dialog weitere offene Deckel anhaken, man tippt an, wer zahlt; der Zahlende bekommt die Punkte auf die ganze Summe (Gast ohne Karte zahlt = keine Punkte); eingelöste Punkte bleiben beim Kunden ihres Deckels | Stufe 0, Plan 0.3 | Ilker | gilt |
| E-025 | 22.10.2026 | Teil zahlen: angetippte Mengen werden als eigener Eintrag „… (Teil)“ ohne Kunde und ohne Punkte kassiert, der Rest bleibt offen; der Rest darf nicht unter einen eingelösten €-Rabatt fallen | Stufe 0, Plan 0.3 | Ilker (Rabatt-Schutz: Claude) | gilt |
| E-026 | 22.10.2026 | Jeder offene Deckel lässt sich umbenennen, ohne den Kundennamen zu ändern; ein neuer Kundenname geht auf den offenen Deckel, solange der noch den alten Namen trägt | Stufe 0, Plan 0.3 | Ilker | gilt |
| E-027 | 22.10.2026 | „+ Gast“ heißt „+ Deckel“ mit Reitern „Kunde mit Karte“ (Suche) und „Gast ohne Karte“ | Plan 0.3 | Ilker | gilt |
| E-028 | 22.10.2026 | Bei Zusammen zahlen zählt der Umsatz in der Kunden-Rangliste bei dem, der getrunken hat; die Schicht zeigt „bezahlt von …“ | Plan 0.3 (Vorschlag, im Formular vorausgewählt und nicht geändert) | Claude, Ilker „Ja, los“ | gilt |
