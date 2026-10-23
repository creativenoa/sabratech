import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { uploadFile, fileUrl } from '../lib/data'
import {
  fetchEventsFeed, fetchAttendees, registerForEvent, unregisterFromEvent, suggestEvent,
  googleCalendarUrl, downloadIcs, fmtWhen, fromLocalInput,
} from '../lib/events'
import { ArrowBack, Arrow, Close, Pin, Globe, User } from '../components/Icons'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dayKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const sameDay = (a, b) => dayKey(a) === dayKey(b)

// ---------------- Animated month calendar ----------------
function MonthCalendar({ events, selected, onSelect }) {
  const today = new Date()
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [dir, setDir] = useState('first') // 'first' | 'next' | 'prev'
  const byDay = useMemo(() => {
    const m = new Map()
    for (const e of events) {
      const k = dayKey(new Date(e.starts_at))
      m.set(k, [...(m.get(k) || []), e])
    }
    return m
  }, [events])

  const go = step => { setDir(step > 0 ? 'next' : 'prev'); setMonth(m => new Date(m.getFullYear(), m.getMonth() + step, 1)) }
  const cells = useMemo(() => {
    const start = new Date(month); start.setDate(1 - month.getDay())
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }, [month])
  const label = month.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`

  return (
    <div className="card !bg-white p-5 select-none">
      <div className="flex items-center justify-between">
        <button onClick={() => go(-1)} aria-label="Previous month" className="press grid h-9 w-9 place-items-center rounded-full text-navy hover:bg-navy/5"><ArrowBack className="h-4 w-4" /></button>
        <p key={'t' + monthKey} className="cal-title font-serif text-xl text-navy">{label}</p>
        <button onClick={() => go(1)} aria-label="Next month" className="press grid h-9 w-9 place-items-center rounded-full text-navy hover:bg-navy/5"><Arrow className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-ink/35">
        {DOW.map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-2 overflow-hidden">
        <div key={monthKey} className={`grid grid-cols-7 gap-1 ${dir === 'next' ? 'cal-grid-next' : dir === 'prev' ? 'cal-grid-prev' : ''}`}>
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === month.getMonth()
            const evs = byDay.get(dayKey(d)) || []
            const isToday = sameDay(d, today)
            const isSel = selected && sameDay(d, selected)
            return (
              <button key={i} onClick={() => onSelect(evs.length ? (isSel ? null : d) : null)} disabled={!evs.length}
                style={dir === 'first' ? { animationDelay: `${i * 8}ms` } : undefined}
                aria-label={`${d.toDateString()}${evs.length ? `, ${evs.length} event${evs.length > 1 ? 's' : ''}` : ''}`}
                className={`cal-day ${dir === 'first' ? 'cal-cell-first' : ''} relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-semibold
                  ${isSel ? 'bg-navy text-white' : evs.length ? 'press cursor-pointer bg-cyan/10 text-navy hover:bg-cyan/20' : 'cursor-default'}
                  ${!inMonth ? 'opacity-30' : ''} ${isToday && !isSel ? 'ring-2 ring-cyan ring-offset-1' : ''} ${!evs.length && inMonth ? 'text-ink/60' : ''}`}>
                {d.getDate()}
                {evs.length > 0 && (
                  <span className="absolute bottom-1.5 flex gap-0.5">
                    {evs.slice(0, 3).map(e => <span key={e.id} className={`cal-dot h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : e.i_am_going ? 'bg-royal' : 'bg-cyan'}`} />)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-semibold text-ink/45">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan" /> Event</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-royal" /> You're going</span>
        {selected && <button onClick={() => onSelect(null)} className="ml-auto font-bold text-cyan hover:underline">Show all</button>}
      </div>
    </div>
  )
}

// ---------------- Event card + detail ----------------
function DateBadge({ iso, big }) {
  const d = new Date(iso)
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center rounded-lg bg-white text-navy shadow-sm ${big ? 'h-16 w-16' : 'h-14 w-14'}`}>
      <span className="text-[10px] font-black uppercase tracking-widest text-cyan">{d.toLocaleString(undefined, { month: 'short' })}</span>
      <span className={`font-serif leading-none ${big ? 'text-3xl' : 'text-2xl'}`}>{d.getDate()}</span>
    </div>
  )
}

