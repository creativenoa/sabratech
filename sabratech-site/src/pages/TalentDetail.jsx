import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchTalent, fetchTalents, fetchBusinessTeam } from '../lib/data'
import TalentCard, { TalentImage, Badges } from '../components/TalentCard'
import { Phone, Mail, Globe, Pin, ArrowBack, Whatsapp, Linkedin, Github, Download } from '../components/Icons'

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

export default function TalentDetail() {
  const { id } = useParams()
  const [t, setT] = useState(undefined)
  const [all, setAll] = useState([])
  useEffect(() => { fetchTalent(id).then(d => setT(d ?? null)) }, [id])
  useEffect(() => { fetchTalents().then(setAll) }, [])
  const [team, setTeam] = useState([])
  useEffect(() => { fetchBusinessTeam(id).then(setTeam) }, [id])

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

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-12">
      <Link to="/search" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 transition hover:text-cyan">
        <ArrowBack className="h-4 w-4" />
        Back to the directory
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
                        {employer
                          ? <Link to={`/individual/${employer.id}`} className="font-semibold text-cyan transition hover:text-royal">{t.company}</Link>
                          : t.company}
                      </span>
                    )}
                  </>
                ) : t.title}
              </p>
            )}
            {t.bio && <p className="mt-4 leading-relaxed text-ink/70">{t.bio}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <Badges t={t} />
            </div>
            {isPerson && t.cv_url && (
              <div className="mt-6 flex flex-col items-center gap-1 md:items-start">
                <a href={t.cv_url} target="_blank" rel="noopener noreferrer" className="btn-accent !py-2.5 !text-sm">
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

          {(employees.length > 0 || unlisted.length > 0) && (
            <div className={t.description ? 'mt-10' : ''}>
              <p className="kicker">Our people in the directory</p>
              <div className="mt-3 flex flex-col gap-3">
                {employees.map(e => (
                  <div key={e.id} className="relative">
                    <TalentCard t={e} view="list" />
                    {ROLE_LABEL[roleOf(e.id)] && <span className="badge pointer-events-none absolute right-3 top-3 bg-navy text-white">{ROLE_LABEL[roleOf(e.id)]}</span>}
                  </div>
                ))}
                {unlisted.map((m, i) => (
                  <div key={'u' + i} className="card flex items-center gap-3 !p-4">
                    <span className="font-semibold text-navy">{m.member_name}</span>
                    {ROLE_LABEL[m.role] && <span className="badge bg-navy text-white">{ROLE_LABEL[m.role]}</span>}
                  </div>
                ))}
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
            {t.show_whatsapp !== false && <ContactLink href={t.whatsapp} icon={Whatsapp}>WhatsApp</ContactLink>}
            {t.show_email && t.email && <ContactLink href={`mailto:${t.email.split(/[ ,]+/)[0]}`} icon={Mail}>Email</ContactLink>}
          </div>
        </div>
      </div>
    </div>
  )
}
