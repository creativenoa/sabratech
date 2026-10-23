// Events: members see only events they're invited to (rules live in the
// database: sabratech-events-2026-10-23.sql). Admins manage everything.
import { supabase, hasSupabase } from './supabase'
import { flushPush } from './push'

const need = () => { if (!hasSupabase) throw new Error('Database not connected') }
const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data }

// ---------- members ----------
export async function fetchEventsFeed() {
  if (!hasSupabase) return []
  const { data, error } = await supabase.rpc('events_feed')
  return error ? [] : data || []
}
export async function fetchAttendees(eventId) {
  if (!hasSupabase) return []
  const { data, error } = await supabase.rpc('event_attendees', { eid: eventId })
  return error ? [] : data || []
}
export const registerForEvent = async id => { need(); return unwrap(await supabase.rpc('register_event', { eid: id })) }
export const unregisterFromEvent = async id => { need(); return unwrap(await supabase.rpc('unregister_event', { eid: id })) }

export async function suggestEvent(userId, fields) {
  need()
  unwrap(await supabase.from('event_suggestions').insert([{ ...fields, user_id: userId }]))
  flushPush({ force: true })
}

// ---------- admins ----------
export const adminListEvents = async () => { need(); return unwrap(await supabase.from('events').select('*').order('starts_at', { ascending: false })) || [] }
export const adminListSuggestions = async () => { need(); return unwrap(await supabase.from('event_suggestions').select('*').order('created_at', { ascending: false })) || [] }
export const adminSetSuggestion = async (id, status) => { need(); unwrap(await supabase.from('event_suggestions').update({ status }).eq('id', id)) }
export const adminInvitees = async eventId => { need(); return (unwrap(await supabase.from('event_invitees').select('user_id').eq('event_id', eventId)) || []).map(r => r.user_id) }
export const adminRegistrations = async eventId => { need(); return unwrap(await supabase.rpc('event_attendees', { eid: eventId })) || [] }

const EVENT_FIELDS = ['title', 'description', 'starts_at', 'ends_at', 'location', 'online_url', 'image_url', 'capacity', 'show_attendees', 'invite_all', 'status']

// Saves the event, then the guest list (before publishing, so the
// "You're invited" alerts reach exactly the people on it).
export async function adminSaveEvent(ev, inviteeIds, createdBy) {
  need()
  const row = Object.fromEntries(Object.entries(ev).filter(([k]) => EVENT_FIELDS.includes(k)))
  row.capacity = row.capacity ? Number(row.capacity) : null
  row.ends_at = row.ends_at || null
  const wantStatus = row.status || 'draft'
  let id = ev.id
  if (!id) {
    const created = unwrap(await supabase.from('events').insert([{ ...row, status: 'draft', created_by: createdBy }]).select('id'))
    id = created[0].id
  } else {
    // keep current status until invitees are saved
    const { status, ...rest } = row
    unwrap(await supabase.from('events').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id))
  }
  if (!row.invite_all) {
    const current = await adminInvitees(id)
    const want = new Set(inviteeIds)
    const add = [...want].filter(u => !current.includes(u))
    const remove = current.filter(u => !want.has(u))
    if (remove.length) unwrap(await supabase.from('event_invitees').delete().eq('event_id', id).in('user_id', remove))
    if (add.length) unwrap(await supabase.from('event_invitees').insert(add.map(user_id => ({ event_id: id, user_id }))))
  }
  unwrap(await supabase.from('events').update({ status: wantStatus }).eq('id', id))
  flushPush({ force: true })
  return id
}
export const adminDeleteEvent = async id => { need(); unwrap(await supabase.from('events').delete().eq('id', id)) }

// ---------- calendar helpers ----------
const pad = n => String(n).padStart(2, '0')
const icsDate = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
const icsText = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m)
const endOf = ev => (ev.ends_at ? new Date(ev.ends_at) : new Date(new Date(ev.starts_at).getTime() + 2 * 3600e3))

export function googleCalendarUrl(ev) {
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: ev.title,
    dates: `${icsDate(new Date(ev.starts_at))}/${icsDate(endOf(ev))}`,
    details: [ev.description, ev.online_url].filter(Boolean).join('\n\n'),
    location: ev.location || ev.online_url || '',
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

export function downloadIcs(ev) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SabraTech//Events//EN', 'BEGIN:VEVENT',
    `UID:sabratech-event-${ev.id}@atlanta-sabra.tech`, `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(new Date(ev.starts_at))}`, `DTEND:${icsDate(endOf(ev))}`,
    `SUMMARY:${icsText(ev.title)}`,
    ev.location ? `LOCATION:${icsText(ev.location)}` : null,
    `DESCRIPTION:${icsText([ev.description, ev.online_url].filter(Boolean).join('\n\n'))}`,
    `URL:https://atlanta-sabra.tech/events?e=${ev.id}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean)
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${ev.title.replace(/[^\w]+/g, '-').toLowerCase() || 'event'}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// <input type="datetime-local"> ↔ ISO, in the viewer's own time zone.
export const toLocalInput = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fromLocalInput = v => (v ? new Date(v).toISOString() : null)

export const fmtWhen = (iso, opts = {}) => new Date(iso).toLocaleString(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', ...opts,
})
