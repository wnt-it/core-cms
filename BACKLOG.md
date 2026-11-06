# Plan für die nächsten core-cms-Updates

Die zentrale Liste aller Fixes und Features für den Core. Was beim Arbeiten in den Kundenprojekten auffällt, kommt hierher,
statt einzeln ausgespielt zu werden. Wir arbeiten die Liste gemeinsam ab, taggen dann eine neue Version, heben die Projekte
(Skill `cms-release`) und entfernen die erledigten Punkte. Was erledigt wurde, steht danach im `CHANGELOG.md` des Workspaces.

Format: `- [ ] **Bereich: kurzer Titel** (gefunden in Projekt, Datum)`, darunter Problem und gewünschte Lösung.

## Fixes

Noch keine Einträge.

## Features

- [ ] **Datenschutz-Vorlage: zuschaltbare Bausteine** (alb-naturenergie, 05.11.2026)
  Karten, Videos, Terminbuchung, Newsletter und Zufriedenheitsanalyse wieder als Schalter in die Vorlage holen, allgemein formuliert mit Platzhaltern für den Anbieter. Später fertige Texte je Anbieter (YouTube, Vimeo, Bookings, Calendly). Entwürfe: `docs/DATENSCHUTZ_BAUSTEINE_SPAETER.md`. Bis dahin trägt der Kunde sie im Admin als eigenen Abschnitt ein.
- [ ] **Datenschutz-Vorlage: Abgleich einzelner Absätze** (alb-naturenergie, 05.11.2026)
  Für anpassbare Bausteine: Dreiwege-Abgleich (Stand beim letzten Holen, Text im Admin, neue Vorlage). Unveränderte Absätze aktualisieren, vom Kunden geänderte behalten, bei Änderung auf beiden Seiten wortweise zeigen, was sich geändert hat, und fragen. Erst nötig, wenn es die zuschaltbaren Bausteine gibt. Heute werden nur die festen Abschnitte ersetzt.
