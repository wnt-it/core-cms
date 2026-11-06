// Pop-up für die ganze Website: im Root-Layout der öffentlichen Seiten EINMAL einbinden,
//   import { SitePopupHost } from "core-cms/src/popup";
//   … <body>{children}<SitePopupHost /></body>
// Gibt nichts aus, solange das Pop-up im Admin (/admin/popup) aus ist. Im Admin selbst erscheint es nie.
// Pro Besuch einmal je Bild (siehe SitePopup), egal auf welcher Seite der Besucher einsteigt.

import SitePopup from "./SitePopup";
import { getSitePopup } from "./get-site-popup";

export default async function SitePopupHost() {
  const popup = await getSitePopup();
  return popup ? <SitePopup {...popup} /> : null;
}
