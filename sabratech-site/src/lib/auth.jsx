import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hasSupabase } from './supabase'
import { flushPush } from './push'

const AuthContext = createContext(null)

// The Neon auth adapter does not emit change events after the initial one, so
// the auth actions below ping the provider directly through this tiny bus —
// otherwise the header/pages only update after a manual refresh.
const authListeners = new Set()
const notifyAuthChange = () => { for (const fn of authListeners) fn() }

// Never throws — a failed/missing profile row simply resolves to null.
const loadProfile = async userId => {
  if (!hasSupabase || !userId) return null
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    return error ? null : data || null
  } catch { return null }
}

// Neon Auth has no signup trigger, so the app owns the profile row (decision
// 2026-08-18). Called whenever a session exists but no profile row does —
// covers fresh signups, re-registrations, and any earlier failed insert.
// Never throws; RLS only allows inserting your own row as pending.
const ensureProfile = async user => {
  if (!hasSupabase || !user?.id) return null
  try {
    // status/is_admin are set by the database (pending by default, admin via
    // allowlist trigger) — the client is not allowed to send them.
    await supabase.from('profiles').insert([{
      id: user.id,
      email: user.email || '',
      full_name: user.name || user.user_metadata?.full_name || user.user_metadata?.fullName || '',
    }])
  } catch { /* duplicate or RLS block — the re-select below decides */ }
  return loadProfile(user.id)
}

// The member's own individual listing (id/status only). Every member must
// have one before using the site. undefined = couldn't check (never lock
// anyone out on a network hiccup), null = none yet.
const loadMyListing = async userId => {
  if (!hasSupabase || !userId) return null
  try {
    const { data, error } = await supabase.from('talents').select('id, status, published')
      .eq('owner_id', userId).eq('type', 'individual').limit(1)
    return error ? undefined : data?.[0] || null
  } catch { return undefined }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [listing, setListing] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabase) { setLoading(false); return }
    let active = true

    const apply = async s => {
      let p = s?.user ? await loadProfile(s.user.id) : null
      if (s?.user && !p) p = await ensureProfile(s.user)
      const l = s?.user ? await loadMyListing(s.user.id) : null
      if (!active) return
      setSession(s || null)
      setProfile(p)
      setListing(l)
      setLoading(false)
    }

    supabase.auth.getSession()
      .then(({ data }) => apply(data?.session || null))
      .catch(() => { if (active) setLoading(false) })

    // Deferred to a macrotask: calling supabase inside the callback can deadlock the auth lock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setTimeout(() => { apply(s || null) }, 0)
    })

    // Re-check the session whenever signIn/signUp/signOut below completes.
    const refresh = () => {
      supabase.auth.getSession()
        .then(({ data }) => apply(data?.session || null))
        .catch(() => {})
    }
    authListeners.add(refresh)

    return () => {
      active = false
      authListeners.delete(refresh)
      sub?.subscription?.unsubscribe()
    }
  }, [])

  const refreshProfile = async () => {
    const p = await loadProfile(session?.user?.id)
    setProfile(p)
    return p
  }

  const refreshListing = async () => {
    const l = await loadMyListing(session?.user?.id)
    setListing(l)
    return l
  }

  const isAuthed = !!session
  const isApproved = profile?.status === 'approved'
  const isAdmin = isApproved && profile?.is_admin === true

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    isAuthed,
    isApproved,
    isAdmin,
    refreshProfile,
    listing,
    needsProfile: !!session && listing === null,
    refreshListing,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// Neon Auth wants `name` on the account; the profile row is created right
// after signup (no DB trigger — decision 2026-08-18).
export async function signUp({ email, password, fullName }) {
  if (!hasSupabase) throw new Error('Database not connected')
  const name = (fullName || '').trim()
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name, displayName: name } },
  })
  if (error) throw error
  if (data?.user) {
    try {
      await supabase.from('profiles').insert([{
        id: data.user.id,
        email: email.trim(),
        full_name: name,
      }])
    } catch { /* AuthProvider self-heals a missing row on next load */ }
    flushPush({ force: true }) // tells admins about the new member
  }
  notifyAuthChange()
  return data
}

export async function signIn({ email, password }) {
  if (!hasSupabase) throw new Error('Database not connected')
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  notifyAuthChange()
  return data
}

export async function signOut() {
  // Admin banners hidden with "x" only stay hidden for one login.
  try { sessionStorage.removeItem('sabratech_admin_dismissed') } catch { /* ignore */ }
  if (!hasSupabase) return
  const { error } = await supabase.auth.signOut()
  notifyAuthChange()
  if (error) throw error
}

export async function resetPassword(email) {
  if (!hasSupabase) throw new Error('Database not connected')
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: typeof window === 'undefined' ? undefined : `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}
