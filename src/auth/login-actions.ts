'use server'

// Quelle: template/src/app/admin/login/actions.ts
// Import von createClient auf core-cms-internen relativen Pfad umgestellt.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'
import { authErrorMessage, PASSWORD_RULES_HINT } from './auth-errors'

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
    const errorMsg = authErrorMessage(error, 'Anmeldung fehlgeschlagen. Bitte später erneut versuchen.')
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
    return { error: authErrorMessage(error, 'Die E-Mail konnte nicht gesendet werden. Bitte die Adresse prüfen und später erneut versuchen.') }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  if (!password || password.length < 10) {
    return { error: 'Das Passwort muss mindestens 10 Zeichen lang sein. ' + PASSWORD_RULES_HINT }
  }

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    console.error("Update password error", error)
    return { error: authErrorMessage(error, 'Das Passwort konnte nicht geändert werden. Möglicherweise ist der Link abgelaufen, bitte einen neuen anfordern.') }
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
    // Nur bei falschem Passwort so melden; andere Gründe (zu viele Versuche, Sperre) nennen
    if (error.code === 'invalid_credentials' || error.message === 'Invalid login credentials') {
      return { error: 'Aktuelles Passwort ist falsch.' as const }
    }
    return { error: authErrorMessage(error, 'Das aktuelle Passwort konnte nicht geprüft werden. Bitte später erneut versuchen.') as string }
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
    return { error: authErrorMessage(error, 'Die E-Mail-Adresse konnte nicht geändert werden. Bitte später erneut versuchen.') }
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

  if (!currentPassword || !newPassword || newPassword.length < 10) {
    return { error: 'Bitte aktuelles Passwort und ein neues Passwort angeben. ' + PASSWORD_RULES_HINT }
  }

  const reauth = await reauthenticate(supabase, currentPassword)
  if (reauth.error) {
    return { error: reauth.error }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    console.error("Update own password error", error)
    return { error: authErrorMessage(error, 'Das Passwort konnte nicht geändert werden. Bitte später erneut versuchen.') }
  }

  return { success: true }
}
