import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchTalents, fetchDirectoryCounts, fetchCategories, fetchContent, weeklyFeatured, txt, DEFAULT_CATEGORIES, DEFAULT_CONTENT } from '../lib/data'
import { TalentImage, Badges } from '../components/TalentCard'
import { Search, Arrow } from '../components/Icons'
import LoginCard from '../components/LoginCard'
import { useAuth } from '../lib/auth'

export default function Home() {
  const navigate = useNavigate()
  const { isApproved, loading: authLoading } = useAuth()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [stats, setStats] = useState({ companies: '—', individuals: '—' })
  const [cats, setCats] = useState(DEFAULT_CATEGORIES)
  const [featured, setFeatured] = useState(null)
  const [content, setContent] = useState(DEFAULT_CONTENT)

  // Everyone sees the two counts; only approved members load actual listings.
  useEffect(() => { fetchDirectoryCounts().then(c => c && setStats(c)) }, [])
  useEffect(() => {
    if (isApproved) fetchTalents().then(ts => setFeatured(weeklyFeatured(ts)))
  }, [isApproved])
  useEffect(() => {
    fetchCategories().then(setCats)
    fetchContent().then(setContent)
  }, [])

  const go = e => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (type) p.set('type', type)
    navigate(`/search?${p.toString()}`)
  }

  const heroTitle = txt(content,'home_hero_title')
  const heroComma = heroTitle.indexOf(',')
  const heroLine1 = heroComma === -1 ? '' : heroTitle.slice(0, heroComma + 1)
  const heroRest = heroComma === -1 ? heroTitle : heroTitle.slice(heroComma + 1).trim()
  const heroWords = heroRest.split(' ')

  return (
    <>
      <section className="border-b border-navy/10 bg-[linear-gradient(to_bottom,#F5F5F5_0%,#F5F5F5_70%,#FFFFFF_100%)]">
        <div className="mx-auto max-w-[1080px] px-5 pb-16 pt-24 md:pb-24 md:pt-40">
          <div className="max-w-4xl">
            <p className="kicker">{txt(content,'home_hero_kicker')}</p>
            <h1 className="mt-5 break-words font-serif text-[clamp(2rem,9vw,3rem)] font-600 leading-[1.12] tracking-[-0.02em] text-ink md:text-7xl">
              {heroLine1 && <span className="block">{heroLine1}</span>}
              <span className="block">
                {heroWords.slice(0, -1).join(' ')}{' '}
                <span className="text-cyan">{heroWords.slice(-1)}</span>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">{txt(content,'home_hero_sub')}</p>
          </div>

          {authLoading ? (
            <div className="mt-10 h-[78px] max-w-2xl" />
          ) : isApproved ? (
            <form onSubmit={go} className="card mt-10 flex max-w-2xl flex-col gap-3 !bg-white p-3 sm:flex-row sm:items-center">
              <select aria-label="I am looking for" className="input !w-full !border-0 !bg-cream !py-3 text-sm font-semibold sm:!w-44"
                value={type} onChange={e => setType(e.target.value)}>
                <option value="">Everyone</option>
                <option value="company">Startups</option>
                <option value="individual">Individuals</option>
              </select>
              <div className="relative flex-1">
                <input className="input !border-0 !pl-11" placeholder={txt(content,'home_search_placeholder')}
                  value={q} onChange={e => setQ(e.target.value)} />
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/30" />
              </div>
              <button type="submit" className="btn-accent sm:!px-7">Search</button>
            </form>
          ) : (
            <LoginCard />
          )}
        </div>
      </section>

      <section className="border-b border-navy/10 bg-white">
        <div className="mx-auto grid max-w-[1080px] grid-cols-2 divide-x divide-navy/10 px-5">
          {[
            [stats.companies, 'Israeli startups'],
            [stats.individuals, 'Individual', 'Entrepreneur, tech executive, investor, etc.'],
          ].map(([n, t, sub]) => (
            <div key={t} className="py-10 text-center">
              <p className="font-serif text-4xl text-cyan md:text-5xl">{n}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">{t}</p>
              {sub && <p className="mt-1 text-[11px] leading-snug text-ink/40">{sub}</p>}
            </div>
          ))}
        </div>
      </section>

      {isApproved && featured && (
        <section className="mx-auto max-w-[1080px] px-5 py-16">
          <p className="kicker">{txt(content,'home_featured_kicker')}</p>
          <Link to={`/individual/${featured.id}`}
            className="card group mt-4 flex flex-col items-center gap-8 !bg-white p-8 md:flex-row md:p-10">
            <TalentImage t={featured} round={featured.type === 'individual'} className="h-36 w-36 shrink-0 md:h-44 md:w-44" />
            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan md:justify-start">
                {featured.category}
              </p>
              <h2 className="mt-2 font-serif text-3xl text-navy md:text-4xl">{featured.name}</h2>
              {(featured.title || featured.company) && (
                <p className="mt-1 font-semibold text-ink/60">
                  {featured.type === 'individual' ? [featured.title, featured.company].filter(Boolean).join(' at ') : featured.title}
                </p>
              )}
              <p className="mt-3 line-clamp-3 leading-relaxed text-ink/70">{featured.bio || featured.description}</p>
              <span className="mt-4 inline-flex items-center justify-center gap-2 md:justify-start"><Badges t={featured} /></span>
            </div>
            <Arrow className="hidden h-7 w-7 shrink-0 text-navy/20 transition group-hover:text-cyan md:block" />
          </Link>
          <p className="mt-3 text-center text-xs text-ink/40 md:text-left">{txt(content,'home_featured_note')}</p>
        </section>
      )}

      <section className="mx-auto max-w-[1080px] px-5 py-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="kicker">{txt(content,'home_fields_kicker')}</p>
            <h2 className="mt-2 font-serif text-3xl text-navy md:text-4xl">{txt(content,'home_fields_title')}</h2>
          </div>
          <Link to="/search" className="hidden border-b border-navy/30 pb-0.5 text-sm font-semibold text-navy transition hover:border-cyan hover:text-cyan md:block">
            Browse everyone
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {cats.filter(c => c !== 'Other').map(cat => (
            <Link key={cat} to={`/search?cat=${encodeURIComponent(cat)}`}
              className="rounded-md border border-navy/20 bg-white px-5 py-2.5 text-sm font-semibold text-navy transition hover:border-cyan hover:bg-cyan hover:text-white">
              {cat}
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
