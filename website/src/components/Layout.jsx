import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { Menu, Close, Facebook } from './Icons'

const NAV = [
  { to: '/', label: 'דף הבית' },
  { to: '/businesses', label: 'רשימת עסקים' },
  { to: '/discounts', label: 'הנחות בלעדיות' },
  { to: '/about', label: 'על הקהילה' },
  { to: '/join', label: 'הצטרפי אלינו' },
]

export const FB_GROUP = 'https://www.facebook.com/groups/1504188096828122'

export default function Layout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[1100] border-b border-navy/10 bg-cream/75 backdrop-blur-md">
        <div className="mx-auto grid max-w-[1080px] grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 md:grid-cols-[1fr_auto_1fr] md:px-12">
          <nav className="hidden items-center justify-start gap-5 md:flex">
            <NavLink to="/" end className={({ isActive }) => `border-b-2 pb-0.5 text-sm font-semibold tracking-wide transition ${isActive ? 'border-royal text-royal' : 'border-transparent text-ink/70 hover:text-navy'}`}>דף הבית</NavLink>
            <NavLink to="/about" className={({ isActive }) => `border-b-2 pb-0.5 text-sm font-semibold tracking-wide transition ${isActive ? 'border-royal text-royal' : 'border-transparent text-ink/70 hover:text-navy'}`}>על הקהילה</NavLink>
            <button title="English — coming soon" disabled className="cursor-not-allowed rounded-md border border-navy/20 px-2.5 py-1 text-xs font-semibold tracking-widest text-navy/40">EN</button>
            <a href={FB_GROUP} target="_blank" rel="noopener noreferrer" aria-label="קבוצת הפייסבוק של הקהילה" className="text-navy/70 transition hover:text-royal">
              <Facebook className="h-5 w-5" />
            </a>
          </nav>
          <button className="text-navy md:hidden" onClick={() => setOpen(!open)} aria-label="תפריט">
            {open ? <Close className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <Link to="/" className="justify-self-center" onClick={() => setOpen(false)}>
            <img src="/logo.png" alt="עצמאיות באטלנטה" className="h-11 w-auto md:h-12" />
          </Link>
          <nav className="hidden items-center justify-end gap-5 md:flex">
            {NAV.filter(n => n.to !== '/' && n.to !== '/about').map(n => (
              <NavLink key={n.to} to={n.to}
                className={({ isActive }) => `border-b-2 pb-0.5 text-sm font-semibold tracking-wide transition ${isActive ? 'border-royal text-royal' : 'border-transparent text-ink/70 hover:text-navy'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <span className="h-6 w-6 md:hidden" />
        </div>
        {open && (
          <nav className="border-t border-navy/10 bg-cream px-5 pb-5 pt-2 md:hidden">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setOpen(false)}
                className={({ isActive }) => `block border-b border-navy/5 py-3.5 font-serif text-lg ${isActive ? 'text-royal' : 'text-navy'}`}>
                {n.label}
              </NavLink>
            ))}
            <p className="pt-3 text-xs tracking-widest text-navy/40">ENGLISH — בקרוב</p>
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-navy text-cream">
        <div className="mx-auto max-w-[1080px] px-5 py-12">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="font-serif text-2xl">עצמאיות באטלנטה</p>
              <p className="mt-1 text-sm text-cream/60">קהילת בעלות העסקים הישראליות של אטלנטה רבתי</p>
            </div>
            <a href={FB_GROUP} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-md border border-cream/30 px-5 py-2.5 text-sm font-semibold transition hover:bg-cream hover:text-navy">
              <Facebook className="h-4 w-4" />
              קבוצת הפייסבוק של הקהילה
            </a>
          </div>
          <div className="mt-10 flex items-center justify-between border-t border-cream/15 pt-5 text-xs text-cream/40">
            <span>© {new Date().getFullYear()} עצמאיות באטלנטה · האתר נבנה ע"י <Link to="/business/27" className="font-semibold text-cream/70 transition hover:text-cream">Creative Noa</Link></span>
            <Link to="/disclaimer" className="transition hover:text-cream/70">הסרת אחריות</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
