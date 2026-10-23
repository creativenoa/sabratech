import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import AuthModal from './AuthModal'
import { ACCOUNT_LINKS } from './AccountMenu'

// Frame for the four account pages: login required (pending members allowed —
// they can still manage their account), side nav on desktop, tabs on phones.
export default function AccountShell({ title, intro, children }) {
  const { loading, isAuthed, profile, needsProfile } = useAuth()
  const [modal, setModal] = useState(false)

  if (loading) return <div className="min-h-[60vh]" />
  if (!isAuthed) return (
    <div className="mx-auto max-w-md px-5 py-28 text-center">
      <p className="kicker">SabraTech members</p>
      <h1 className="mt-2 font-serif text-3xl text-navy">Please log in</h1>
      <p className="mt-3 text-sm text-ink/60">Log in to manage your account.</p>
      <button onClick={() => setModal(true)} className="btn-accent mt-6">Log in</button>
      <AuthModal open={modal} onClose={() => setModal(false)} initialTab="login" />
    </div>
  )

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-10 md:py-14">
      {profile?.status === 'pending' && !needsProfile && (
        <p className="mb-6 rounded-md border border-cyan/30 bg-cyan/5 px-4 py-3 text-sm font-semibold text-navy">
          Your membership is waiting for approval. You can set up your account and listing now — the directory opens once you're approved.
        </p>
      )}
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <nav className="-mx-5 flex gap-1 overflow-x-auto px-5 md:mx-0 md:flex-col md:px-0">
          {ACCOUNT_LINKS.filter(l => !needsProfile || l.to === '/profile' || l.to === '/account').map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-bold transition ${isActive ? 'bg-navy text-white' : 'text-ink/60 hover:bg-white hover:text-navy'}`}>
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-navy md:text-4xl">{title}</h1>
          {intro && <p className="mt-2 text-ink/60">{intro}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}

// Small shared bits for the account pages.
export function Panel({ title, sub, children, tone, className = '' }) {
  return (
    <section className={`card !bg-white p-6 md:p-7 ${tone === 'danger' ? '!border-red-200' : ''} ${className}`}>
      {title && <h2 className={`font-serif text-xl ${tone === 'danger' ? 'text-red-700' : 'text-navy'}`}>{title}</h2>}
      {sub && <p className="mt-1 text-sm text-ink/55">{sub}</p>}
      <div className={title || sub ? 'mt-5' : ''}>{children}</div>
    </section>
  )
}

export function Note({ kind = 'ok', children }) {
  if (!children) return null
  const cls = kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-cyan/10 text-navy'
  return <p className={`rounded-md px-3 py-2 text-sm font-semibold ${cls}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>
}

export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-cyan' : 'bg-navy/20'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}
