import { useEffect, useRef, useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'
import { DEFAULT_CONTENT, uploadFile, fileUrl } from '../lib/data'
import { Search, Close } from '../components/Icons'
import { useAuth, signOut } from '../lib/auth'
import { adminSetOwner } from '../lib/account'
import { flushPush } from '../lib/push'
import { TeamPanel } from './account/Profile'
import SkillsInput from '../components/SkillsInput'
import AdminEvents from './admin/AdminEvents'
import { adminListSuggestions } from '../lib/events'

const EMPTY = {
  type: 'individual', name: '', first_name: '', last_name: '', title: '', company: '', bio: '', description: '',
  category: 'Other', skills: [], linkedin: '', website: '', github: '', email: '',
  phone: '', whatsapp: '', address: '', lat: null, lng: null, photo_url: '',
  cv_url: '', cv_updated_at: null, open_to_work: false, freelance: false,
  hiring: false, show_phone: false, show_email: false, posts: [],
  status: 'approved', published: true,
}

// The name inputs are rendered explicitly in the editor (they differ per type),
// so they are deliberately not part of this generic list.
const FIELDS = [
  ['title', 'Role / tagline'], ['company', 'At (company)'],
  ['category', 'Category'], ['linkedin', 'LinkedIn'], ['website', 'Website'],
  ['github', 'GitHub / careers'], ['email', 'Email'], ['phone', 'Phone'],
  ['whatsapp', 'WhatsApp'], ['address', 'Address'],
]

const fullName = t => `${t.first_name || ''} ${t.last_name || ''}`.trim()

// `name` is kept in sync by a DB trigger for individuals; mirroring it here
// keeps the console correct even if that trigger has not been installed yet.
// Never blanks an existing name when first/last are still empty.
const withSyncedName = t =>
  t.type === 'individual' && fullName(t) ? { ...t, name: fullName(t) } : t

const displayName = t =>
  (t.type === 'individual' && fullName(t)) || t.name || ''

// Admin override: who owns a listing (and, for businesses, its team).
function OwnerPanel({ listing, members, onOwnerChanged }) {
  const owner = members.find(m => m.id === listing.owner_id)
  const [email, setEmail] = useState(owner?.email || '')
  const [msg, setMsg] = useState(null)
  const [showTeam, setShowTeam] = useState(false)
  useEffect(() => { setEmail(owner?.email || '') }, [owner?.email])
  const apply = async () => {
    setMsg(null)
    try { const uid = await adminSetOwner(listing.id, email.trim()); onOwnerChanged(uid || null); setMsg(['ok', email.trim() ? 'Owner set.' : 'Owner removed.']) }
    catch (e) { setMsg(['error', e.message]) }
  }
  return (
    <div className="mt-5 rounded-md border border-navy/10 bg-cream p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">Owner</p>
      <p className="mt-1 text-xs text-ink/50">The member who can edit this listing from their Profile page{listing.type === 'company' ? ' and approve people who ask to join' : ''}. Use the email they log in with.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input className="input !py-2 flex-1 text-sm" list="admin-member-emails" placeholder="member@email.com (empty = no owner)" value={email} onChange={e => setEmail(e.target.value)} />
        <datalist id="admin-member-emails">{members.map(m => <option key={m.id} value={m.email} />)}</datalist>
        <button type="button" onClick={apply} className="rounded-md bg-navy px-4 py-2 text-xs font-bold text-white">Set owner</button>
      </div>
      {!owner && listing.owner_id && <p className="mt-2 text-xs text-ink/50">Owned by an account that is not in the members list.</p>}
      {msg && <p className={`mt-2 text-xs font-bold ${msg[0] === 'error' ? 'text-red-700' : 'text-cyan'}`}>{msg[1]}</p>}
      {listing.type === 'company' && listing.owner_id && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowTeam(v => !v)} className="text-xs font-bold text-cyan hover:underline">{showTeam ? 'Hide team' : 'Manage team and join requests'}</button>
          {showTeam && <div className="mt-3 rounded-md bg-white p-4"><TeamPanel biz={{ business_id: listing.id, name: listing.name, role: 'owner' }} /></div>}
        </div>
      )}
    </div>
  )
}

// ---------- Action-item banner ----------
// One red line at a time under the header. When an item is handled it fades
// out and the next fades in. "x" hides an item for this login only: dismissals
// live in sessionStorage and are cleared on sign-out, so anything still
// unhandled comes back the next time an admin logs in.
const DISMISS_KEY = 'sabratech_admin_dismissed'
const readDismissed = () => {
  try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]') } catch { return [] }
}
const writeDismissed = list => {
  try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify(list)) } catch { /* private mode etc. */ }
}
const clearDismissed = () => {
  try { sessionStorage.removeItem(DISMISS_KEY) } catch { /* ignore */ }
}

