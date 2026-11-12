// Logo + Site-Name für Login/Passwort-Seiten. Gleiche Quelle wie die Website (core-cms/src/branding):
// site_settings, gepflegt unter Admin → Einstellungen.

import { getSiteBranding } from "../branding/site-branding";

export interface AuthBranding {
  siteName: string;
  logoUrl: string | null;
}

export async function getAuthBranding(): Promise<AuthBranding> {
  const { siteName, logoUrl } = await getSiteBranding();
  return { siteName: siteName || "Admin", logoUrl };
}
