'use server'

// Quelle: template/src/app/admin/logout/actions.ts
// Import von createClient auf core-cms-internen relativen Pfad umgestellt.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/admin/login')
}