function ActionBanner({ items, onGo, onDismiss }) {
  const next = items[0] || null
  const [current, setCurrent] = useState(null)
  const [visible, setVisible] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (current && next && next.key === current.key) { setCurrent(next); return }
    if (current && visible) {
      // current item is done or dismissed: fade it out, then make room for the next
      setVisible(false)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCurrent(null), 350)
      return
    }
    if (!current && next) {
      setCurrent(next)
      timer.current = setTimeout(() => setVisible(true), 20)
    }
  }, [next?.key, current?.key, visible])

  useEffect(() => () => clearTimeout(timer.current), [])

  if (!current) return null
  return (
    <div className={`mb-5 flex items-center gap-3 rounded-lg bg-red-600 px-4 py-3 text-white shadow-md transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}
      role="status">
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-2 text-xs font-black">{items.length || 1}</span>
      <p className="flex-1 text-sm font-bold">{current.text}</p>
      <button className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
        onClick={() => onGo(current)}>{current.cta}</button>
      <button aria-label="Dismiss" title="Hide until next login"
        className="shrink-0 rounded-md p-1 text-white/80 hover:bg-white/15 hover:text-white"
        onClick={() => onDismiss(current)}><Close className="h-4 w-4" /></button>
    </div>
  )
}

export default function Admin() {
  const { loading: authLoading, isAuthed, isAdmin, user } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState([])
  const [sponsors, setSponsors] = useState([])
  const [aiTools, setAiTools] = useState([])
  const [editingTool, setEditingTool] = useState(null)
  const [cats, setCats] = useState([])
  const [content, setContent] = useState(null)
  const [editing, setEditing] = useState(null)
  const [adminQ, setAdminQ] = useState('')
  const [newCat, setNewCat] = useState('')
  const [members, setMembers] = useState([])
  const [contacts, setContacts] = useState([])
  const [contactsError, setContactsError] = useState('')
  const [membersError, setMembersError] = useState('')
  const [msg, setMsg] = useState('')
  const [dismissed, setDismissed] = useState(readDismissed)
  const [highlight, setHighlight] = useState(null)

  // Never let a missing profiles table white-screen the console — surface it instead.
  const loadContacts = async () => {
    try {
      const { data, error } = await supabase.from('contact_inquiries')
        .select('id, first_name, last_name, email, phone, message, status, created_at')
        .order('created_at', { ascending: false })
      if (error) { setContacts([]); setContactsError(error.message || 'The contact table is not available yet.'); return }
      setContacts(data || [])
      setContactsError('')
    } catch (err) {
      setContacts([])
      setContactsError(err?.message || 'The contact table is not available yet.')
    }
  }

  const setContactStatus = async (id, status) => {
    const { error } = await supabase.from('contact_inquiries').update({ status }).eq('id', id)
    setMsg(error ? 'Update failed: ' + error.message : 'Updated')
    if (!error) loadContacts()
  }

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase.from('profiles')
        .select('id, full_name, email, status, created_at')
        .order('created_at', { ascending: false })
      if (error) { setMembers([]); setMembersError(error.message || 'The members table is not available yet.'); return }
      setMembers(data || [])
      setMembersError('')
    } catch (err) {
      setMembers([])
      setMembersError(err?.message || 'The members table is not available yet.')
    }
  }

  const load = async () => {
    const { data: t } = await supabase.from('talents').select('*').order('created_at', { ascending: false })
    setRows(t || [])
    const { data: s } = await supabase.from('sponsor_inquiries').select('*').order('created_at', { ascending: false })
    setSponsors(s || [])
    const { data: at } = await supabase.from('ai_tools').select('*').order('sort')
    setAiTools(at || [])
    const { data: c } = await supabase.from('categories').select('*').order('sort')
    setCats(c || [])
    const { data: sc } = await supabase.from('site_content').select('*')
    const merged = { ...DEFAULT_CONTENT }
    if (sc) for (const row of sc) if (row.value) merged[row.key] = row.value
    setContent(merged)
    await loadMembers(); loadContacts()
    adminListSuggestions().then(x => setSuggestions((x || []).filter(s => s.status === 'new'))).catch(() => {})
  }
  useEffect(() => { if (isAdmin) load() }, [isAdmin])

  if (!hasSupabase) return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="mt-4 font-bold text-ink/70">The admin console becomes available once the database (Neon) is connected.</p>
    </div>
  )

  const save = async t => {
    const { id, created_at, owner_id, ...fields } = withSyncedName(t)
    if (typeof fields.skills === 'string') fields.skills = fields.skills.split(',').map(s => s.trim()).filter(Boolean)
    const q = id ? supabase.from('talents').update(fields).eq('id', id) : supabase.from('talents').insert([fields])
    const { error } = await q
    setMsg(error ? 'Save failed: ' + error.message : 'Saved')
    if (!error) { setEditing(null); load() }
  }
  const saveTool = async t => {
    const { id, created_at, ...fields } = t
    fields.sort = Number(fields.sort) || 999
    const q = id ? supabase.from('ai_tools').update(fields).eq('id', id) : supabase.from('ai_tools').insert([fields])
    const { error } = await q
    setMsg(error ? 'Save failed: ' + error.message : 'Saved')
    if (!error) { setEditingTool(null); load() }
  }

  // ---- Auto-save -------------------------------------------------------
  // Debounced persist 800ms after the last edit. Never fires on open, never
  // creates a row from a blank form, and a pending save can't land on the
  // record you switched to.
  const talentTimer = useRef(null)
  const talentKey = useRef(null)
  const toolTimer = useRef(null)
  const toolKey = useRef(null)

  const autoSaveTalent = async t => {
    const { id, created_at, owner_id, ...fields } = withSyncedName(t)
    if (typeof fields.skills === 'string') fields.skills = fields.skills.split(',').map(x => x.trim()).filter(Boolean)
    setMsg('Saving\u2026')
    if (id) {
      const { error } = await supabase.from('talents').update(fields).eq('id', id)
      setMsg(error ? 'Save failed: ' + error.message : 'Saved')
      if (!error) load()
      return
    }
    const { data, error } = await supabase.from('talents').insert([fields]).select().single()
    setMsg(error ? 'Save failed: ' + error.message : 'Saved')
    if (!error && data) {
      talentKey.current = null // re-arm: the id change below is ours, not a user edit
      setEditing(ed => (ed ? { ...ed, id: data.id } : ed))
      load()
    }
  }

  const autoSaveTool = async t => {
    const { id, created_at, ...fields } = t
    fields.sort = Number(fields.sort) || 999
    setMsg('Saving\u2026')
    if (id) {
      const { error } = await supabase.from('ai_tools').update(fields).eq('id', id)
      setMsg(error ? 'Save failed: ' + error.message : 'Saved')
      if (!error) load()
      return
    }
    const { data, error } = await supabase.from('ai_tools').insert([fields]).select().single()
    setMsg(error ? 'Save failed: ' + error.message : 'Saved')
    if (!error && data) {
      toolKey.current = null
      setEditingTool(ed => (ed ? { ...ed, id: data.id } : ed))
      load()
    }
  }

  useEffect(() => {
    clearTimeout(talentTimer.current)
    if (!isAdmin || !editing) { talentKey.current = null; return }
    const key = editing.id || 'new'
    if (talentKey.current !== key) { talentKey.current = key; return } // just opened
    if (!editing.id && !displayName(editing).trim()) return            // blank new form
    talentTimer.current = setTimeout(() => autoSaveTalent(editing), 800)
    return () => clearTimeout(talentTimer.current)
  }, [editing, isAdmin])

  useEffect(() => {
    clearTimeout(toolTimer.current)
    if (!isAdmin || !editingTool) { toolKey.current = null; return }
    const key = editingTool.id || 'new'
    if (toolKey.current !== key) { toolKey.current = key; return }
    if (!editingTool.id && !(editingTool.name || '').trim()) return
    toolTimer.current = setTimeout(() => autoSaveTool(editingTool), 800)
    return () => clearTimeout(toolTimer.current)
  }, [editingTool, isAdmin])
  // ----------------------------------------------------------------------

  if (authLoading) return <div className="min-h-[60vh]" />

  // The route guard only mounts this page for approved admins; render nothing otherwise.
  if (!isAdmin) return null

  const pending = rows.filter(r => r.status === 'pending')
  const live = rows.filter(r => r.status !== 'pending')

  // Newest first from the query, then pending floated to the top (Array.sort is stable).
  const membersSorted = [...members].sort((a, b) =>
    (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1))
  const membersPending = members.filter(m => m.status === 'pending').length

  const match = t => {
    const n = adminQ.trim().toLowerCase()
    if (!n) return true
    return [t.name, t.first_name, t.last_name, t.category, t.title, t.company, t.bio, ...(t.skills || [])]
      .some(f => (f || '').toLowerCase().includes(n))
  }


  const del = async id => {
    if (!confirm('Delete this profile?')) return
    await supabase.from('talents').delete().eq('id', id)
    load()
  }

  // Optimistic: the row (and its banner) disappears the moment you click.
  const setTalentStatus = async (t, status, published) => {
    setRows(rs => rs.map(r => r.id === t.id ? { ...r, status, published } : r))
    const { error } = await supabase.from('talents').update({ status, published }).eq('id', t.id)
    setMsg(error ? 'Update failed: ' + error.message : status === 'approved' ? 'Approved' : 'Rejected')
    load()
    flushPush({ force: true })
  }
  const approve = t => setTalentStatus(t, 'approved', true)
  const reject = t => setTalentStatus(t, 'rejected', false)

  const setMemberStatus = async (id, status) => {
    setMembers(ms => ms.map(m => m.id === id ? { ...m, status } : m))
    try {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
      setMsg(error ? 'Member update failed: ' + error.message : status === 'approved' ? 'Member approved — their profile is live too' : status === 'rejected' ? 'Member rejected' : 'Member updated')
      load()  // approving a member also publishes their profile, so refresh listings too
      flushPush({ force: true })
    } catch (err) {
      setMsg('Member update failed: ' + (err?.message || 'unknown error'))
      loadMembers()
    }
  }

  const setSponsorStatus = async (id, status) => {
    await supabase.from('sponsor_inquiries').update({ status }).eq('id', id)
    load()
  }

  const delTool = async id => {
    if (!confirm('Delete this tool?')) return
    await supabase.from('ai_tools').delete().eq('id', id)
    setEditingTool(null); load()
  }

  const memberLabel = m => m.full_name || m.email || 'someone'
  const actionItems = [
    ...members.filter(m => m.status === 'pending').map(m => ({
      key: 'member:' + m.id, tab: 'members', rowId: 'member-' + m.id,
      text: `New member waiting for approval: ${memberLabel(m)}${rows.some(r => r.owner_id === m.id && r.type === 'individual') ? '' : ' (profile not finished yet)'}`, cta: 'Approve member',
    })),
    // A new member's own profile is approved together with the member, so it
    // gets no banner of its own.
    ...pending.filter(t => !(t.type === 'individual' && members.some(m => m.id === t.owner_id && m.status === 'pending'))).map(t => ({
      key: 'talent:' + t.id, tab: 'pending', rowId: 'talent-' + t.id,
      text: `New ${t.type === 'company' ? 'business' : 'individual'} listing waiting for approval: ${displayName(t) || 'untitled'}`,
      cta: t.type === 'company' ? 'Approve business' : 'Approve listing',
    })),
    ...suggestions.map(sg => ({
      key: 'sugg:' + sg.id, tab: 'events', rowId: 'sugg-' + sg.id,
      text: `Event suggestion waiting: ${sg.title}`, cta: 'Review suggestion',
    })),
  ].filter(a => !dismissed.includes(a.key))

  const goToAction = a => {
    setTab(a.tab)
    setHighlight(a.rowId)
    setTimeout(() => document.getElementById(a.rowId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    setTimeout(() => setHighlight(h => (h === a.rowId ? null : h)), 4000)
  }
  const dismissAction = a => {
    const list = [...new Set([...dismissed, a.key])]
    setDismissed(list); writeDismissed(list)
  }
  const rowRing = id => (highlight === id ? ' ring-2 ring-red-500 ring-offset-2 transition-shadow' : '')

  const TABS = [
    ['pending', `Applications (${pending.length})`],
    ['talents', `Directory (${live.length})`],
    ['members', `Members (${membersPending})`],
    ['contact', `Contact (${contacts.filter(c => c.status === 'new').length})`],
    ['sponsors', `Sponsors (${sponsors.filter(s => s.status === 'new').length})`],
    ['tools', `AI tools (${aiTools.length})`],
    ['events', `Events${suggestions.length ? ` (${suggestions.length})` : ''}`],
    ['cats', `Categories (${cats.length})`],
    ['content', 'Site texts'],
  ]

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8">
      <ActionBanner items={actionItems} onGo={goToAction} onDismiss={dismissAction} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-navy">Site admin</h1>
        <button className="text-sm font-bold text-cyan hover:underline" onClick={() => { clearDismissed(); signOut().catch(() => {}) }}>Sign out</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-bold ${tab === t ? 'bg-navy text-white' : 'bg-white text-ink/60'}`}>{label}</button>
        ))}
      </div>
      {msg && <p className="mt-3 rounded-md bg-white p-3 text-sm font-bold">{msg}</p>}

      {tab === 'pending' && (
        <div className="mt-4 flex flex-col gap-2">
          {pending.length === 0 && <p className="py-10 text-center text-ink/40">No pending applications.</p>}
          {pending.map(t => (
            <div key={t.id} id={'talent-' + t.id} className={'card flex flex-wrap items-center gap-3 !p-4' + rowRing('talent-' + t.id)}>
              <span className={`badge ${t.type === 'company' ? 'bg-royal text-white' : 'bg-cyan text-white'}`}>{t.type === 'company' ? 'startup' : t.type}</span>
              <strong className="text-navy">{t.name}</strong>
              <span className="text-xs text-ink/50">{[t.title, t.company].filter(Boolean).join(' at ')} · {t.category}</span>
              <span className="ml-auto flex gap-2">
                <button className="rounded-md bg-navy px-3 py-1.5 text-xs font-bold text-white" onClick={() => setEditing(t)}>Review / edit</button>
                <button className="rounded-md bg-cyan px-3 py-1.5 text-xs font-bold text-white" onClick={() => approve(t)}>Approve</button>
                <button className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700" onClick={() => reject(t)}>Reject</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'contact' && (
        <div className="mt-4 flex flex-col gap-2">
          {contactsError && (
            <div className="card !p-4">
              <p className="text-sm font-bold text-red-700">Contact messages could not be loaded.</p>
              <p className="mt-1 text-xs leading-relaxed text-ink/60">Something went wrong reading the contact messages. Please reload the page and try again; if it keeps happening, check the database.</p>
            </div>
          )}
          {!contactsError && contacts.length === 0 && <p className="py-10 text-center text-ink/40">No messages yet.</p>}
          {contacts.map(c => (
            <div key={c.id} className="card !p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`badge ${c.status === 'new' ? 'bg-cyan text-white' : c.status === 'archived' ? 'bg-sand text-ink/60' : 'bg-navy/10 text-navy'}`}>{c.status}</span>
                <strong className="text-navy">{[c.first_name, c.last_name].filter(Boolean).join(' ')}</strong>
                {c.email && <a href={`mailto:${c.email}`} className="text-xs font-semibold text-cyan">{c.email}</a>}
                {c.phone && <span className="text-xs text-ink/50">{c.phone}</span>}
                <span className="text-xs text-ink/40">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span>
                <span className="ml-auto flex gap-2">
                  {c.status !== 'read' && <button className="rounded-md bg-navy px-3 py-1.5 text-xs font-bold text-white" onClick={() => setContactStatus(c.id, 'read')}>Mark read</button>}
                  {c.status !== 'archived' && <button className="rounded-md bg-sand px-3 py-1.5 text-xs font-bold text-ink/70" onClick={() => setContactStatus(c.id, 'archived')}>Archive</button>}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">{c.message}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'events' && (
        <AdminEvents members={members} businesses={rows.filter(r => r.type === 'company')} adminId={user?.id}
          onCountsChanged={() => adminListSuggestions().then(x => setSuggestions((x || []).filter(s => s.status === 'new'))).catch(() => {})} />
      )}

      {tab === 'members' && (
        <div className="mt-4 flex flex-col gap-2">
          {membersError && (
            <div className="card !p-4">
              <p className="text-sm font-bold text-red-700">Members could not be loaded.</p>
              <p className="mt-1 text-xs leading-relaxed text-ink/60">Something went wrong reading the member list. Please reload the page and try again; if it keeps happening, check the database.</p>
            </div>
          )}
          {!membersError && membersSorted.length === 0 && <p className="py-10 text-center text-ink/40">No members yet.</p>}
          {membersSorted.map(m => (
            <div key={m.id} id={'member-' + m.id} className={'card flex flex-wrap items-center gap-3 !p-4' + rowRing('member-' + m.id)}>
              <span className={`badge ${m.status === 'approved' ? 'bg-cyan text-white' : m.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-sand text-ink/60'}`}>{m.status || 'pending'}</span>
              <strong className="text-navy">{m.full_name || 'No name'}</strong>
              <span className="text-xs text-ink/50">{m.email}</span>
              <span className="text-xs text-ink/40">{m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}</span>
              {rows.find(r => r.owner_id === m.id && r.type === 'individual') && (
                <button className="text-xs font-bold text-cyan hover:underline" onClick={() => setEditing(rows.find(r => r.owner_id === m.id && r.type === 'individual'))}>View profile</button>
              )}
              {(m.status || 'pending') === 'pending' && (
                <span className="ml-auto flex gap-2">
                  <button className="rounded-md bg-cyan px-3 py-1.5 text-xs font-bold text-white" onClick={() => setMemberStatus(m.id, 'approved')}>Approve</button>
                  <button className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700" onClick={() => setMemberStatus(m.id, 'rejected')}>Reject</button>
                </span>
              )}
              {m.status === 'rejected' && (
                <button className="ml-auto text-xs font-bold text-ink/40 hover:text-cyan hover:underline" onClick={() => setMemberStatus(m.id, 'approved')}>Approve after all</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'talents' && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary !py-2 !text-sm" onClick={() => setEditing({ ...EMPTY })}>+ New profile</button>
            <div className="relative max-w-md flex-1">
              <input className="input !py-2 !pl-10 text-sm" placeholder="Search by name, category, skill…"
                value={adminQ} onChange={e => setAdminQ(e.target.value)} />
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/30" />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {live.filter(match).map(t => (
              <button key={t.id} type="button" onClick={() => setEditing(t)} className="card flex w-full flex-wrap items-center gap-3 !p-3 text-left transition hover:!border-cyan">
                <span className={`badge ${t.type === 'company' ? 'bg-royal text-white' : 'bg-cyan text-white'}`}>{t.type === 'company' ? 'startup' : t.type}</span>
                <strong className="text-navy">{t.name}</strong>
                <span className="text-xs text-ink/50">{t.category}</span>
                {!t.published && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">hidden</span>}
                {t.cv_url && <span className="text-xs font-bold text-cyan">CV</span>}
                <span className="ml-auto text-sm text-navy/30">Edit →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'sponsors' && (
        <div className="mt-4 flex flex-col gap-2">
          {sponsors.length === 0 && <p className="py-10 text-center text-ink/40">No sponsor inquiries yet.</p>}
          {sponsors.map(s => (
            <div key={s.id} className="card !p-4">
              <div className="flex flex-wrap items-center gap-3">
                <strong className="text-navy">{s.name}</strong>
                {s.company && <span className="text-sm text-ink/60">{s.company}</span>}
                <a className="text-sm font-semibold text-cyan" href={`mailto:${s.email}`}>{s.email}</a>
                {s.phone && <span className="text-sm text-ink/60">{s.phone}</span>}
                <span className={`badge ml-auto ${s.status === 'new' ? 'bg-cyan text-white' : 'bg-sand text-ink/60'}`}>{s.status}</span>
              </div>
              {s.message && <p className="mt-2 text-sm text-ink/70">{s.message}</p>}
              <div className="mt-3 flex gap-2">
                {['new', 'contacted', 'closed'].filter(x => x !== s.status).map(x => (
                  <button key={x} className="rounded-md bg-white px-3 py-1 text-xs font-bold text-navy ring-1 ring-navy/20" onClick={() => setSponsorStatus(s.id, x)}>Mark {x}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tools' && (
        <div className="mt-4">
          <button className="btn-primary !py-2 !text-sm" onClick={() => setEditingTool({ name: '', category: 'Chat Assistants', url: '', description: '', sort: 999, published: true })}>+ New tool</button>
          <div className="mt-3 flex flex-col gap-1.5">
            {aiTools.map(t => (
              <button key={t.id} type="button" onClick={() => setEditingTool(t)} className="card flex w-full flex-wrap items-center gap-3 !p-3 text-left transition hover:!border-cyan">
                <strong className="text-navy">{t.name}</strong>
                <span className="text-xs text-ink/50">{t.category}</span>
                <span className="max-w-[300px] truncate text-xs text-cyan">{t.url}</span>
                {!t.published && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">hidden</span>}
                <span className="ml-auto text-sm text-navy/30">Edit →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {editingTool && (
        <div className="fixed inset-0 z-[2000] overflow-y-auto bg-navy/60 p-4 backdrop-blur-sm" onClick={() => setEditingTool(null)}>
          <div className="card mx-auto my-6 w-full max-w-lg !bg-white p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-navy">{editingTool.id ? `Edit: ${editingTool.name}` : 'New tool'}</h2>
              <button onClick={() => setEditingTool(null)} aria-label="Close" className="text-navy/40 hover:text-navy"><Close className="h-6 w-6" /></button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="label">Name</label>
                <input className="input" value={editingTool.name} onChange={e => setEditingTool(t => ({ ...t, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Category</label>
                <input className="input" list="tool-cats" value={editingTool.category || ''} onChange={e => setEditingTool(t => ({ ...t, category: e.target.value }))} />
                <datalist id="tool-cats">
                  {[...new Set(aiTools.map(x => x.category))].map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="label">Link (use your affiliate link here)</label>
                <input className="input" value={editingTool.url} onChange={e => setEditingTool(t => ({ ...t, url: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={3} className="input" value={editingTool.description || ''} onChange={e => setEditingTool(t => ({ ...t, description: e.target.value }))} />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-28">
                  <label className="label">Sort</label>
                  <input className="input !py-2" value={editingTool.sort ?? 999} onChange={e => setEditingTool(t => ({ ...t, sort: e.target.value }))} />
                </div>
                <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink/70">
                  <input type="checkbox" className="h-4 w-4 accent-cyan" checked={!!editingTool.published} onChange={e => setEditingTool(t => ({ ...t, published: e.target.checked }))} />
                  Published
                </label>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button className="btn-accent !py-2.5 !text-sm" onClick={() => saveTool(editingTool)}>Save</button>
              {editingTool.id && <button className="rounded-md bg-red-100 px-4 py-2.5 text-sm font-bold text-red-700" onClick={() => delTool(editingTool.id)}>Delete</button>}
              <button className="ml-auto text-sm font-semibold text-ink/50" onClick={() => setEditingTool(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'cats' && (
        <div className="mt-4 max-w-md">
          <form className="flex gap-2" onSubmit={async e => {
            e.preventDefault()
            if (!newCat.trim()) return
            await supabase.from('categories').insert([{ name: newCat.trim() }])
            setNewCat(''); load()
          }}>
            <input className="input !py-2 text-sm" placeholder="New category…" value={newCat} onChange={e => setNewCat(e.target.value)} />
            <button className="btn-primary !py-2 !text-sm">Add</button>
          </form>
          <div className="mt-3 flex flex-col gap-1.5">
            {cats.map(c => (
              <div key={c.id} className="card flex items-center justify-between !p-3">
                <span className="font-semibold text-navy">{c.name}</span>
                <button className="text-xs font-bold text-red-600" onClick={async () => {
                  if (!confirm(`Delete category "${c.name}"?`)) return
                  await supabase.from('categories').delete().eq('id', c.id); load()
                }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'content' && content && (
        <div className="mt-4 flex max-w-2xl flex-col gap-4">
          {[['home_', 'Home page'], ['search_', 'Search page'], ['ai_', 'AI page'], ['about_', 'About page'], ['apply_', 'Apply page & form labels'], ['blog_', 'Blog page'], ['sponsor_', 'Sponsor'], ['footer_', 'Footer']].map(([prefix, section]) => (
            <div key={prefix}>
              <p className="mb-2 mt-4 border-b border-navy/10 pb-1 text-xs font-bold uppercase tracking-[0.2em] text-navy/50">{section}</p>
              <div className="flex flex-col gap-3">
                {Object.entries(content).filter(([k]) => k.startsWith(prefix)).map(([key, value]) => (
                  <div key={key}>
                    <label className="label !text-xs !text-ink/60">{key.replace(prefix, '').replaceAll('_', ' ')}</label>
                    <textarea rows={String(value).length > 120 ? 5 : String(value).length > 60 ? 2 : 1} className="input !py-2 text-sm" value={value}
                      onChange={e => setContent(c => ({ ...c, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button className="btn-primary" onClick={async () => {
            for (const [key, value] of Object.entries(content)) {
              await supabase.from('site_content').upsert([{ key, value }])
            }
            setMsg('Texts saved')
          }}>Save all texts</button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[2000] overflow-y-auto bg-navy/60 p-4 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="card mx-auto my-6 w-full max-w-2xl !bg-white p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-navy">{editing.id ? `Edit: ${displayName(editing)}` : 'New profile'}</h2>
              <span className="mr-3 self-center text-xs text-ink/50">{msg}</span>
              <button onClick={() => setEditing(null)} aria-label="Close" className="text-navy/40 hover:text-navy"><Close className="h-6 w-6" /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Type</label>
                <select className="input" value={editing.type} onChange={e => setEditing(ed => ({ ...ed, type: e.target.value }))}>
                  <option value="individual">Individual</option>
                  <option value="company">Startup</option>
                </select>
              </div>
              {editing.type === 'individual' ? (
                <>
                  <div>
                    <label className="label">First name</label>
                    <input className="input" value={editing.first_name || ''} onChange={e => setEditing(ed => ({ ...ed, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Last name</label>
                    <input className="input" value={editing.last_name || ''} onChange={e => setEditing(ed => ({ ...ed, last_name: e.target.value }))} />
                  </div>
                </>
              ) : (
                <div>
                  <label className="label">Startup name</label>
                  <input className="input" value={editing.name || ''} onChange={e => setEditing(ed => ({ ...ed, name: e.target.value }))} />
                </div>
              )}
              {FIELDS.map(([k, label]) => (
                <div key={k}>
                  <label className="label">{label}</label>
                  {k === 'category' ? (
                    <select className="input" value={editing.category || ''} onChange={e => setEditing(ed => ({ ...ed, category: e.target.value }))}>
                      {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      {!cats.some(c => c.name === editing.category) && editing.category && <option value={editing.category}>{editing.category}</option>}
                    </select>
                  ) : (
                    <input className="input" value={editing[k] || ''} onChange={e => setEditing(ed => ({ ...ed, [k]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="label">Short bio</label>
                <textarea rows={2} className="input" value={editing.bio || ''} onChange={e => setEditing(ed => ({ ...ed, bio: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea rows={4} className="input" value={editing.description || ''} onChange={e => setEditing(ed => ({ ...ed, description: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <SkillsInput id="admin-skills" label="Skills"
                  value={Array.isArray(editing.skills) ? editing.skills : String(editing.skills || '').split(',').map(x => x.trim()).filter(Boolean)}
                  onChange={v => setEditing(ed => ({ ...ed, skills: v }))} placeholder="React, Python, AWS, AI…" />
              </div>
              <div>
                <label className="label">Photo / logo</label>
                {editing.photo_url && <img src={fileUrl(editing.photo_url)} alt="" className="mb-2 h-20 w-20 rounded-md object-cover" />}
                <input type="file" accept="image/*" className="input !py-2 text-sm" onChange={async e => {
                  const f = e.target.files?.[0]; if (!f) return
                  const url = await uploadFile('talent-photos', f)
                  setEditing(ed => ({ ...ed, photo_url: url }))
                }} />
              </div>
              <div>
                <label className="label">CV (PDF)</label>
                {editing.cv_url && <a href={fileUrl(editing.cv_url)} target="_blank" rel="noreferrer" className="mb-2 block text-sm font-bold text-cyan">Current CV ↗</a>}
                <input type="file" accept=".pdf" className="input !py-2 text-sm" onChange={async e => {
                  const f = e.target.files?.[0]; if (!f) return
                  const url = await uploadFile('talent-cvs', f)
                  setEditing(ed => ({ ...ed, cv_url: url, cv_updated_at: new Date().toISOString() }))
                }} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Recent posts (one per line: Title | URL | image URL optional)</label>
                <textarea rows={3} className="input text-sm"
                  value={(Array.isArray(editing.posts) ? editing.posts : []).map(p => [p.title, p.url, p.image].filter(Boolean).join(' | ')).join('\n')}
                  onChange={e => setEditing(ed => ({
                    ...ed,
                    posts: e.target.value.split('\n').map(line => {
                      const [title, url, image] = line.split('|').map(s => s?.trim())
                      return url ? { title, url, image } : null
                    }).filter(Boolean),
                  }))} />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div>
                  <label className="label">Lat (map)</label>
                  <input className="input" value={editing.lat ?? ''} onChange={e => setEditing(ed => ({ ...ed, lat: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className="label">Lng (map)</label>
                  <input className="input" value={editing.lng ?? ''} onChange={e => setEditing(ed => ({ ...ed, lng: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 rounded-md border border-navy/10 bg-cream p-3 text-sm font-semibold text-ink/70 sm:col-span-2">
                {[['published', 'Published'], ['open_to_work', 'Open to work'], ['freelance', 'Freelance'], ['hiring', 'Hiring'], ['show_phone', 'Show phone'], ['show_email', 'Show email'], ['show_whatsapp', 'Show WhatsApp'], ['show_on_map', 'Show on map']].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-cyan" checked={!!editing[k]} onChange={e => setEditing(ed => ({ ...ed, [k]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            {editing.id && <OwnerPanel listing={editing} members={members} onOwnerChanged={uid => setEditing(ed => ({ ...ed, owner_id: uid }))} />}
            <div className="mt-5 flex items-center gap-3">
              <button className="btn-accent !py-2.5 !text-sm" onClick={() => save({ ...editing, status: editing.status === 'pending' ? 'approved' : editing.status })}>Save</button>
              {editing.id && <button className="rounded-md bg-red-100 px-4 py-2.5 text-sm font-bold text-red-700" onClick={() => del(editing.id)}>Delete</button>}
              <button className="ml-auto text-sm font-semibold text-ink/50" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
