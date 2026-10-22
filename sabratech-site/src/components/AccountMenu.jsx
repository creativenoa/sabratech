import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, signOut } from '../lib/auth'
import { countUnread, fetchAlerts, markRead } from '../lib/account'
import { Bell, Chevron, User, Building, Cog, Shield, Logout } from './Icons'

export const ACCOUNT_LINKS = [
  { to: '/account', label: 'My Account', icon: User },
  { to: '/profile', label: 'Profile', icon: Building },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Cog },
]

// Other parts of the app fire this after they change alerts (mark read, etc.).
export const ALERTS_EVENT = 'sabratech:alerts'
export const pingAlerts = () => window.dispatchEvent(new Event(ALERTS_EVENT))

export const memberDisplayName = (profile, user) =>
  (profile?.full_name || '').trim().split(' ')[0] || (user?.email || '').split('@')[0] || 'Member'

// Opens on hover (mouse) and on click/tap; Escape and click-outside close it.
function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const timer = useRef(null)
  const hoverAt = useRef(0)
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])
  useEffect(() => () => clearTimeout(timer.current), [])
  const hover = {
    // Mouse only — on touch screens a tap toggles it instead.
    onPointerEnter: e => { if (e.pointerType !== 'mouse') return; clearTimeout(timer.current); hoverAt.current = Date.now(); setOpen(true) },
    onPointerLeave: e => { if (e.pointerType !== 'mouse') return; clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 180) },
  }
  // A click right after hover-open keeps it open instead of toggling it shut.
  const toggle = () => setOpen(o => (o && Date.now() - hoverAt.current < 600 ? true : !o))
  return { open, setOpen, ref, hover, toggle }
}

const ago = iso => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso)) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24); return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString()
}

export function AlertBell() {
  const { isAuthed } = useAuth()
  const { open, setOpen, ref, hover, toggle } = useDropdown()
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthed) return
    let alive = true
    const refresh = () => countUnread().then(n => { if (alive) setUnread(n) })
    refresh()
    const id = setInterval(refresh, 60000)
    window.addEventListener(ALERTS_EVENT, refresh)
    window.addEventListener('focus', refresh)
    return () => { alive = false; clearInterval(id); window.removeEventListener(ALERTS_EVENT, refresh); window.removeEventListener('focus', refresh) }
  }, [isAuthed, location.pathname])

  useEffect(() => { if (open) fetchAlerts(6).then(setItems) }, [open])
  useEffect(() => { setOpen(false) }, [location.pathname])

  const go = async a => {
    setOpen(false)
    if (!a.read_at) { await markRead([a.id]).catch(() => {}); pingAlerts() }
    navigate(a.link || '/notifications')
  }
  const readAll = async () => {
    const ids = (items || []).filter(a => !a.read_at).map(a => a.id)
    await markRead(ids).catch(() => {})
    setItems(xs => (xs || []).map(a => ({ ...a, read_at: a.read_at || new Date().toISOString() })))
    pingAlerts()
  }

  if (!isAuthed) return null
  return (
    <div ref={ref} className="relative" {...hover}>
      <button onClick={toggle} aria-label={`Alerts${unread ? ` (${unread} unread)` : ''}`} aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-full text-navy transition hover:bg-navy/5">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[1200] pt-2">
          <div className="w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-navy/10 bg-white shadow-[0_20px_50px_-20px_rgba(40,49,94,0.45)]">
            <div className="flex items-center justify-between border-b border-navy/10 px-4 py-3">
              <p className="text-sm font-bold text-navy">Alerts</p>
              {items?.some(a => !a.read_at) && <button onClick={readAll} className="text-xs font-bold text-cyan hover:underline">Mark all read</button>}
            </div>
            {items === null ? <p className="px-4 py-6 text-center text-sm text-ink/40">Loading…</p>
              : items.length === 0 ? <p className="px-4 py-6 text-center text-sm text-ink/40">You're all caught up.</p>
              : items.map(a => (
                <button key={a.id} onClick={() => go(a)}
                  className={`flex w-full gap-3 border-b border-navy/5 px-4 py-3 text-left transition hover:bg-cream ${a.read_at ? '' : 'bg-cyan/5'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.read_at ? 'bg-transparent' : 'bg-cyan'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy">{a.title}</span>
                    {a.body && <span className="block truncate text-xs text-ink/50">{a.body}</span>}
                    <span className="block text-[11px] text-ink/40">{ago(a.created_at)}</span>
                  </span>
                </button>
              ))}
            <Link to="/notifications" className="block px-4 py-3 text-center text-sm font-bold text-cyan hover:bg-cream">See all alerts</Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AccountMenu() {
  const { user, profile, isAdmin } = useAuth()
  const { open, setOpen, ref, hover, toggle } = useDropdown()
  const location = useLocation()
  useEffect(() => { setOpen(false) }, [location.pathname])
  const name = memberDisplayName(profile, user)

  return (
    <div ref={ref} className="relative" {...hover}>
      <button onClick={toggle} aria-haspopup="menu" aria-expanded={open}
        className="flex max-w-[200px] items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-navy transition hover:bg-navy/5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-black uppercase text-cream">{name.slice(0, 1)}</span>
        <span className="truncate">{name}</span>
        <Chevron className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[1200] pt-2" role="menu">
          <div className="w-56 overflow-hidden rounded-lg border border-navy/10 bg-white py-1.5 shadow-[0_20px_50px_-20px_rgba(40,49,94,0.45)]">
            <p className="truncate px-4 pb-2 pt-1 text-xs text-ink/50">{user?.email}</p>
            {ACCOUNT_LINKS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} role="menuitem"
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition hover:bg-cream ${location.pathname === to ? 'text-cyan' : 'text-navy'}`}>
                <Icon className="h-4 w-4 text-ink/40" /> {label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-cream">
                <Shield className="h-4 w-4 text-ink/40" /> Admin
              </Link>
            )}
            <div className="my-1.5 border-t border-navy/10" />
            <button role="menuitem" onClick={() => { setOpen(false); signOut().catch(() => {}) }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-ink/60 transition hover:bg-cream hover:text-navy">
              <Logout className="h-4 w-4 text-ink/40" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
