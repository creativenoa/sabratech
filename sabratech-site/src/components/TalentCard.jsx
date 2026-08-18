import { Link } from 'react-router-dom'
import { Arrow, Building, User } from './Icons'

export function posStyle(t) {
  const x = t.image_pos_x ?? 50, y = t.image_pos_y ?? 50, z = t.image_zoom ?? 1
  return { objectPosition: `${x}% ${y}%`, transform: `scale(${z})`, transformOrigin: `${x}% ${y}%` }
}

export function TalentImage({ t, className, round = false }) {
  const radius = round ? { borderRadius: '50%' } : { borderRadius: 6 }
  if (t.photo_url) return (
    <div style={radius} className={`${className} overflow-hidden`}>
      <img src={t.photo_url} alt={t.name} style={posStyle(t)} className="h-full w-full object-cover" loading="lazy" />
    </div>
  )
  const Icon = t.type === 'company' ? Building : User
  return (
    <div style={radius} className={`${className} grid place-items-center bg-sand`}>
      <Icon className="h-1/3 w-1/3 text-navy/50" />
    </div>
  )
}

export function Badges({ t, dark = false }) {
  const base = dark ? 'bg-white/15 text-white' : 'bg-cyan/10 text-royal'
  return (
    <>
      {t.type === 'company' && t.hiring && <span className={`badge ${dark ? 'bg-cyan text-white' : 'bg-cyan text-white'}`}>Hiring</span>}
      {t.type === 'individual' && t.open_to_work && <span className={`badge bg-cyan text-white`}>Open to work</span>}
      {t.type === 'individual' && t.freelance && <span className={`badge ${base}`}>Freelance</span>}
    </>
  )
}

export default function TalentCard({ t, view }) {
  const roleLine = t.type === 'individual'
    ? [t.title, t.company].filter(Boolean).join(' at ')
    : t.title

  if (view === 'list') {
    return (
      <Link to={`/talent/${t.id}`} className="card group flex items-center gap-5 p-4">
        <TalentImage t={t} round={t.type === 'individual'} className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan">
            {t.category}
          </p>
          <h3 className="truncate font-serif text-xl text-navy">{t.name}</h3>
          <p className="truncate text-sm text-ink/60">{roleLine || t.bio}</p>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 sm:flex"><Badges t={t} /></span>
        <Arrow className="h-5 w-5 shrink-0 text-navy/20 transition group-hover:text-cyan" />
      </Link>
    )
  }

  const color = t.id % 2 === 0 ? '#1F327A' : '#28315E'
  return (
    <Link to={`/talent/${t.id}`}
      className="group flex flex-col overflow-hidden rounded-md shadow-[0_10px_30px_-12px_rgba(40,49,94,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_-12px_rgba(40,49,94,0.5)]">
      <div className="relative">
        {t.photo_url
          ? <div className="h-44 w-full overflow-hidden bg-white"><img src={t.photo_url} alt={t.name} style={posStyle(t)} className="h-full w-full object-cover" loading="lazy" /></div>
          : <div className="grid h-44 w-full place-items-center bg-sand">
              {t.type === 'company' ? <Building className="h-14 w-14 text-navy/40" /> : <User className="h-14 w-14 text-navy/40" />}
            </div>}
        <span className="absolute left-3 top-3 flex items-center gap-1.5">
          <Badges t={t} />
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4" style={{ backgroundImage: `linear-gradient(170deg, ${color} 30%, ${color === '#28315E' ? '#1F327A' : '#28315E'} 100%)` }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#7fd2f2]">{t.category}</p>
        <h3 className="mt-1.5 font-serif text-2xl leading-tight text-white">{t.name}</h3>
        <p className="mt-1 line-clamp-1 text-sm font-semibold text-white/80">{roleLine}</p>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/70">{t.bio || t.description}</p>
        {t.skills?.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-1.5">
            {t.skills.slice(0, 4).map(s => <span key={s} className="rounded bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">{s}</span>)}
            {t.skills.length > 4 && <span className="px-1 text-[11px] font-semibold text-white/50">+{t.skills.length - 4}</span>}
          </p>
        )}
        <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-md bg-white/15 px-3.5 py-2 text-xs font-semibold text-white transition group-hover:bg-white group-hover:text-navy">
          View profile
          <Arrow className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}
