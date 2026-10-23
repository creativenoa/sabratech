import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchTalents, fetchCategories, fetchContent, txt, DEFAULT_CATEGORIES, DEFAULT_CONTENT } from '../lib/data'
import TalentCard from '../components/TalentCard'
import MapView from '../components/MapView'
import { Search as SearchIcon } from '../components/Icons'

const TYPES = [['', 'All'], ['company', 'Startups'], ['individual', 'Individuals']]
const VIEWS = [['gallery', 'Gallery'], ['list', 'List']]
const PINNED_CATS = ['Entrepreneur', 'Startup', 'Investor', 'Mentor']

// Browser storage can be blocked (private mode etc.) — never let that break the page.
function readPref(store, key, fallback) {
  try { return store.getItem(key) ?? fallback } catch { return fallback }
}
function writePref(store, key, value) {
  try { store.setItem(key, value) } catch { /* ignore */ }
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [talents, setTalents] = useState([])
  const [loading, setLoading] = useState(true)
  // Gallery/List + Map on/off are remembered on this device; search text and
  // filters are remembered until the browser tab closes.
  const [view, setView] = useState(() => readPref(localStorage, 'sabra.search.view', 'gallery'))
  const [showMap, setShowMap] = useState(() => readPref(localStorage, 'sabra.search.map', 'on') !== 'off')
  const [cats, setCats] = useState(DEFAULT_CATEGORIES)
  const [content, setContent] = useState(DEFAULT_CONTENT)

  const q = params.get('q') || ''
  const cat = params.get('cat') || ''
  const type = params.get('type') || ''
  const flag = params.get('flag') || ''

  // Arriving with no filters in the address → bring back this tab's last ones.
  useEffect(() => {
    if ([...params.keys()].length) return
    const saved = readPref(sessionStorage, 'sabra.search.filters', '')
    if (saved) setParams(new URLSearchParams(saved), { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { writePref(sessionStorage, 'sabra.search.filters', params.toString()) }, [params])
  useEffect(() => { writePref(localStorage, 'sabra.search.view', view) }, [view])
  useEffect(() => { writePref(localStorage, 'sabra.search.map', showMap ? 'on' : 'off') }, [showMap])

  useEffect(() => {
    fetchTalents().then(t => { setTalents(t); setLoading(false) })
    fetchCategories().then(setCats)
    fetchContent().then(setContent)
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return talents.filter(t => {
      if (type && t.type !== type) return false
      if (cat && t.category !== cat) return false
      if (flag === 'hiring' && !t.hiring) return false
      if (flag === 'open' && !(t.open_to_work || t.freelance)) return false
      if (!needle) return true
      return [t.name, t.first_name, t.last_name, t.title, t.company, t.bio, t.description, t.category, ...(t.skills || [])]
        .some(f => (f || '').toLowerCase().includes(needle))
    })
  }, [talents, q, cat, type, flag])

  // Pinned four first (only if they exist), then the rest by how many talents use them, ties A-Z.
  const orderedCats = useMemo(() => {
    const counts = new Map()
    talents.forEach(t => {
      if (!t.category) return
      counts.set(t.category, (counts.get(t.category) || 0) + 1)
    })
    const pinned = PINNED_CATS.filter(c => cats.includes(c))
    return [
      ...pinned,
      ...cats.filter(c => !pinned.includes(c))
        .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b)),
    ]
  }, [cats, talents])

  const set = (k, v) => {
    const p = new URLSearchParams(params)
    v ? p.set(k, v) : p.delete(k)
    setParams(p, { replace: true })
  }

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-14">
      <p className="kicker">{txt(content,'search_kicker')}</p>
      <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">{txt(content,'search_title')}</h1>

      <div className="sticky top-[65px] z-[1000] -mx-5 mt-8 border-y border-navy/10 bg-cream/95 px-5 py-4 backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex overflow-hidden rounded-md border border-navy/20 bg-white">
              {TYPES.map(([v, label]) => (
                <button key={v} onClick={() => set('type', v)}
                  className={`px-4 py-2.5 text-sm font-semibold transition ${type === v ? 'bg-navy text-cream' : 'text-ink/50 hover:text-navy'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <input className="input !pl-12" placeholder="Search by name, role, skill, keyword…"
                value={q} onChange={e => set('q', e.target.value)} />
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/30" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="input !w-auto !py-2 text-sm font-semibold" value={cat} onChange={e => set('cat', e.target.value)}>
              <option value="">All fields</option>
              {orderedCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => set('flag', flag === 'hiring' ? '' : 'hiring')}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${flag === 'hiring' ? 'border-cyan bg-cyan text-white' : 'border-navy/20 bg-white text-ink/60 hover:border-cyan/60'}`}>
              Hiring now
            </button>
            <button onClick={() => set('flag', flag === 'open' ? '' : 'open')}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${flag === 'open' ? 'border-cyan bg-cyan text-white' : 'border-navy/20 bg-white text-ink/60 hover:border-cyan/60'}`}>
              Open to work
            </button>
            <button onClick={() => setShowMap(!showMap)}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${showMap ? 'border-navy bg-navy text-cream' : 'border-navy/20 bg-white text-ink/60 hover:border-navy/50'}`}>
              Map
            </button>
            <div className="ml-auto flex overflow-hidden rounded-md border border-navy/20 bg-white">
              {VIEWS.map(([v, label]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-4 py-2 text-sm font-semibold transition ${view === v ? 'bg-navy text-cream' : 'text-ink/50 hover:text-navy'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showMap && (
        <div className="mt-6">
          <MapView talents={filtered} />
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <p className="py-20 text-center text-ink/40">Loading the community…</p>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl text-navy">Nothing found</p>
            <p className="mt-2 text-ink/50">Try a different search, or clear a filter.</p>
          </div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-3">{filtered.map(t => <TalentCard key={t.id} t={t} view="list" />)}</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(t => <TalentCard key={t.id} t={t} view="gallery" />)}
          </div>
        )}
        {!loading && (
          <p className="mt-8 text-center text-xs uppercase tracking-[0.2em] text-ink/30">
            {filtered.length} {type === 'company' ? 'startups' : type === 'individual' ? 'professionals' : 'members'}
          </p>
        )}
      </div>
    </div>
  )
}
