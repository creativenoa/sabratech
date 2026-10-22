import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { Menu, Close, Linkedin } from './Icons'
import SponsorModal from './SponsorModal'
import ContactModal from './ContactModal'
import AuthModal from './AuthModal'
import InstallPrompt from './InstallPrompt'
import { useEffect } from 'react'
import { fetchContent, txt, DEFAULT_CONTENT } from '../lib/data'
import { useAuth, signOut } from '../lib/auth'

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Search' },
  { to: '/ai', label: 'AI' },
  { to: '/blog', label: 'Blog' },
  { to: '/about', label: 'About' },
]

const navClass = ({ isActive }) =>
  `border-b-2 pb-0.5 text-sm font-semibold tracking-wide transition ${isActive ? 'border-cyan text-royal' : 'border-transparent text-ink/70 hover:text-navy'}`

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [sponsor, setSponsor] = useState(false)
  const [contact, setContact] = useState(false)
  const [authTab, setAuthTab] = useState(null)
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthed, user, profile, loading: authLoading } = useAuth()
  useEffect(() => { fetchContent().then(setContent) }, [])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const memberName = (profile?.full_name || '').trim().split(' ')[0] || user?.email || 'Member'
  const openAuth = tab => { setOpen(false); setAuthTab(tab) }
  const logOut = () => { setOpen(false); signOut().catch(() => {}) }

  return (
    <div className="flex min-h-screen flex-col">
      <header className={`sticky top-0 z-[1100] border-b transition-all duration-300 ${scrolled ? 'border-navy/5 bg-cream/5 backdrop-blur-md' : 'border-navy/10 bg-cream'}`}>
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-3 px-5 py-3.5">
          <Link to="/" onClick={() => setOpen(false)}>
            <img src="/logo-light.svg" alt="SabraTech — Israeli tech in Atlanta" className="h-10 w-auto md:h-11" />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={navClass}>{n.label}</NavLink>
            ))}
            <button onClick={() => setContact(true)} className="btn-outline !px-4 !py-2 !text-sm">Contact us</button>
            {authLoading ? null : isAuthed ? (
              <>
                <span className="max-w-[180px] truncate text-sm font-semibold text-navy">{memberName}</span>
                <button onClick={logOut} className="text-sm font-semibold tracking-wide text-ink/50 transition hover:text-navy">Log out</button>
              </>
            ) : (
              <>
                <button onClick={() => openAuth('login')} className="text-sm font-semibold tracking-wide text-ink/70 transition hover:text-navy">Log in</button>
                <button onClick={() => openAuth('signup')} className="btn-accent !px-4 !py-2 !text-sm">Join</button>
              </>
            )}
          </nav>
          <button className="text-navy md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <Close className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-navy/10 bg-cream px-5 pb-5 pt-2 md:hidden">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setOpen(false)}
                className={({ isActive }) => `block border-b border-navy/5 py-3.5 font-serif text-lg ${isActive ? 'text-cyan' : 'text-navy'}`}>
                {n.label}
              </NavLink>
            ))}
            <button onClick={() => { setContact(true); setOpen(false) }}
              className="block w-full border-b border-navy/5 py-3.5 text-left font-serif text-lg text-navy">
              Contact us
            </button>
            {authLoading ? null : isAuthed ? (
              <>
                <p className="block truncate border-b border-navy/5 py-3.5 font-serif text-lg text-navy">{memberName}</p>
                <button onClick={logOut}
                  className="block w-full border-b border-navy/5 py-3.5 text-left font-serif text-lg text-ink/50">
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
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <InstallPrompt />

      <footer className="bg-navy text-cream">
        <div className="mx-auto max-w-[1080px] px-5 py-12">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <img src="/logo-dark.svg" alt="SabraTech" className="h-12 w-auto" />
              <p className="mt-3 text-sm text-cream/60">{txt(content,'footer_tagline')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setSponsor(true)}
                className="inline-flex items-center gap-2.5 rounded-md bg-cyan px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cream hover:text-navy">
                {txt(content,'sponsor_title')}
              </button>
              <Link to="/apply"
                className="inline-flex items-center gap-2.5 rounded-md border border-cream/30 px-5 py-2.5 text-sm font-semibold transition hover:bg-cream hover:text-navy">
                Join
              </Link>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-cream/15 pt-5 text-xs text-cream/40 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} SabraTech · Built by Creative Noa</span>
            <span className="flex items-center gap-4">
              <Link to="/disclaimer" className="transition hover:text-cream/70">Disclaimer</Link>
              <Link to="/admin" className="transition hover:text-cream/70">Admin</Link>
            </span>
          </div>
        </div>
      </footer>

      {contact && <ContactModal onClose={() => setContact(false)} />}
      {sponsor && <SponsorModal onClose={() => setSponsor(false)} />}
      <AuthModal open={!!authTab} onClose={() => setAuthTab(null)} initialTab={authTab || 'login'} />
    </div>
  )
}
