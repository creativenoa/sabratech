import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchBusinesses, fetchCategories, CATEGORIES } from '../lib/data'
import BusinessCard from '../components/BusinessCard'
import MapView from '../components/MapView'
import { Search } from '../components/Icons'

const VIEWS = [['gallery', 'גלריה'], ['list', 'רשימה'], ['map', 'מפה']]

export default function Directory() {
  const [params, setParams] = useSearchParams()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('gallery')
  const [onlyOffers, setOnlyOffers] = useState(false)
  const [cats, setCats] = useState(CATEGORIES)

  const q = params.get('q') || ''
  const cat = params.get('cat') || ''

  useEffect(() => {
    fetchBusinesses().then(b => { setBusinesses(b); setLoading(false) })
    fetchCategories().then(setCats)
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return businesses.filter(b => {
      if (cat && b.category !== cat) return false
      if (onlyOffers && !b.offer) return false
      if (!needle) return true
      return [b.name, b.description, b.category, b.contact_name]
        .some(f => (f || '').toLowerCase().includes(needle))
    })
  }, [businesses, q, cat, onlyOffers])

  const set = (k, v) => {
    const p = new URLSearchParams(params)
    v ? p.set(k, v) : p.delete(k)
    setParams(p, { replace: true })
  }

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-14">
      <p className="kicker">המדריך</p>
      <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">רשימת עסקים</h1>

      <div className="sticky top-[65px] z-[1000] -mx-5 mt-8 border-y border-navy/10 bg-cream/95 px-5 py-4 backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <input className="input !ps-12" placeholder="חיפוש לפי שם, תחום, מילה חופשית…"
              value={q} onChange={e => set('q', e.target.value)} />
            <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/30" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="input !w-auto !py-2 text-sm font-semibold" value={cat} onChange={e => set('cat', e.target.value)}>
              <option value="">כל התחומים</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setOnlyOffers(!onlyOffers)}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${onlyOffers ? 'border-navy bg-navy text-cream' : 'border-navy/20 bg-white text-ink/60 hover:border-navy/50'}`}>
              עם הטבה לקהילה
            </button>
            <div className="ms-auto flex overflow-hidden rounded-md border border-navy/20 bg-white">
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

      <div className="mt-8">
        {loading ? (
          <p className="py-20 text-center text-ink/40">טוען עסקים…</p>
        ) : view === 'map' ? (
          <MapView businesses={filtered} />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl text-navy">לא מצאנו כלום</p>
            <p className="mt-2 text-ink/50">נסי חיפוש אחר או הסירי סינון.</p>
          </div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-3">{filtered.map(b => <BusinessCard key={b.id} b={b} view="list" />)}</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(b => <BusinessCard key={b.id} b={b} view="gallery" />)}
          </div>
        )}
        {!loading && view !== 'map' && (
          <p className="mt-8 text-center text-xs uppercase tracking-[0.2em] text-ink/30">{filtered.length} עסקים</p>
        )}
      </div>
    </div>
  )
}
