// Next.js Middleware-Helfer: Auth-Session refreshen + /admin-Routen schützen.
// Quelle: template/src/utils/supabase/middleware.ts
//
// Hinweis: richardprinz hat eine divergente, erweiterte Version dieser Datei
// (zusätzlicher Redirect von /admin/login -> /admin wenn bereits eingeloggt).
// Diese Kern-Version bildet nur das template-Verhalten ab; richardprinz wird
// NICHT auf diese Datei umgestellt (siehe Abschlussbericht).

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  const url = rawUrl.trim().replace(/\/$/, '')
  const key = rawKey.trim()

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh auth token
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /admin routes (except login and recovery pages)
  const isAuthPage =
    request.nextUrl.pathname.startsWith('/admin/login') ||
    request.nextUrl.pathname.startsWith('/admin/forgot-password') ||
    request.nextUrl.pathname.startsWith('/admin/update-password') ||
    request.nextUrl.pathname.startsWith('/admin/auth')

  if (!user && request.nextUrl.pathname.startsWith('/admin') && !isAuthPage) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/admin/login'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
