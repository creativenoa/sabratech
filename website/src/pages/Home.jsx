import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchBusinesses, fetchCategories, CATEGORIES } from '../lib/data'

export default function Home() {
  const [stats, setStats] = useState({ total: '—', offers: '—', women: '—' })
  const [cats, setCats] = useState(CATEGORIES)
  useEffect(() => {
    fetchBusinesses().then(bs => setStats({
      total: bs.length,
      offers: bs.filter(b => b.offer).length,
      women: new Set(bs.flatMap(b => (b.contact_name || '').split(/[&\/,]| ו-/).map(n => n.trim().toLowerCase()).filter(Boolean))).size,
    }))
    fetchCategories().then(setCats)
  }, [])

  return (
    <>
      <section className="border-b border-navy/10">
        <div className="mx-auto grid max-w-[1080px] items-center gap-10 px-5 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <p className="kicker">נשים עצמאיות באטלנטה והסביבה</p>
            <h1 className="mt-5 font-serif text-6xl font-600 leading-[1.15] tracking-[-0.025em] text-ink md:text-[80px]">
              נשים עושות
              <br />
              <span className="brush"><img src="/paint_stroke.svg" alt="" aria-hidden="true" className="brush-img" /><span className="brush-text">עסקים.</span></span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
              המקום למצוא את העסקים של נשות הקהילה, לגלות חיבורים חדשים ולקנות ממי שמדברת בשפה שלך.
            </p>
          </div>
          <div className="mt-9 flex flex-col items-start gap-3 md:mt-0 md:items-center">
            <Link to="/businesses" className="btn-primary w-44">חיפוש עסקים</Link>
            <Link to="/join" className="btn-outline w-44">הצטרפי אלינו</Link>
          </div>
        </div>
      </section>

      <section className="border-b border-navy/10 bg-white">
        <div className="mx-auto grid max-w-[1080px] grid-cols-3 divide-x divide-x-reverse divide-navy/10 px-5">
          {[[stats.total, 'עסקים בקהילה'], [stats.offers, 'הטבות בלעדיות'], [stats.women, 'נשים בקהילה']].map(([n, t]) => (
            <div key={t} className="py-10 text-center">
              <p className="font-serif text-4xl text-royal md:text-5xl">{n}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">{t}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1080px] px-5 py-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="kicker">תחומים</p>
            <h2 className="mt-2 font-serif text-3xl text-navy md:text-4xl">מה מחפשים היום?</h2>
          </div>
          <Link to="/businesses" className="hidden border-b border-navy/30 pb-0.5 text-sm font-semibold text-navy transition hover:border-royal hover:text-royal md:block">
            לכל העסקים
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {cats.filter(c => c !== 'אחר').map(cat => (
            <Link key={cat} to={`/businesses?cat=${encodeURIComponent(cat)}`}
              className="rounded-md border border-navy/20 bg-white px-5 py-2.5 text-sm font-semibold text-navy transition hover:border-navy hover:bg-navy hover:text-cream">
              {cat}
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
