// SabraTech data client — now backed by Neon (Data API + Neon Auth).
// The SupabaseAuthAdapter keeps the exact same API surface the app was written
// against, so `supabase` / `hasSupabase` keep their names and every call site
// (.from(), .auth.getSession(), .auth.onAuthStateChange(), …) works unchanged.
// allowAnonymous lets public pages (Home, Apply, Disclaimer) read/insert under
// the `anonymous` RLS role without a login.
import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js'

// Auth goes through OUR domain (/neon-auth proxy in vercel.json; vite proxy in
// dev) so the login cookie is first-party — survives browser restarts and works
// in Safari. VITE_NEON_AUTH_URL exists only as an emergency override.
const authUrl = import.meta.env.VITE_NEON_AUTH_URL
  || (typeof window !== 'undefined' ? `${window.location.origin}/neon-auth` : '')
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL

export const supabase = authUrl && dataApiUrl
  ? createClient({
      auth: { adapter: SupabaseAuthAdapter(), url: authUrl, allowAnonymous: true },
      dataApi: { url: dataApiUrl },
    })
  : null

export const hasSupabase = !!supabase

// Exposed for the password-reset page (it needs the raw auth endpoint).
export const neonAuthUrl = authUrl || ''
