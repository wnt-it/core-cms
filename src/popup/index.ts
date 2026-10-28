// Pop-up (ab v0.9.0): Bild als Hinweis beim Öffnen der Website.
// Daten in site_settings (popup_enabled, popup_image_url, popup_image_alt),
// Migration: sql/0.9.0_site_popup.sql. Verwaltung: /admin/popup über coreAdminPages.
// Das Projekt bindet SitePopup dort ein, wo es erscheinen soll.

export { default as SitePopup } from "./SitePopup";
export { getSitePopup, getSitePopupSettings } from "./get-site-popup";
export type { SitePopupData, SitePopupSettings } from "./get-site-popup";
export { savePopupSettings } from "./actions";
