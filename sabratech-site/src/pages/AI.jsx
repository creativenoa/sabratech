import { useEffect, useMemo, useState } from 'react'
import { fetchTools, fetchContent, txt, DEFAULT_CONTENT } from '../lib/data'
import { Search as SearchIcon, Whatsapp, Arrow } from '../components/Icons'

export default function AI() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [tools, setTools] = useState([])
  const [content, setContent] = useState(DEFAULT_CONTENT)

  useEffect(() => {
    fetchTools().then(setTools)
    fetchContent().then(setContent)
  }, [])

  const categories = useMemo(
    () => [...new Set(tools.map(t => t.category).filter(Boolean))],
    [tools]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return tools.filter(t => {
      if (cat !== 'all' && t.category !== cat) return false
      if (!needle) return true
      return [t.name, t.description, t.category].some(f => (f || '').toLowerCase().includes(needle))
    })
  }, [tools, q, cat])

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-14">
      <p className="kicker">{txt(content, 'ai_kicker')}</p>
      <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">{txt(content, 'ai_title')}</h1>

      {/* WhatsApp group invite */}
      <div className="mt-8 overflow-hidden rounded-md shadow-[0_10px_30px_-12px_rgba(40,49,94,0.35)]">
        <div className="flex flex-col items-start gap-6 bg-gradient-to-br from-navy to-royal p-8 md:flex-row md:items-center md:p-10">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-cyan">
            <Whatsapp className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-2xl text-white md:text-3xl">{txt(content, 'ai_whatsapp_title')}</h2>
            <p className="mt-2 max-w-xl leading-relaxed text-white/70">{txt(content, 'ai_whatsapp_sub')}</p>
          </div>
          <a href={txt(content, 'ai_whatsapp_link')} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-md bg-cyan px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-navy">
            <Whatsapp className="h-5 w-5" />
            {txt(content, 'ai_whatsapp_button')}
          </a>
        </div>
      </div>

      {/* Leading Tools */}
      <div className="mt-16">
        <p className="kicker">{txt(content, 'ai_tools_kicker')}</p>
        <h2 className="mt-2 font-serif text-3xl text-navy md:text-4xl">{txt(content, 'ai_tools_title')}</h2>

        <div className="sticky top-[65px] z-[1000] -mx-5 mt-6 border-y border-navy/10 bg-cream/95 px-5 py-4 backdrop-blur">
          <div className="relative max-w-md">
            <input className="input !pl-12" placeholder="Search tools…" value={q} onChange={e => setQ(e.target.value)} />
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/30" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => setCat('all')}
              className={`rounded-md border px-3.5 py-1.5 text-sm font-semibold transition ${cat === 'all' ? 'border-cyan bg-cyan text-white' : 'border-navy/20 bg-white text-ink/60 hover:border-cyan/60'}`}>
              All
            </button>
            {categories.map(c => (
              <button key={c} onClick={() => setCat(c === cat ? 'all' : c)}
                className={`rounded-md border px-3.5 py-1.5 text-sm font-semibold transition ${cat === c ? 'border-cyan bg-cyan text-white' : 'border-navy/20 bg-white text-ink/60 hover:border-cyan/60'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {tools.length === 0 ? (
          <p className="py-20 text-center text-ink/40">The tools list is loading — if it stays empty, run the latest schema update in Supabase.</p>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl text-navy">Nothing found</p>
            <p className="mt-2 text-ink/50">Try a different search, or clear the filter.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(t => (
              <a key={t.id} href={t.url} target="_blank" rel="sponsored noopener noreferrer"
                className="card group flex flex-col gap-2.5 border-t-4 !border-t-cyan p-6 transition hover:-translate-y-1">
                <h3 className="font-serif text-xl text-navy">{t.name}</h3>
                <span className="tag self-start">{t.category}</span>
                <p className="flex-1 text-sm leading-relaxed text-ink/60">{t.description}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan transition group-hover:gap-2.5">
                  Visit <Arrow className="h-4 w-4" />
                </span>
              </a>
            ))}
          </div>
        )}

        <p className="mx-auto mt-12 max-w-2xl text-center text-xs leading-relaxed text-ink/40">
          {txt(content, 'ai_disclosure')}
        </p>
      </div>
    </div>
  )
}
