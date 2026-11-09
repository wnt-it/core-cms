// Eigenes, gekapseltes CSS für Banner, Dialog und Platzhalter. Bewusst ohne Tailwind und ohne Annahmen über das Projekt:
// Das Aussehen ist rechtlich relevant (gleichwertige Buttons, gut lesbar) und muss in jedem Projekt gleich funktionieren.
// Projekte geben nur Akzentfarbe, Rundung und Platzierung vor (siehe ConsentDesign).
// Alle drei Hauptbuttons nutzen dieselbe Klasse .wnt-consent-btn, es gibt keine Variante, die einen hervorhebt.

export const CONSENT_CSS = `
.wnt-consent-root{--wnt-c-accent:#1d4ed8;--wnt-c-radius:8px;font-family:inherit;color:#111827;line-height:1.5;font-size:15px;color-scheme:light;text-align:left}
.wnt-consent-root *,.wnt-consent-root *::before,.wnt-consent-root *::after{box-sizing:border-box}
.wnt-consent-banner{position:fixed;z-index:2147483000;background:#fff;color:#111827;border:1px solid #d1d5db;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:20px;max-height:85vh;overflow:auto;border-radius:var(--wnt-c-radius)}
.wnt-consent-banner[data-placement="leiste-unten"]{left:12px;right:12px;bottom:12px;max-width:1100px;margin:0 auto}
.wnt-consent-banner[data-placement="karte-links"]{left:12px;bottom:12px;width:min(440px,calc(100vw - 24px))}
.wnt-consent-banner[data-placement="dialog-mitte"]{left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100vw - 24px))}
.wnt-consent-h{margin:0 0 8px;font-size:18px;font-weight:700;line-height:1.3}
.wnt-consent-p{margin:0 0 10px}
.wnt-consent-small{font-size:13.5px;color:#374151}
.wnt-consent-list{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:8px}
.wnt-consent-item{border:1px solid #e5e7eb;border-radius:calc(var(--wnt-c-radius) - 2px);padding:12px 14px;background:#f9fafb}
.wnt-consent-item strong{font-weight:700}
.wnt-consent-dl{margin:6px 0 0;display:grid;gap:2px;font-size:13.5px;color:#374151}
.wnt-consent-dl dt{font-weight:600;color:#111827}
.wnt-consent-dl dd{margin:0 0 4px}
@media (min-width:640px){.wnt-consent-dl{grid-template-columns:max-content 1fr;column-gap:14px;row-gap:2px}.wnt-consent-dl dd{margin:0}.wnt-consent-dl dd:last-child{grid-column:1/-1;margin-top:2px}}
.wnt-consent-details{margin:2px 0 4px}.wnt-consent-details>summary{cursor:pointer;font-weight:600;font-size:13.5px}.wnt-consent-details>summary:focus-visible{outline:3px solid var(--wnt-c-accent);outline-offset:2px}
.wnt-consent-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.wnt-consent-actions .wnt-consent-btn{flex:1 1 140px}
.wnt-consent-btn{appearance:none;cursor:pointer;font:inherit;font-weight:700;min-height:44px;padding:10px 18px;border-radius:var(--wnt-c-radius);border:2px solid #111827;background:#fff;color:#111827;text-align:center}
.wnt-consent-btn:hover{background:#f3f4f6}
.wnt-consent-btn:focus-visible,.wnt-consent-link:focus-visible,.wnt-consent-switch:focus-visible .wnt-consent-track,.wnt-consent-float:focus-visible{outline:3px solid var(--wnt-c-accent);outline-offset:2px}
.wnt-consent-links{display:flex;flex-wrap:wrap;gap:14px;margin-top:12px;font-size:13.5px}
.wnt-consent-link,.wnt-consent-root a{color:#1f2937;text-decoration:underline;background:none;border:0;padding:0;font:inherit;cursor:pointer}
.wnt-consent-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(17,24,39,.6);display:flex;align-items:center;justify-content:center;padding:12px}
.wnt-consent-dialog{background:#fff;color:#111827;border-radius:var(--wnt-c-radius);width:min(640px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.wnt-consent-dbody{overflow:auto;padding:22px 22px 8px;flex:1 1 auto}
.wnt-consent-dfoot{flex:none;padding:14px 22px 16px;border-top:1px solid #e5e7eb;background:#fff}
.wnt-consent-dfoot .wnt-consent-actions{margin-top:0}
.wnt-consent-dfoot .wnt-consent-links{margin-top:10px}
.wnt-consent-row{display:flex;gap:14px;align-items:center;justify-content:space-between}
.wnt-consent-switch{appearance:none;cursor:pointer;flex:none;display:inline-flex;align-items:center;gap:10px;font:inherit;font-size:13.5px;font-weight:700;border:0;background:none;color:#111827;padding:4px 0;min-height:36px}
.wnt-consent-track{position:relative;display:inline-block;width:48px;height:28px;border-radius:999px;background:#9ca3af;transition:background-color .2s ease;flex:none}
.wnt-consent-thumb{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .2s ease}
.wnt-consent-switch[aria-checked="true"] .wnt-consent-track{background:var(--wnt-c-accent)}
.wnt-consent-switch[aria-checked="true"] .wnt-consent-thumb{transform:translateX(20px)}
.wnt-consent-state{min-width:2.2em;text-align:left}
.wnt-consent-float{position:fixed;z-index:2147482000;left:12px;bottom:12px;appearance:none;cursor:pointer;font:inherit;font-size:13px;font-weight:600;background:#fff;color:#111827;border:2px solid #111827;border-radius:999px;padding:6px 12px;box-shadow:0 2px 10px rgba(0,0,0,.2)}
.wnt-consent-float:hover{background:#f3f4f6}
.wnt-consent-gate{height:100%;max-height:100%;overflow:auto;border:1px solid #d1d5db;border-radius:var(--wnt-c-radius);background:#f9fafb;padding:18px;display:flex;flex-direction:column;gap:8px;min-height:200px;justify-content:center}
.wnt-consent-gate .wnt-consent-actions{margin-top:6px}
.wnt-consent-gate .wnt-consent-actions .wnt-consent-btn{flex:0 1 auto}
/* Platzhalter wächst mit seinem Inhalt: Der Rahmen des Projekts (z. B. 16:9 mit overflow-hidden) darf ihn nicht abschneiden */
.wnt-consent-grow{position:relative!important;inset:auto!important;width:100%;height:auto!important}
:has(> .wnt-consent-grow){aspect-ratio:auto!important;height:auto!important;min-height:0!important;overflow:visible!important}
@media print{.wnt-consent-float,.wnt-consent-banner,.wnt-consent-overlay{display:none!important}}
@media (prefers-reduced-motion:no-preference){.wnt-consent-btn,.wnt-consent-switch{transition:background-color .15s}}
`;
