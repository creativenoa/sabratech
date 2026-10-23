import { useEffect, useMemo, useState } from 'react'
import { uploadFile } from '../../lib/data'
import { businessMembers } from '../../lib/account'
import {
  adminListEvents, adminListSuggestions, adminSetSuggestion, adminInvitees, adminRegistrations,
  adminSaveEvent, adminDeleteEvent, toLocalInput, fromLocalInput, fmtWhen,
} from '../../lib/events'
import { Close, Search } from '../../components/Icons'

const STATUS = {
  draft: ['Draft', 'bg-sand text-ink/70'],
  published: ['Published', 'bg-cyan text-white'],
  cancelled: ['Cancelled', 'bg-red-100 text-red-700'],
}
const BLANK = { title: '', description: '', starts_at: '', ends_at: '', location: '', online_url: '', image_url: '', capacity: '', show_attendees: false, invite_all: true, status: 'draft' }

function Check({ checked, onChange, children }) {
  return (
    <label className="flex items-start gap-2.5 text-sm font-semibold text-ink/75">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-cyan" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

// Guest list: search members, or add everyone on a business's team.
function InviteePicker({ members, businesses, value, onChange }) {
  const [q, setQ] = useState('')
  const [bizMsg, setBizMsg] = useState('')
  const approved = members.filter(m => m.status === 'approved')
  const sel = new Set(value)
  const term = q.trim().toLowerCase()
  const shown = approved.filter(m => !term || `${m.full_name} ${m.email}`.toLowerCase().includes(term))
  const toggle = id => onChange(sel.has(id) ? value.filter(x => x !== id) : [...value, id])
  const addBusiness = async bid => {
    if (!bid) return
    setBizMsg('')
    try {
      const team = (await businessMembers(Number(bid))).filter(m => m.status === 'approved').map(m => m.user_id)
      const next = [...new Set([...value, ...team])]
      onChange(next); setBizMsg(`Added ${next.length - value.length} from the team.`)
    } catch (e) { setBizMsg(e.message) }
  }
  return (
    <div className="rounded-md border border-navy/10 bg-cream p-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <input className="input !py-2 !pl-9 text-sm" placeholder="Search members…" value={q} onChange={e => setQ(e.target.value)} />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/30" />
        </div>
        <select className="input !w-auto !py-2 text-sm" value="" onChange={e => addBusiness(e.target.value)} aria-label="Invite a business team">
          <option value="">+ Everyone from a business…</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      {bizMsg && <p className="mt-2 text-xs font-bold text-cyan">{bizMsg}</p>}
      <p className="mt-2 text-xs font-semibold text-ink/50">{value.length} invited · <button type="button" className="text-cyan hover:underline" onClick={() => onChange(approved.map(m => m.id))}>select all</button> · <button type="button" className="text-cyan hover:underline" onClick={() => onChange([])}>clear</button></p>
      <div className="mt-2 max-h-48 overflow-y-auto rounded-md bg-white">
        {shown.map(m => (
          <label key={m.id} className="flex cursor-pointer items-center gap-2.5 border-b border-navy/5 px-3 py-2 text-sm last:border-0 hover:bg-cream">
            <input type="checkbox" className="h-4 w-4 accent-cyan" checked={sel.has(m.id)} onChange={() => toggle(m.id)} />
            <span className="font-semibold text-navy">{m.full_name || 'No name'}</span>
            <span className="truncate text-xs text-ink/45">{m.email}</span>
          </label>
        ))}
        {shown.length === 0 && <p className="px-3 py-3 text-sm text-ink/45">No members match.</p>}
      </div>
    </div>
  )
}

function EventEditor({ initial, members, businesses, adminId, onClose, onSaved }) {
  const [ev, setEv] = useState(() => ({ ...BLANK, ...initial, starts_at: toLocalInput(initial?.starts_at), ends_at: toLocalInput(initial?.ends_at), capacity: initial?.capacity ?? '' }))
  const [invitees, setInvitees] = useState([])
  const [regs, setRegs] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setEv(x => ({ ...x, [k]: v }))
  useEffect(() => {
    if (initial?.id) { adminInvitees(initial.id).then(setInvitees).catch(() => {}); adminRegistrations(initial.id).then(setRegs).catch(() => {}) }
  }, [initial?.id])
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async status => {
    if (!ev.title.trim() || !ev.starts_at) { setErr('Please add a name and a start date.'); return }
    if (!ev.invite_all && invitees.length === 0 && status === 'published') { setErr('Pick at least one invitee, or switch to "All members".'); return }
    if (status === 'cancelled' && !window.confirm('Cancel this event? Everyone registered gets an alert.')) return
    setBusy(true); setErr('')
    try {
      await adminSaveEvent({ ...ev, status, starts_at: fromLocalInput(ev.starts_at), ends_at: fromLocalInput(ev.ends_at) }, invitees, adminId)
      onSaved()
    } catch (e) { setErr(e.message); setBusy(false) }
  }
  const remove = async () => {
    if (!window.confirm('Delete this event for good? (Cancelling keeps it visible as cancelled.)')) return
    try { await adminDeleteEvent(ev.id); onSaved() } catch (e) { setErr(e.message) }
  }
  const published = initial?.status === 'published'

  return (
    <div className="ev-backdrop fixed inset-0 z-[2000] grid place-items-center bg-navy/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="ev-modal max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-2xl text-navy">{ev.id ? 'Edit event' : 'New event'}</h2>
          <button onClick={onClose} aria-label="Close" className="text-navy/40 hover:text-navy"><Close className="h-6 w-6" /></button>
        </div>
        <div className="mt-5 flex flex-col gap-4">
          <div><label className="label">Event name *</label><input className="input" value={ev.title} onChange={e => set('title', e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Starts *</label><input type="datetime-local" className="input" value={ev.starts_at} onChange={e => set('starts_at', e.target.value)} /></div>
            <div><label className="label">Ends</label><input type="datetime-local" className="input" value={ev.ends_at} onChange={e => set('ends_at', e.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Where</label><input className="input" placeholder="Venue / address" value={ev.location || ''} onChange={e => set('location', e.target.value)} /></div>
            <div><label className="label">Online link</label><input className="input" placeholder="Zoom, Meet, website…" value={ev.online_url || ''} onChange={e => set('online_url', e.target.value)} /></div>
          </div>
          <div><label className="label">Description</label><textarea rows={4} className="input" value={ev.description || ''} onChange={e => set('description', e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Image</label>
              {ev.image_url && <img src={ev.image_url} alt="" className="mb-2 h-24 w-full rounded-md object-cover" />}
              <input type="file" accept="image/*" className="input !py-2 text-sm" onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return
                if (f.size > 5 * 1024 * 1024) { setErr('Image is too large (5MB max)'); return }
                try { set('image_url', await uploadFile('event-images', f)) } catch (x) { setErr(x.message) }
              }} />
            </div>
            <div>
              <label className="label">Seat limit (optional)</label>
              <input type="number" min="1" className="input" placeholder="No limit" value={ev.capacity} onChange={e => set('capacity', e.target.value)} />
              <div className="mt-3"><Check checked={ev.show_attendees} onChange={v => set('show_attendees', v)}>Show who's attending (small photos on the event)</Check></div>
            </div>
          </div>

          <div>
            <p className="label">Who's invited</p>
            <div className="mb-2 flex gap-2">
              {[[true, 'All members'], [false, 'Pick people']].map(([v, l]) => (
                <button key={l} type="button" onClick={() => set('invite_all', v)}
                  className={`rounded-md px-3 py-1.5 text-sm font-bold ${ev.invite_all === v ? 'bg-navy text-white' : 'bg-navy/5 text-navy'}`}>{l}</button>
              ))}
            </div>
            {ev.invite_all
              ? <p className="text-xs text-ink/50">Every approved member sees this event and gets an "You're invited" alert when it's published.</p>
              : <InviteePicker members={members} businesses={businesses} value={invitees} onChange={setInvitees} />}
            {published && !ev.invite_all && <p className="mt-1 text-xs text-ink/50">People you add now get their invite alert right after you save.</p>}
          </div>

          {ev.id && (
            <div>
              <p className="label">Registered ({regs.length}{ev.capacity ? ` of ${ev.capacity}` : ''})</p>
              {regs.length === 0 ? <p className="text-sm text-ink/45">No one yet.</p> : (
                <div className="flex flex-wrap gap-2">{regs.map(r => <span key={r.user_id} className="tag">{r.name}</span>)}</div>
              )}
            </div>
          )}

          {err && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
          <div className="flex flex-wrap items-center gap-2 border-t border-navy/10 pt-4">
            <button disabled={busy} onClick={() => save('published')} className="press btn-accent !py-2.5 !text-sm disabled:opacity-50">{published ? 'Save changes' : 'Publish & send invites'}</button>
            {!published && <button disabled={busy} onClick={() => save('draft')} className="press btn-outline !py-2.5 !text-sm">Save as draft</button>}
            {published && <button disabled={busy} onClick={() => save('cancelled')} className="rounded-md bg-red-100 px-4 py-2.5 text-sm font-bold text-red-700">Cancel event</button>}
            {ev.id && <button onClick={remove} className="ml-auto text-sm font-bold text-ink/40 hover:text-red-600">Delete</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminEvents({ members, businesses, adminId, onCountsChanged }) {
  const [events, setEvents] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [editing, setEditing] = useState(null)
  const [err, setErr] = useState('')
  const load = async () => {
    try {
      const [e, s] = await Promise.all([adminListEvents(), adminListSuggestions()])
      setEvents(e); setSuggestions(s); onCountsChanged?.(s.filter(x => x.status === 'new').length)
    } catch (x) { setErr(x.message); setEvents([]) }
  }
  useEffect(() => { load() }, [])
  const memberName = id => { const m = members.find(x => x.id === id); return m?.full_name || m?.email || 'A member' }
  const newSugg = suggestions.filter(s => s.status === 'new')
  const now = new Date()
  const [upcoming, past] = useMemo(() => {
    const list = events || []
    return [list.filter(e => new Date(e.ends_at || e.starts_at) >= now).reverse(), list.filter(e => new Date(e.ends_at || e.starts_at) < now)]
  }, [events])

  const useSuggestion = async s => {
    setEditing({ title: s.title, description: [s.description, s.link].filter(Boolean).join('\n\n'), starts_at: s.starts_at, location: s.location, image_url: s.image_url, _suggestion: s.id })
  }

  const Row = ({ e }) => {
    const [label, cls] = STATUS[e.status] || STATUS.draft
    return (
      <button onClick={() => setEditing(e)} className="card flex w-full flex-wrap items-center gap-3 !p-4 text-left">
        <span className={`badge ${cls}`}>{label}</span>
        <strong className="text-navy">{e.title}</strong>
        <span className="text-xs text-ink/50">{fmtWhen(e.starts_at)}</span>
        <span className="text-xs text-ink/40">{e.invite_all ? 'All members' : 'Invite list'}{e.capacity ? ` · ${e.capacity} seats` : ''}{e.show_attendees ? ' · attendees shown' : ''}</span>
        <span className="ml-auto text-xs font-bold text-cyan">Edit</span>
      </button>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-6">
      {err && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{err}</p>}
      <div className="flex items-center gap-3">
        <button onClick={() => setEditing({})} className="btn-primary !py-2 !text-sm">+ New event</button>
        <span className="text-sm text-ink/50">Members see only events they're invited to.</span>
      </div>

      {newSugg.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">Suggestions from members ({newSugg.length})</p>
          <div className="flex flex-col gap-2">
            {newSugg.map(s => (
              <div key={s.id} id={'sugg-' + s.id} className="card flex flex-wrap items-center gap-3 !p-4">
                {s.image_url && <img src={s.image_url} alt="" className="h-10 w-14 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{s.title}</p>
                  <p className="text-xs text-ink/50">From {memberName(s.user_id)}{s.starts_at ? ` · ${fmtWhen(s.starts_at)}` : ''}{s.location ? ` · ${s.location}` : ''}</p>
                  {s.description && <p className="mt-1 line-clamp-2 text-sm text-ink/60">{s.description}</p>}
                </div>
                <span className="flex gap-2">
                  <button onClick={() => useSuggestion(s)} className="rounded-md bg-cyan px-3 py-1.5 text-xs font-bold text-white">Turn into event</button>
                  <button onClick={async () => { await adminSetSuggestion(s.id, 'dismissed'); load() }} className="rounded-md bg-navy/5 px-3 py-1.5 text-xs font-bold text-ink/60">Dismiss</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">Upcoming & drafts</p>
        {events === null ? <p className="text-ink/40">Loading…</p> : upcoming.length === 0 ? <p className="text-sm text-ink/45">No upcoming events.</p>
          : <div className="flex flex-col gap-2">{upcoming.map(e => <Row key={e.id} e={e} />)}</div>}
      </div>
      {past.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">Past</p>
          <div className="flex flex-col gap-2 opacity-70">{past.map(e => <Row key={e.id} e={e} />)}</div>
        </div>
      )}

      {editing && (
        <EventEditor initial={editing.id ? editing : { ...editing }} members={members} businesses={businesses} adminId={adminId}
          onClose={() => setEditing(null)}
          onSaved={async () => { if (editing._suggestion) await adminSetSuggestion(editing._suggestion, 'used').catch(() => {}); setEditing(null); load() }} />
      )}
    </div>
  )
}