function spotsText(e) {
  if (!e.capacity) return null
  const left = Math.max(0, e.capacity - Number(e.going_count || 0))
  return left === 0 ? 'Full' : `${left} spot${left === 1 ? '' : 's'} left`
}

function EventCard({ e, index, onOpen }) {
  const past = new Date(e.ends_at || e.starts_at) < new Date()
  return (
    <button onClick={() => onOpen(e)} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className={`ev-card ev-card-hover press card group flex w-full items-stretch overflow-hidden !bg-white text-left ${past ? 'opacity-60' : ''}`}>
      <div className="relative w-28 shrink-0 bg-navy sm:w-40">
        {e.image_url
          ? <img src={fileUrl(e.image_url)} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
          : <img src="/logo-dark.svg" alt="" className="absolute inset-x-0 bottom-3 mx-auto w-20 opacity-25 sm:w-24" />}
        <div className="absolute left-2 top-2"><DateBadge iso={e.starts_at} /></div>
      </div>
      <div className="min-w-0 flex-1 p-4">
        <p className="flex flex-wrap items-center gap-2">
          {e.status === 'cancelled' && <span className="badge bg-red-100 text-red-700">Cancelled</span>}
          {e.i_am_going && e.status !== 'cancelled' && <span className="badge bg-royal text-white">You're going</span>}
          {spotsText(e) && e.status !== 'cancelled' && !past && <span className="badge bg-sand text-ink/70">{spotsText(e)}</span>}
        </p>
        <p className="mt-1 font-serif text-xl leading-tight text-navy group-hover:text-royal">{e.title}</p>
        <p className="mt-1 text-sm font-semibold text-ink/55">{fmtWhen(e.starts_at)}</p>
        {(e.location || e.online_url) && <p className="mt-0.5 truncate text-sm text-ink/45">{e.location || 'Online'}</p>}
      </div>
    </button>
  )
}

function EventModal({ e, onClose, onChanged }) {
  const [attendees, setAttendees] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const past = new Date(e.ends_at || e.starts_at) < new Date()
  const full = e.capacity && Number(e.going_count) >= e.capacity
  useEffect(() => { if (e.show_attendees) fetchAttendees(e.id).then(setAttendees) }, [e.id, e.show_attendees, e.going_count])
  useEffect(() => {
    const onKey = ev => { if (ev.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const act = async fn => {
    setBusy(true); setMsg('')
    try { await fn(); await onChanged() } catch (ex) { setMsg(ex.message) } finally { setBusy(false) }
  }
  const site = e.online_url && (e.online_url.startsWith('http') ? e.online_url : 'https://' + e.online_url)

  return (
    <div className="ev-backdrop fixed inset-0 z-[2000] grid place-items-center bg-navy/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="ev-modal max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={ev => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label={e.title}>
        {/* Hero */}
        <div className="relative min-h-[220px] bg-navy text-white sm:min-h-[260px]">
          {e.image_url
            ? <img src={fileUrl(e.image_url)} alt="" className="absolute inset-0 h-full w-full object-cover" decoding="async" />
            : <img src="/logo-dark.svg" alt="" className="absolute right-6 top-6 w-28 opacity-20" />}
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-navy/10" />
          <button onClick={onClose} aria-label="Close" className="press absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50"><Close className="h-5 w-5" /></button>
          <div className="relative flex min-h-[220px] flex-col justify-end gap-3 p-6 sm:min-h-[260px]">
            <div className="flex items-end gap-4">
              <DateBadge iso={e.starts_at} big />
              <div className="min-w-0">
                {e.status === 'cancelled' && <span className="badge mb-1 bg-red-600 text-white">Cancelled</span>}
                <h2 className="font-serif text-2xl leading-tight sm:text-3xl">{e.title}</h2>
                <p className="mt-1 text-sm font-semibold text-white/80">{fmtWhen(e.starts_at)}{e.ends_at ? ` – ${new Date(e.ends_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}</p>
              </div>
            </div>
            {e.show_attendees && attendees.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {attendees.slice(0, 12).map(a => {
                    const img = a.photo_url
                      ? <img src={fileUrl(a.photo_url)} width={32} height={32} loading="lazy" decoding="async" alt={a.name} title={a.name} className="h-8 w-8 rounded-full object-cover ring-2 ring-navy" />
                      : <span title={a.name} className="grid h-8 w-8 place-items-center rounded-full bg-cyan text-xs font-black uppercase text-white ring-2 ring-navy">{(a.name || '?').slice(0, 1)}</span>
                    return a.individual_id ? <Link key={a.user_id} to={`/individual/${a.individual_id}`} onClick={onClose}>{img}</Link> : <span key={a.user_id}>{img}</span>
                  })}
                </div>
                <span className="text-xs font-semibold text-white/75">{attendees.length > 12 ? `+${attendees.length - 12} more · ` : ''}{e.going_count} going</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            {e.status === 'published' && !past && (
              e.i_am_going ? (
                <>
                  <span className="badge bg-royal !py-2 text-white">✓ You're registered</span>
                  <button disabled={busy} onClick={() => act(() => unregisterFromEvent(e.id))} className="text-sm font-bold text-ink/50 hover:text-red-600">Cancel my registration</button>
                </>
              ) : (
                <button disabled={busy || full} onClick={() => act(() => registerForEvent(e.id))} className="press btn-accent !py-2.5 !text-sm disabled:opacity-50">
                  {full ? 'Event is full' : busy ? 'Registering…' : 'Register'}
                </button>
              )
            )}
            {past && <span className="badge bg-sand text-ink/60">This event has passed</span>}
            {spotsText(e) && !past && e.status === 'published' && <span className="text-sm font-semibold text-ink/50">{spotsText(e)}</span>}
            {!past && e.status === 'published' && (
              <span className="ml-auto flex gap-2 text-sm font-bold">
                <a href={googleCalendarUrl(e)} target="_blank" rel="noopener noreferrer" className="rounded-md px-2 py-1 text-cyan hover:bg-cyan/10">+ Google Calendar</a>
                <button onClick={() => downloadIcs(e)} className="rounded-md px-2 py-1 text-cyan hover:bg-cyan/10">+ Apple / Outlook</button>
              </span>
            )}
          </div>
          {msg && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{msg}</p>}
          <div className="mt-5 flex flex-col gap-2 text-sm font-semibold text-ink/65">
            {e.location && <p className="flex items-center gap-2"><Pin className="h-4 w-4 text-cyan" /> {e.location}</p>}
            {site && <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-cyan" /> <a href={site} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">{e.online_url}</a></p>}
          </div>
          {e.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-ink/75">{e.description}</p>}
        </div>
      </div>
    </div>
  )
}

// ---------------- Suggest an event (members) ----------------
function SuggestModal({ onClose }) {
  const { user } = useAuth()
  const [f, setF] = useState({ title: '', starts_at: '', location: '', link: '', description: '' })
  const [photo, setPhoto] = useState(null)
  const [state, setState] = useState('idle')
  const [err, setErr] = useState('')
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  useEffect(() => {
    const onKey = ev => { if (ev.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async ev => {
    ev.preventDefault()
    setState('sending'); setErr('')
    try {
      const image_url = photo ? await uploadFile('event-images', photo) : null
      await suggestEvent(user.id, { ...f, starts_at: fromLocalInput(f.starts_at), image_url })
      setState('done')
    } catch (ex) { setErr(ex.message || 'Could not send. Please try again.'); setState('idle') }
  }

  return (
    <div className="ev-backdrop fixed inset-0 z-[2000] grid place-items-center bg-navy/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="ev-modal max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={ev => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Suggest an event">
        <div className="flex items-start justify-between">
          <div>
            <p className="kicker">Community calendar</p>
            <h2 className="mt-1 font-serif text-2xl text-navy">Suggest an event</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-navy/40 hover:text-navy"><Close className="h-6 w-6" /></button>
        </div>
        {state === 'done' ? (
          <div className="py-8 text-center">
            <p className="font-serif text-xl text-navy">Thanks — it's with the admins</p>
            <p className="mt-2 text-sm text-ink/60">They'll review it, choose who's invited, and publish it to the calendar.</p>
            <button onClick={onClose} className="btn-primary mt-6">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            <div><label className="label" htmlFor="sg-title">Event name *</label><input id="sg-title" required className="input" value={f.title} onChange={e => set('title', e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="sg-when">Date & time</label><input id="sg-when" type="datetime-local" className="input" value={f.starts_at} onChange={e => set('starts_at', e.target.value)} /></div>
              <div><label className="label" htmlFor="sg-where">Where</label><input id="sg-where" className="input" placeholder="Address or 'Online'" value={f.location} onChange={e => set('location', e.target.value)} /></div>
            </div>
            <div><label className="label" htmlFor="sg-link">Link (optional)</label><input id="sg-link" className="input" placeholder="Meetup, Zoom, website…" value={f.link} onChange={e => set('link', e.target.value)} /></div>
            <div><label className="label" htmlFor="sg-desc">What's it about?</label><textarea id="sg-desc" rows={3} className="input" value={f.description} onChange={e => set('description', e.target.value)} /></div>
            <div>
              <label className="label" htmlFor="sg-img">Image (optional)</label>
              <input id="sg-img" type="file" accept="image/*" className="input !py-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-cream"
                onChange={e => { const x = e.target.files?.[0]; if (x && x.size > 5 * 1024 * 1024) { setErr('Image is too large (5MB max)'); e.target.value = ''; return } setPhoto(x || null) }} />
            </div>
            {err && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
            <button disabled={state === 'sending'} className="press btn-accent disabled:opacity-50">{state === 'sending' ? 'Sending…' : 'Send to admins'}</button>
          </form>
        )}
      </div>
    </div>
  )
}

// ---------------- Page ----------------
export default function Events() {
  const { isApproved } = useAuth()
  const [events, setEvents] = useState(null)
  const [day, setDay] = useState(null)
  const [params, setParams] = useSearchParams()
  const [suggest, setSuggest] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const listRef = useRef(null)

  const load = () => fetchEventsFeed().then(setEvents)
  useEffect(() => { if (isApproved) load() }, [isApproved])

  const openId = params.get('e')
  const open = events?.find(e => String(e.id) === openId) || null
  const openEvent = e => setParams({ e: String(e.id) })
  const closeEvent = () => setParams({}, { replace: true })

  const now = new Date()
  const list = (events || []).filter(e => !day || sameDay(new Date(e.starts_at), day))
  const upcoming = list.filter(e => new Date(e.ends_at || e.starts_at) >= now)
  const past = list.filter(e => new Date(e.ends_at || e.starts_at) < now).reverse()
  const pickDay = d => { setDay(d); if (d) listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Community calendar</p>
          <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">Events</h1>
          <p className="mt-2 text-ink/60">Meetups, dinners and talks for the SabraTech community.</p>
        </div>
        <button onClick={() => setSuggest(true)} className="press btn-outline !px-4 !py-2.5 !text-sm">+ Suggest an event</button>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[340px_1fr]">
        <div className="md:sticky md:top-24 md:self-start">
          <MonthCalendar events={events || []} selected={day} onSelect={pickDay} />
        </div>
        <div ref={listRef} className="flex min-w-0 flex-col gap-3 scroll-mt-24">
          {events === null ? <p className="py-10 text-center text-ink/40">Loading…</p> : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/40">
                {day ? day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Coming up'}
              </p>
              {upcoming.length === 0 && (
                <div className="card !bg-white p-8 text-center">
                  <User className="mx-auto h-8 w-8 text-navy/25" />
                  <p className="mt-2 font-serif text-xl text-navy">{day ? 'Nothing planned that day' : 'No upcoming events yet'}</p>
                  <p className="mt-1 text-sm text-ink/55">Have an idea? Suggest one — the admins will take it from there.</p>
                </div>
              )}
              {upcoming.map((e, i) => <EventCard key={e.id} e={e} index={i} onOpen={openEvent} />)}
              {past.length > 0 && (
                <div className="mt-6">
                  <button onClick={() => setShowPast(v => !v)} className="text-sm font-bold text-ink/50 hover:text-navy">{showPast ? 'Hide' : 'Show'} past events ({past.length})</button>
                  {showPast && <div className="mt-3 flex flex-col gap-3">{past.map((e, i) => <EventCard key={e.id} e={e} index={i} onOpen={openEvent} />)}</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {open && <EventModal e={open} onClose={closeEvent} onChanged={load} />}
      {openId && events && !open && (
        <div className="fixed inset-x-0 bottom-6 z-[1500] mx-auto w-fit rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white shadow-lg">
          That event isn't available to you. <button onClick={closeEvent} className="ml-2 underline">OK</button>
        </div>
      )}
      {suggest && <SuggestModal onClose={() => setSuggest(false)} />}
    </div>
  )
}
