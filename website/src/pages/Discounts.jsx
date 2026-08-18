import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBusinesses, fetchContent, DEFAULT_CONTENT } from '../lib/data'

export default function Discounts() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState(DEFAULT_CONTENT)
  useEffect(() => {
    fetchBusinesses().then(bs => { setList(bs.filter(b => b.offer)); setLoading(false) })
    fetchContent().then(setContent)
  }, [])

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-14">
      <p className="kicker">רק לחברות הקהילה</p>
      <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">הנחות בלעדיות</h1>
      <p className="mt-3 max-w-lg text-ink/60">{content.discounts_subtitle}</p>

      {loading ? <p className="py-20 text-center text-ink/40">טוען…</p> : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {list.map(b => (
            <div key={b.id} style={{ backgroundImage: 'linear-gradient(170deg, #28315E 30%, #1F327A 100%)' }} className="flex flex-col rounded-md p-7 shadow-[0_10px_30px_-12px_rgba(40,49,94,0.4)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sand">{b.category}</p>
              <h3 className="mt-1 font-serif text-2xl text-sand">{b.name}</h3>
              <p className="my-5 flex-1 rounded-md bg-white px-4 py-5 font-serif text-lg leading-snug text-ink">
                {b.offer}
              </p>
              <Link to={`/business/${b.id}`} className="text-sm font-semibold text-sand underline decoration-sand/40 underline-offset-4 transition hover:text-white hover:decoration-white">
                לדף העסק
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
