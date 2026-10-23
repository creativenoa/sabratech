import { useRef, useState } from 'react'
import { NavLink, Outlet, Link, Navigate, useLocation } from 'react-router-dom'
import { Menu, Close, Linkedin } from './Icons'
import SponsorModal from './SponsorModal'
import ContactModal from './ContactModal'
import AuthModal from './AuthModal'
import { useScrollLock } from './Dialog'
import { ADMIN_PATH } from '../lib/adminPath'
import InstallPrompt from './InstallPrompt'
import { useEffect } from 'react'
import { fetchContent, txt, DEFAULT_CONTENT } from '../lib/data'
import { useAuth, signOut } from '../lib/auth'
import AccountMenu, { AlertBell, ACCOUNT_LINKS, memberDisplayName } from './AccountMenu'

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Search' },
  { to: '/events', label: 'Events' },
  { to: '/ai', label: 'AI' },
  { to: '/blog', label: 'Blog' },
  { to: '/about', label: 'About' },
]

// Logged-in members must finish their individual profile before anything else.
const OPEN_WHILE_ONBOARDING = ['/profile', '/account', '/reset-password', '/disclaimer']
function ProfileGate({ children }) {
  const { loading, needsProfile } = useAuth()
  const { pathname, search } = useLocation()
  if (!loading && needsProfile && !OPEN_WHILE_ONBOARDING.includes(pathname)) return <Navigate to="/profile" replace />
  if (!loading && needsProfile && pathname === '/profile' && search.includes('tab=')) return <Navigate to="/profile" replace />
  return children
}

