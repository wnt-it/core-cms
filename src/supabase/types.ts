// Zentrale Supabase-Typen, geteilt von allen Next.js-Kundenprojekten.
// Quelle: template/src/config/supabase.ts

export interface SiteSettings {
  id?: string;
  site_name: string;
  site_tagline?: string | null;
  site_description?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  social_links?: Record<string, string> | null;
  hero_home_url?: string | null;
  home_bottom_image_url?: string | null;
  hero_sortiment_url?: string | null;
  hero_marken_url?: string | null;
  hero_abverkauf_url?: string | null;
  hero_aktionen_url?: string | null;
  hero_jobs_url?: string | null;
  hero_kontakt_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Submission {
  id: string;
  type: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  subject?: string | null;
  message?: string | null;
  project_type?: string | null;
  amount?: string | null;
  energy_type?: string | null;
  source_page?: string | null;
  source_url?: string | null;
  status: 'Neu' | 'In Bearbeitung' | 'Erledigt';
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}
