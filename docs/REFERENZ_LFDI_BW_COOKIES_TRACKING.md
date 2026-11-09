# Referenz: FAQ zu Cookies und Tracking (LfDI Baden-Württemberg)

Quelle: <https://www.baden-wuerttemberg.datenschutz.de/faq-zu-cookies-und-tracking-2/> (Landesbeauftragter für den Datenschutz und die Informationsfreiheit Baden-Württemberg)
Stand der FAQ: **März 2022**, also noch vor der Umbenennung des TTDSG in **TDDDG** (§ 25 gilt inhaltlich weiter). Der LfDI kündigt eine ergänzte Fassung an. Vor einem Rollout prüfen, ob es eine neuere Fassung bzw. eine neuere Orientierungshilfe der Datenschutzkonferenz gibt (aktuell zitiert: OH Telemedien 2021, <https://www.datenschutzkonferenz-online.de/media/oh/20211220_oh_telemedien.pdf>).

Dies ist **unsere Zusammenfassung in eigenen Worten**, kein Abdruck. Gliederungsnummern (A 1.3, B 1.3.7 …) verweisen auf die Originalfassung. Das Dokument ist keine Rechtsberatung. Wie wir die Punkte im Core umsetzen, steht in [COOKIE_BANNER_KONZEPT.md](COOKIE_BANNER_KONZEPT.md).

---

## 1. Grundsätze

- **Zwei Gesetze gelten nebeneinander.** § 25 TDDDG schützt das Endgerät (Speichern/Auslesen von Informationen, egal ob personenbezogen). Die DSGVO regelt, was danach mit personenbezogenen Daten passiert. Beides muss passen (Vorbemerkung).
- **Nicht jede Website braucht einen Banner** (A 1.1). Ohne einwilligungspflichtige Technik ist keiner nötig. Der LfDI rät ausdrücklich, auf einwilligungspflichtige Verarbeitung **möglichst ganz zu verzichten**: weniger Aufwand, weniger Fehlerrisiko (A 1.1, A 4, Einleitung B).
- **Kein Banner „sicherheitshalber"** (A 1.5). Eine Einwilligung für etwas, das gar keine braucht, täuscht über die Rechtslage vor (Freiwilligkeit und Widerruf wären nur vorgetäuscht). Das verstößt gegen Treu und Glauben und Transparenz.
- **„Speichern oder Auslesen"** umfasst Cookies, LocalStorage/Web Storage, Geräte- und Werbe-IDs, ETags, TLS-Session-IDs und Fingerprinting (A 1.2).

## 2. Was ohne Einwilligung geht (A 1.3)

Nur **unbedingt erforderliche** Technik für einen vom Nutzer ausdrücklich gewünschten Dienst, zum Beispiel:

- Sitzung nach Login oder Warenkorb, sobald der Nutzer sich anmeldet oder etwas hineinlegt
- Eingaben in mehrseitigen Formularen, während sie ausgefüllt werden
- gewählte Sprache (wenn von der Voreinstellung abweichend)
- **Vermerk des Einwilligungsstatus, aber nur als Status (ja/nein), nicht mit eindeutiger ID**
- Sicherheit nur in sehr engen Ausnahmefällen mit eigener Nutzerhandlung

Wichtig: Maßgeblich ist die Notwendigkeit für den Zweck, nicht, ob die Software zufällig Cookies setzt. Ein Session-Cookie schon beim bloßen Seitenaufruf ist in der Regel nicht notwendig. Und: erst ab dem Moment, ab dem es nötig ist.

## 3. Externe Inhalte (A 2)

Jede Einbindung (Karten, Videos, Fonts, Social-Media, Analyse) lässt den Browser Verbindung zu einem Dritten aufbauen. Mindestens IP-Adresse und aufrufende Seite gehen dorthin. Empfohlene Reihenfolge:

1. **Verzichten oder lokal bereitstellen:** Schriften vom eigenen Server (kein Caching-Vorteil mehr durch Google-Server), Videos selbst ausliefern oder nur verlinken, Tweets als Zitat/Screenshot mit Quelle.
2. **Social-Media-Buttons** als normale Links ohne nachgeladenes Fremdobjekt.
3. **Karten:** Zwei-Klick-Lösung ist Pflicht, wenn ein externer Kartendienst eingebunden wird. Datenschutzfreundlicher: Maps4BW (nur Baden-Württemberg) oder OpenStreetMap über Proxy bzw. eigene Kacheln.
4. **Zwei-Klick-Lösung** (Vorschaltdialog, Inhalt lädt erst nach Klick) für Videos, Social-Media-Inhalte, Karten. Vor dem Abspielen muss erklärt werden, was übermittelt wird (z. B. „wer welche Seite aufruft" geht an YouTube, Verknüpfung mit vorhandenen Daten möglich).
5. **Drittländer (A 2.5):** Die Regeln für Drittstaaten (Art. 44 ff. DSGVO) gelten zusätzlich. Sind sie nicht erfüllt, ist der Dienst **auch mit Einwilligung unzulässig**. Massenhafte Verarbeitung in Drittstaaten lässt sich nicht auf Einwilligung stützen (B 5.1.1.3). Beispiel in der FAQ: Google Analytics (damals Entscheidungen aus Österreich und Frankreich).
6. Dazu je nach Dienst: Auftragsverarbeitung (Art. 28) oder gemeinsame Verantwortung (Art. 26) vertraglich regeln (B 6, B 7).

## 4. Reichweitenmessung (A 3)

- Reichweitenanalyse heißt: **aggregierte Statistik**, nicht Wiedererkennen einzelner Nutzer über längere Zeit.
- **Ohne Einwilligung** ist sie laut LfDI in der Regel möglich bei: lokaler Logfile-Analyse, keine externen Dienste, datensparsame Konfiguration, kein Zusammenführen von Daten, keine Zweckentfremdung. Rechtsgrundlage dann berechtigtes Interesse (Art. 6 Abs. 1 lit. f) mit dokumentierter Abwägung und Widerspruchsrecht. Aktives Fingerprinting (z. B. Auslesen von Bildschirmauflösung oder Schriftenliste per JavaScript) ist dagegen ein „Zugriff" und braucht Einwilligung.
- **Externe Tools** brauchen in aller Regel Einwilligung, plus Prüfung von AV-Vertrag und Drittland.
- **Serverseitiges Tracking** umgeht nichts (A 3.2). Ersetzen von Kennungen durch Hashes oder User-IDs ist weder Pseudonymisierung noch Anonymisierung.

## 5. Anforderungen an Einwilligung und Banner (A 4)

Wirksam nur, wenn sie ist: **vorherig, freiwillig, informiert, aktiv, separat, widerruflich** (A 4.2).

- Ablehnen darf **nicht schwerer** sein als Zustimmen, schon **auf der ersten Ebene**.
- Kein Weitersurfen, Scrollen, Wegklicken oder Schließen als Zustimmung. Keine Vorauswahl.
- Keine Hinweis-Banner, die nach einiger Zeit verschwinden, während die Verarbeitung läuft.
- Empfänger einzeln oder nach Kategorien wählbar.
- **Überschrift** klar und zur Tragweite passend, keine bloße Respektbekundung (empfohlenes Muster: „Weitergabe Ihrer Nutzerdaten an Dritte zur …").
- **Zweck** beschreiben, nicht nur das Ergebnis: welche Daten, was passiert damit, wer bekommt Zugriff, wird verknüpft, welchen Zwecken dient es, auch die Zwecke der Empfänger. Empfänger namentlich nennen. Einfache Sprache, deutsch.
- Hinweis auf **Freiwilligkeit** und **jederzeitigen Widerruf** samt Anleitung (Art. 7 Abs. 3). Beispielsatz im Original: Die Einwilligung ist freiwillig, keine Bedingung für die Nutzung der Website und kann jederzeit widerrufen werden, indem …
- **Widerruf** so einfach wie Erteilen.
- **Keine Verbindungen zu Dritten und keine nicht notwendigen Cookies**, solange der Banner angezeigt wird.
- **Impressum und Datenschutzerklärung** müssen jederzeit ohne Behinderung durch den Banner erreichbar sein (A 4.1).
- **Nur dort fragen, wo nötig** (A 4.1): Die Abfrage soll unmittelbar vor der ersten Nutzung der einwilligungspflichtigen Funktion stehen, nicht pauschal auf jeder Seite.
- **Koppelung** an eine Leistung ist unzulässig (Art. 7 Abs. 4). **Behörden und öffentliche Stellen** können in der Regel keine wirksame Einwilligung einholen (Erwägungsgrund 43), sie sollen auf einwilligungspflichtige Technik verzichten.
- **Besondere Kategorien** (Gesundheit, politische Meinung, sexuelle Orientierung …): nur mit ausdrücklicher Einwilligung (Art. 9).
- **Werbe-Standards** (z. B. IAB-TCF) sind nicht automatisch rechtskonform (belgische Behörde, 02.02.2022). Eine Einwilligung macht nicht jede Verarbeitung zulässig (A 4.7, Grundsätze aus Art. 5).

## 6. Standardfehler (Abschnitt B), Prüfliste

**Vorherig / aktiv**
- [ ] Beim Aufruf werden schon Cookies gesetzt oder Daten gesendet (auch beim Gang zu Impressum/Datenschutz)
- [ ] Nur Hinweis-Banner, Verarbeitung beginnt trotzdem
- [ ] Scrollen, Schließen (X) oder Klick daneben gilt als Zustimmung
- [ ] Verweis auf „Cookies im Browser löschen" statt echter Ablehnung

**Freiwillig / gleichwertig**
- [ ] „Alles akzeptieren" ohne „Alles ablehnen" **auf derselben Ebene**
- [ ] Ablehnen braucht mehr Klicks oder ist hinter „Einstellungen" versteckt
- [ ] Ein Button größer/farbiger/auffälliger als der andere (Nudging), z. B. großer grüner OK-Button und kleiner Link „Einstellungen"
- [ ] Ablehnende Bedienelemente sind auf gängigen Bildschirmen nicht erreichbar
- [ ] Vorausgewählte Schalter; erst aktivieren, dann wieder deaktivieren müssen
- [ ] „Alles ablehnen" lässt in Untermenüs weitere Einstellungen aktiv

**Informiert**
- [ ] Überschrift irreführend. Die FAQ nennt ausdrücklich u. a. „Ihre Privatsphäre ist uns wichtig", „Wir respektieren Ihre Privatsphäre", „Diese Webseite verwendet Cookies", „Willkommen", „Wir benötigen Ihre Zustimmung", „Cookies zustimmen", „Ein Klick für den Datenschutz"
- [ ] Nur über Cookies informiert, nicht über die Verarbeitungen; Zwecke nur beispielhaft; nicht alle Techniken (Web Storage, ETags, Fingerprinting) genannt
- [ ] Banner verweist nur auf die Datenschutzerklärung, ohne selbst zu informieren
- [ ] Fachbegriffe („Vendoren", „Publisher", „Consent", „Wesentliche Dienste"), unklare Struktur, übergroße Länge, hunderte Empfänger
- [ ] Mehrdeutige Buttons („Bestätigen": bestätigt das die Auswahl oder die Wünsche des Betreibers?)
- [ ] Text nicht auf Deutsch, obwohl die Seite deutsche Besucher anspricht
- [ ] Zweck verschleiert („Werbung" statt Profilbildung), falsche Angaben zu Umfang oder Sensibilität

**Ablauf / Treu und Glauben**
- [ ] Banner verdeckt nach Klick auf Datenschutz/Impressum erneut den Inhalt (Entscheidung erzwungen, bevor man sich informieren kann)
- [ ] Nur Zustimmung wird gespeichert, Ablehnung nicht: bei jedem Besuch wird neu gefragt. Das X schließt nur für diesen Besuch
- [ ] Empfängerliste wird zuerst gekürzt gezeigt, Länge verschleiert; Scheinladen beim Scrollen
- [ ] Heimliches Tracking (Fingerprinting), auch im privaten Modus

**Widerruf**
- [ ] Nicht bei der Einwilligung erklärt, dass und wie widerrufen wird
- [ ] Widerruf schwerer als Zustimmung (nur per Brief/Telefon, langes Formular, Verweis auf den Drittanbieter)

**Ohne Einwilligung stützen**
- [ ] „Vertrag" oder „berechtigtes Interesse" behauptet, obwohl nicht erforderlich oder obwohl Cookies gesetzt werden, die § 25 nur mit Einwilligung erlaubt
- [ ] Widerspruchsrecht nicht genannt oder nicht beachtet

**Pflichten drumherum**
- [ ] Datenschutzinformationen nach Art. 13/14 fehlen oder sind unvollständig
- [ ] Auskunft (Art. 15) nicht möglich, auch nicht anhand von Cookie-IDs (B 4.1.5); Löschung/Berichtigung/Widerspruch nicht umsetzbar
- [ ] Drittstaatentransfer ohne tragfähige Grundlage, kein AV-Vertrag, keine Vereinbarung bei gemeinsamer Verantwortung

## 7. Die acht Beispielbanner (Abschnitt C)

Die FAQ bewertet acht Banner-Muster (Bilder im Original). Gemeinsam ist den kritisierten Mustern: irreführende Überschrift, fehlende gleichwertige Ablehnung auf der ersten Ebene, Nudging durch Farbe/Größe, nur Cookies statt Verarbeitung beschrieben, unklarer Zweck, bei Drittstaatentransfer zusätzlich die Einwilligung als untaugliche Grundlage. Beispiel 6 betont, dass bei nur technisch notwendigen Cookies und datenschutzfreundlicher Einbindung von Social-Media-Elementen **gar kein** pauschaler Banner nötig wäre.
