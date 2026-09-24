// Quelle: template/src/app/admin/auth/callback/route.ts
// Import von createClient auf core-cms-internen relativen Pfad umgestellt.
//
// Verwendung im Kundenprojekt: app/admin/auth/callback/route.ts re-exportiert GET
// aus core-cms, z.B. `export { GET } from "core-cms/auth"`.
//
// Hinweis: richardprinz hat eine divergente Version dieser Datei (zusätzliches
// Error-Logging der Fehlerdetails). richardprinz wird NICHT auf diese Datei
// umgestellt (siehe Abschlussbericht).

import { createClient } from '../supabase/server'
import { NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/admin/update-password'

  if (searchParams.get('error')) {
    console.error("Auth callback received error from Supabase:", {
      error: searchParams.get('error'),
      error_code: searchParams.get('error_code'),
      description: searchParams.get('error_description')
    })
    return NextResponse.redirect(`${origin}/admin/login?error=${encodeURIComponent(searchParams.get('error_description') || 'Der Link ist ungültig oder abgelaufen')}`)
  }

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error("verifyOtp error:", error)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error("exchangeCodeForSession error:", error)
  }

  return NextResponse.redirect(`${origin}/admin/login?error=Der Link ist ungültig oder abgelaufen`)
}
