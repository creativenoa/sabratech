import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { fetchTalent, fetchTalents, fetchBusinessTeam, fetchMemberBusinesses, fileUrl } from '../lib/data'
import { TalentImage, Badges } from '../components/TalentCard'
import { Building, User, Phone, Mail, Globe, Pin, ArrowBack, Whatsapp, Linkedin, Github, Download } from '../components/Icons'

function ContactLink({ href, icon: Icon, children }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-md border border-navy/15 bg-white px-4 py-3.5 text-sm font-semibold text-navy transition hover:border-cyan hover:bg-cyan hover:text-white">
      <Icon className="h-5 w-5" />
      {children}
    </a>
  )
}

// WhatsApp is often saved as a bare number ("404-555-1234"). A bare number used as a
// link points at a page on our own site ("Profile not found"), so turn it into wa.me.
// 10 digits = US number → add the +1 country code.
function whatsappHref(v) {
  if (!v) return null
  const s = String(v).trim()
  if (/^https?:\/\//i.test(s)) return s
  if (/^(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i.test(s)) return 'https://' + s
  let digits = s.replace(/\D/g, '')
  if (digits.length === 10) digits = '1' + digits
  return digits.length >= 8 ? `https://wa.me/${digits}` : null
}

const ROLE_NAMES = { owner: 'Owner', manager: 'Manager' }

// A person or business as a small clickable pill (photo/logo + name + role).
function EntityPill({ to, name, photo, role, sub, kind }) {
  const Icon = kind === 'company' ? Building : User
  const inner = (
    <>
      {photo
        ? <img src={fileUrl(photo)} alt="" width={28} height={28} loading="lazy" decoding="async" className={`h-7 w-7 shrink-0 object-cover ${kind === 'company' ? 'rounded-md' : 'rounded-full'}`} />
        : <span className={`grid h-7 w-7 shrink-0 place-items-center bg-white ${kind === 'company' ? 'rounded-md' : 'rounded-full'}`}><Icon className="h-4 w-4 text-navy/40" /></span>}
      <span className="min-w-0 text-left leading-tight">
        <span className="block truncate text-sm font-bold">{name}</span>
        {(sub || ROLE_NAMES[role]) && <span className="block truncate text-[11px] font-semibold opacity-70">{[ROLE_NAMES[role], sub].filter(Boolean).join(' · ')}</span>}
      </span>
    </>
  )
  const cls = 'inline-flex max-w-[260px] items-center gap-2 rounded-full bg-cyan/10 py-1 pl-1 pr-4 text-royal'
  return to
    ? <Link to={to} className={`${cls} transition hover:bg-cyan hover:text-white`}>{inner}</Link>
    : <span className={cls}>{inner}</span>
}

export default function TalentDetail() {
  const { id } = useParams()
  // Opened from the Profile page? Offer the way back there instead of the directory.
  const { state } = useLocation()
  const back = state?.backTo ? { to: state.backTo, label: state.backLabel || 'Back' } : { to: '/search', label: 'Back to the directory' }
  const [t, setT] = useState(undefined)
  const [all, setAll] = useState([])
  useEffect(() => { fetchTalent(id).then(d => setT(d ?? null)) }, [id])
  useEffect(() => { fetchTalents().then(setAll) }, [])
  const [team, setTeam] = useState([])
  useEffect(() => { fetchBusinessTeam(id).then(setTeam) }, [id])
  const [memberOf, setMemberOf] = useState([])
  useEffect(() => { fetchMemberBusinesses(id).then(setMemberOf) }, [id])

  if (t === undefined) return <p className="py-24 text-center text-ink/40">Loading…</p>
  if (!t) return (
    <div className="py-24 text-center">
      <p className="font-serif text-3xl text-navy">Profile not found</p>
      <Link to="/search" className="btn-primary mt-8">Back to the directory</Link>
    </div>
  )

  const isPerson = t.type === 'individual'
  const site = t.website && (t.website.startsWith('http') ? t.website : 'https://' + t.website)
  const linkedin = t.linkedin && (t.linkedin.startsWith('http') ? t.linkedin : 'https://' + t.linkedin)
  const github = t.github && (t.github.startsWith('http') ? t.github : 'https://' + t.github)
  const posts = Array.isArray(t.posts) ? t.posts.filter(p => p && p.url) : []

  // Link individuals ↔ companies by (normalized) company name
  const norm = s => (s || '').trim().toLowerCase()
  const employer = isPerson && t.company
    ? all.find(x => x.type === 'company' && norm(x.name) === norm(t.company))
    : null
  // People who joined this business on SabraTech, plus anyone whose listing
  // names it as their company (older listings, before teams existed).
  const teamIds = new Set(team.map(m => String(m.individual_id)).filter(x => x !== 'null'))
  const employees = !isPerson
    ? all.filter(x => x.type === 'individual' && (teamIds.has(String(x.id)) || norm(x.company) === norm(t.name)))
    : []
  const ROLE_LABEL = { owner: 'Owner', manager: 'Manager' }
  const roleOf = pid => team.find(m => String(m.individual_id) === String(pid))?.role
  const unlisted = team.filter(m => !m.individual_id)

  // Person page: their businesses as pills (team memberships, plus the
  // company named on their listing if it's in the directory).
  const bizPills = isPerson ? [
    ...memberOf.map(m => ({ id: m.business_id, name: m.business_name, photo: m.business_photo, role: m.role })),
    ...(employer && !memberOf.some(m => String(m.business_id) === String(employer.id))
      ? [{ id: employer.id, name: employer.name, photo: employer.photo_url }] : []),
  ] : []
  // Business page: its people as pills.
  const peoplePills = !isPerson ? [
    ...employees.map(e => ({ id: e.id, name: e.name, photo: e.photo_url, title: e.title, role: roleOf(e.id) })),
    ...unlisted.map(m => ({ id: null, name: m.member_name, role: m.role })),
  ] : []

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-12">
      <Link to={back.to} className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 transition hover:text-cyan">
        <ArrowBack className="h-4 w-4" />
        {back.label}
      </Link>

      {/* Resume-style header */}
      <div className="card mt-8 !bg-white p-8 md:p-10">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
          <TalentImage t={t} round={isPerson} className={isPerson ? 'h-40 w-40 shrink-0 md:h-48 md:w-48' : 'h-40 w-56 shrink-0'} />
          <div className="min-w-0 flex-1 text-center md:text-left">
            <p className="flex items-center justify-center gap-2 md:justify-start">
              <span className="kicker">{t.category}</span>
            </p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-navy md:text-5xl">{t.name}</h1>
            {(t.title || t.company) && (
              <p className="mt-2 text-lg font-semibold text-ink/70">
                {isPerson ? (
                  <>
                    {t.title}
                    {t.company && (
                      <span className="text-ink/50">
                        {' at '}
                        {t.company}
                      </span>
                    )}
                  </>
                ) : t.title}
              </p>
            )}
            {bizPills.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {bizPills.map(b => <EntityPill key={'b' + b.id} to={`/individual/${b.id}`} name={b.name} photo={b.photo} role={b.role} kind="company" />)}
              </div>
            )}
            {t.bio && <p className="mt-4 leading-relaxed text-ink/70">{t.bio}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <Badges t={t} />
            </div>
            {isPerson && t.cv_url && (
              <div className="mt-6 flex flex-col items-center gap-1 md:items-start">
                <a href={fileUrl(t.cv_url)} target="_blank" rel="noopener noreferrer" className="btn-accent !py-2.5 !text-sm">
                  <Download className="h-4 w-4" />
                  Download CV
                </a>
                {t.cv_updated_at && (
                  <span className="text-xs text-ink/40">
                    Last updated {new Date(t.cv_updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {t.skills?.length > 0 && (
          <div className="mt-8 border-t border-navy/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/40">{isPerson ? 'Skills & stack' : 'Technologies'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.skills.map(s => <span key={s} className="tag !text-sm">{s}</span>)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_300px]">
        <div>
          {t.description && (
            <>
              <p className="kicker">{isPerson ? 'About me' : 'About the startup'}</p>
              <p className="mt-3 whitespace-pre-line leading-loose text-ink/75">{t.description}</p>
            </>
          )}

          {peoplePills.length > 0 && (
            <div className={t.description ? 'mt-10' : ''}>
              <p className="kicker">Our people in the directory</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {peoplePills.map((p, i) => <EntityPill key={'p' + (p.id ?? 'u' + i)} to={p.id ? `/individual/${p.id}` : null} name={p.name} photo={p.photo} role={p.role} sub={p.title} kind="individual" />)}
              </div>
            </div>
          )}

          {posts.length > 0 && (
            <div className="mt-10">
              <p className="kicker">Recent posts</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {posts.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                    className="card group overflow-hidden !p-0">
                    {p.image && <div className="h-32 w-full overflow-hidden"><img src={p.image} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" /></div>}
                    <p className="p-4 text-sm font-semibold text-navy group-hover:text-cyan">{p.title || p.url}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="kicker">Connect</p>
          {t.address && t.show_on_map !== false && (
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink/60">
              <Pin className="h-4 w-4 text-cyan" /> {t.address}
            </p>
          )}
          <div className="mt-4 grid gap-2.5">
            <ContactLink href={linkedin} icon={Linkedin}>LinkedIn</ContactLink>
            {site && <ContactLink href={site} icon={Globe}>Website</ContactLink>}
            <ContactLink href={github} icon={Github}>GitHub</ContactLink>
            {t.show_phone && t.phone && <ContactLink href={`tel:${t.phone.replace(/\D/g, '')}`} icon={Phone}>Phone</ContactLink>}
            {t.show_whatsapp !== false && <ContactLink href={whatsappHref(t.whatsapp)} icon={Whatsapp}>WhatsApp</ContactLink>}
            {t.show_email && t.email && <ContactLink href={`mailto:${t.email.split(/[ ,]+/)[0]}`} icon={Mail}>Email</ContactLink>}
          </div>
        </div>
      </div>
    </div>
  )
}