const navClass = ({ isActive }) =>
  `border-b-2 pb-0.5 text-sm font-semibold tracking-wide transition ${isActive ? 'border-cyan text-royal' : 'border-transparent text-ink/70 hover:text-navy'}`

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [sponsor, setSponsor] = useState(false)
  const [contact, setContact] = useState(false)
  const [authTab, setAuthTab] = useState(null)
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthed, isAdmin, user, profile, loading: authLoading } = useAuth()
  useEffect(() => { fetchContent().then(setContent) }, [])
  // Freeze the page behind the open mobile menu.
  useScrollLock(open)
  // Escape closes the mobile menu.
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') { setOpen(false); menuBtn.current?.focus() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  // Pop-ups opened from the mobile menu hand focus back to the ☰ button when they close.
  const menuBtn = useRef(null)
  const fromMenu = useRef(false)
  const returnTo = () => (fromMenu.current ? menuBtn.current : undefined)
  const closeContact = () => setContact(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const memberName = memberDisplayName(profile, user)
  const openAuth = tab => { fromMenu.current = open; setOpen(false); setAuthTab(tab) }
  const openContact = () => { fromMenu.current = open; setContact(true); setOpen(false) }
  const openSponsor = () => { fromMenu.current = false; setSponsor(true) }
  const logOut = () => { setOpen(false); signOut().catch(() => {}) }

  return (
    <div className="flex min-h-screen flex-col">
      <header className={`sticky top-0 z-[1100] border-b transition-all duration-300 ${scrolled ? 'border-navy/5 bg-cream/5 backdrop-blur-md' : 'border-navy/10 bg-cream'}`}>
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-3 px-5 py-3.5">
          <Link to="/" onClick={() => setOpen(false)}>
            <img src="/logo-light.svg" alt="SabraTech — Israeli tech in Atlanta" className="h-10 w-auto md:h-11" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={navClass}>{n.label}</NavLink>
            ))}
            <button onClick={openContact} className="btn-outline whitespace-nowrap !px-4 !py-2 !text-sm">Contact us</button>
            {authLoading ? null : isAuthed ? (
              <div className="flex items-center gap-1">
                <AlertBell />
                <AccountMenu />
              </div>
            ) : (
              <>
                <button onClick={() => openAuth('login')} className="whitespace-nowrap text-sm font-semibold tracking-wide text-ink/70 transition hover:text-navy">Log in</button>
                <button onClick={() => openAuth('signup')} className="btn-accent whitespace-nowrap !px-4 !py-2 !text-sm">Join</button>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2 lg:hidden">
            {!authLoading && isAuthed && <AlertBell />}
            <button ref={menuBtn} className="p-1 text-navy" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu">
              {open ? <Close className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu: slides in from the right, under the ☰ button. Lives outside the
          header because the header's blur effect would trap a fixed panel inside it. */}
      <div className={`fixed inset-0 z-[1200] transition-[visibility] duration-300 lg:hidden ${open ? 'visible' : 'pointer-events-none invisible'}`}>
        <div onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-navy/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
        <nav id="mobile-menu" aria-label="Mobile" className={`absolute inset-y-0 right-0 flex w-[82%] max-w-sm flex-col overflow-y-auto bg-cream px-5 pb-8 pt-4 shadow-[-12px_0_40px_-12px_rgba(40,49,94,0.35)] transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-end pb-2">
            <button className="text-navy" onClick={() => setOpen(false)} aria-label="Close menu">
              <Close className="h-6 w-6" />
            </button>
          </div>
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setOpen(false)}
                className={({ isActive }) => `block border-b border-navy/5 py-3.5 font-serif text-lg ${isActive ? 'text-cyan' : 'text-navy'}`}>
                {n.label}
              </NavLink>
            ))}
            <button onClick={openContact}
              className="block w-full border-b border-navy/5 py-3.5 text-left font-serif text-lg text-navy">
              Contact us
            </button>
            {authLoading ? null : isAuthed ? (
              <>
                <p className="mt-3 truncate pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">{memberName}</p>
                {ACCOUNT_LINKS.map(l => (
                  <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}
                    className={({ isActive }) => `block border-b border-navy/5 py-3.5 font-serif text-lg ${isActive ? 'text-cyan' : 'text-navy'}`}>
                    {l.label}
                  </NavLink>
                ))}
                {isAdmin && (
                  <NavLink to={ADMIN_PATH} onClick={() => setOpen(false)}
                    className={({ isActive }) => `block border-b border-navy/5 py-3.5 font-serif text-lg ${isActive ? 'text-cyan' : 'text-navy'}`}>
                    Admin
                  </NavLink>
                )}
                <button onClick={logOut}
                  className="block w-full border-b border-navy/5 py-3.5 text-left font-serif text-lg text-ink/70">
                  Log out
                </button>
              </>
            ) : (
              <>
                <button onClick={() => openAuth('login')}
                  className="block w-full border-b border-navy/5 py-3.5 text-left font-serif text-lg text-navy">
                  Log in
                </button>
                <button onClick={() => openAuth('signup')}
                  className="block w-full border-b border-navy/5 py-3.5 text-left font-serif text-lg text-navy">
                  Join
                </button>
              </>
            )}
          </nav>
      </div>

      <main className="flex-1"><ProfileGate><Outlet /></ProfileGate></main>

      <InstallPrompt />

      <footer className="bg-navy text-cream">
        <div className="mx-auto max-w-[1080px] px-5 py-12">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <img src="/logo-dark.svg" alt="SabraTech" className="h-12 w-auto" />
              <p className="mt-3 text-sm text-cream/70">{txt(content,'footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={openSponsor}
                className="inline-flex items-center gap-2.5 rounded-md bg-cyan px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cream hover:text-navy">
                {txt(content,'sponsor_title')}
              </button>
              <Link to="/apply"
                className="inline-flex items-center gap-2.5 rounded-md border border-cream/30 px-5 py-2.5 text-sm font-semibold transition hover:bg-cream hover:text-navy">
                Join
              </Link>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-cream/15 pt-5 text-xs text-cream/70 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} SabraTech · Built by Creative Noa</span>
            <span className="flex items-center gap-4">
              <Link to="/disclaimer" className="underline-offset-4 transition hover:text-cream hover:underline">Disclaimer</Link>
            </span>
          </div>
        </div>
      </footer>

      {contact && <ContactModal onClose={closeContact} returnFocusTo={returnTo} />}
      {sponsor && <SponsorModal onClose={() => setSponsor(false)} />}
      <AuthModal open={!!authTab} onClose={() => setAuthTab(null)} initialTab={authTab || 'login'} returnFocusTo={returnTo} />
    </div>
  )
}
