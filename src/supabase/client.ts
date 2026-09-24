// Supabase-Client für Client Components ("use client").
// Quelle: template/src/utils/supabase/client.ts

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  const url = rawUrl.trim().replace(/\/$/, '')
  const key = rawKey.trim()

  return createBrowserClient(url, key)
}
