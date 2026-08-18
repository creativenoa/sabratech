import { Link } from 'react-router-dom'
import { ArrowBack } from './Icons'

export function posStyle(b) {
  const x = b.image_pos_x ?? 50, y = b.image_pos_y ?? 50, z = b.image_zoom ?? 1
  return { objectPosition: `${x}% ${y}%`, transform: `scale(${z})`, transformOrigin: `${x}% ${y}%` }
}

export function BusinessImage({ b, className, arch = false }) {
  const radius = arch ? { borderRadius: '999px 999px 6px 6px' } : {}
  if (b.image_url) return (
    <div style={radius} className={`${className} overflow-hidden`}>
      <img src={b.image_url} alt={b.name} style={posStyle(b)} className="h-full w-full object-cover" loading="lazy" />
    </div>
  )
  return (
    <div style={radius} className={`${className} grid place-items-center bg-sand`}>
      <span className="font-serif text-5xl font-500 text-navy/70">{(b.name || '?')[0]}</span>
    </div>
  )
}

function Wave({ fill }) {
  return (
    <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 500 40" preserveAspectRatio="none" style={{ height: 34, bottom: -1 }}>
      <path d="M0 22 C 120 44, 330 -8, 500 24 L 500 40 L 0 40 Z" fill={fill} />
    </svg>
  )
}

export default function BusinessCard({ b, view }) {
  if (view === 'list') {
    return (
      <Link to={`/business/${b.id}`} className="card group flex items-center gap-5 p-4">
        <BusinessImage b={b} className="h-16 w-16 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-royal">{b.category}{b.offer && ' · הטבה לקהילה'}</p>
          <h3 className="truncate font-serif text-xl text-navy">{b.name}</h3>
          <p className="truncate text-sm text-ink/60">{b.description}</p>
        </div>
        <ArrowBack className="h-5 w-5 shrink-0 text-navy/20 transition group-hover:text-royal" />
      </Link>
    )
  }

  const color = b.id % 2 === 0 ? '#1F327A' : '#28315E'
  return (
    <Link to={`/business/${b.id}`}
      className="group flex flex-col overflow-hidden rounded-md shadow-[0_10px_30px_-12px_rgba(40,49,94,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_-12px_rgba(40,49,94,0.5)]">
      <div className="relative">
        {b.image_url
          ? <div className="h-40 w-full overflow-hidden"><img src={b.image_url} alt={b.name} style={posStyle(b)} className="h-full w-full object-cover" loading="lazy" /></div>
          : <div className="grid h-40 w-full place-items-center bg-sand">
              <span className="font-serif text-6xl font-500 text-navy/50">{(b.name || '?')[0]}</span>
            </div>}
        {b.offer && (
          <span className="absolute end-3 top-3 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-bold text-royal">
            הטבה לקהילה
          </span>
        )}
        <Wave fill={color} />
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-1" style={{ backgroundImage: `linear-gradient(170deg, ${color} 30%, ${color === '#28315E' ? '#1F327A' : '#28315E'} 100%)` }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60">{b.category}</p>
        <h3 className="mt-1.5 font-serif text-2xl leading-tight text-white">{b.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/70">{b.description}</p>
        <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-md bg-white/15 px-3.5 py-2 text-xs font-semibold text-white transition group-hover:bg-white group-hover:text-navy">
          לדף העסק
          <ArrowBack className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}
