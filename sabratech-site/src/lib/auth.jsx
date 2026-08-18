import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hasSupabase } from './supabase'

const AuthContext = createContext(null)

// Never throws — a failed/missing profile row simply resolves to null.
const loadProfile = async userId => {
  if (!hasSupabase || !userId) return null
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    return error ? null : data || null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabase) { setLoading(false); return }
    let active = true

    const apply = async s => {
      const p = s?.user ? await loadProfile(s.user.id) : null
      if (!active) return
      setSession(s || null)
      setProfile(p)
      setLoading(false)
    }

    supabase.auth.getSession()
      .then(({ data }) => apply(data?.session || null))
      .catch(() => { if (active) setLoading(false) })

    // Deferred to a macrotask: calling supabase inside the callback can deadlock the auth lock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setTimeout(() => { apply(s || null) }, 0)
    })

    return () => {
      active = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  const refreshProfile = async () => {
    const p = await loadProfile(session?.user?.id)
    setProfile(p)
    return p
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

// fullName rides in options.data so the auth.users trigger can copy it into profiles.
export async function signUp({ email, password, fullName }) {
  if (!hasSupabase) throw new Error('Database not connected')
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { fullName: (fullName || '').trim(), full_name: (fullName || '').trim() } },
  })
  if (error) throw error
  return data
}

export async function signIn({ email, password }) {
  if (!hasSupabase) throw new Error('Database not connected')
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!hasSupabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function resetPassword(email) {
  if (!hasSupabase) throw new Error('Database not connected')
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: typeof window === 'undefined' ? undefined : window.location.origin,
  })
  if (error) throw error
}
