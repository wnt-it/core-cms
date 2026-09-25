'use server'

// Quelle: template/src/app/admin/login/actions.ts
// Import von createClient auf core-cms-internen relativen Pfad umgestellt.
//
// Hinweis: richardprinz hat eine divergente Version dieser Datei (abweichende
// Fehlerbehandlung beim Login). richardprinz wird NICHT auf diese Datei
// umgestellt (siehe Abschlussbericht).

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/admin/login?error=Bitte geben Sie E-Mail und Passwort ein')
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error("Login error from Supabase:", error)
    const errorMsg = error.message === 'Invalid login credentials'
      ? 'Zugangsdaten sind ungültig'
      : (error.message || 'Zugangsdaten sind ungültig')
    redirect(`/admin/login?error=${encodeURIComponent(errorMsg)}`)
  }

  revalidatePath('/admin', 'layout')
  redirect('/admin')
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Bitte geben Sie eine E-Mail-Adresse ein.' }
  }

  const { headers } = await import('next/headers')
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const origin = `${protocol}://${host}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/admin/auth/callback?next=/admin/update-password`,
  })

  if (error) {
    console.error("Password reset error", error)
    return { error: 'Fehler beim Senden der E-Mail. Ist die Adresse korrekt?' }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  if (!password || password.length < 6) {
    return { error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    console.error("Update password error", error)
    return { error: 'Fehler beim Aktualisieren des Passworts.' }
  }

  return { success: true }
}

// Ab hier: Konto-Verwaltung für bereits angemeldete Nutzer (E-Mail/Passwort ändern
// über /admin/konto). Anders als updatePassword oben (Passwort-vergessen-Link, der
// Kenntnis des alten Passworts gerade NICHT voraussetzen darf) verlangen diese beiden
// Funktionen das aktuelle Passwort zur erneuten Bestätigung, bevor die Änderung
// ausgeführt wird - Schutz gegen z.B. eine offen gelassene Browser-Session.

async function reauthenticate(supabase: Awaited<ReturnType<typeof createClient>>, currentPassword: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return { error: 'Nicht angemeldet.' as const }
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (error) {
    return { error: 'Aktuelles Passwort ist falsch.' as const }
  }
  return { user }
}

export async function updateOwnEmail(formData: FormData) {
  const supabase = await createClient()
  const newEmail = formData.get('email') as string
  const currentPassword = formData.get('currentPassword') as string

  if (!newEmail || !currentPassword) {
    return { error: 'Bitte neue E-Mail-Adresse und aktuelles Passwort angeben.' }
  }

  const reauth = await reauthenticate(supabase, currentPassword)
  if (reauth.error) {
    return { error: reauth.error }
  }

  const { headers } = await import('next/headers')
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = `${protocol}://${host}`

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${origin}/admin/auth/callback?next=/admin/konto` }
  )

  if (error) {
    console.error("Update email error", error)
    return { error: error.message || 'Fehler beim Ändern der E-Mail-Adresse.' }
  }

  return {
    success: true,
    message: 'Bestätigungslink wurde an die neue Adresse gesendet. Die E-Mail-Adresse ändert sich erst, wenn der Link bestätigt wurde.',
  }
}

export async function updateOwnPassword(formData: FormData) {
  const supabase = await createClient()
  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('password') as string

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return { error: 'Bitte aktuelles Passwort und ein neues Passwort (min. 6 Zeichen) angeben.' }
  }

  const reauth = await reauthenticate(supabase, currentPassword)
  if (reauth.error) {
    return { error: reauth.error }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    console.error("Update own password error", error)
    return { error: 'Fehler beim Ändern des Passworts.' }
  }

  return { success: true }
}
