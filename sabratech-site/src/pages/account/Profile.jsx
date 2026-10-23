import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AccountShell, { Panel, Note } from '../../components/AccountShell'
import ListingForm from '../../components/ListingForm'
import { useAuth } from '../../lib/auth'
import {
  fetchMyIndividual, fetchListing, createListing, updateListing,
  myBusinesses, searchBusinesses, requestJoin, businessMembers, respondJoin,
  setMemberRole, removeMember, transferOwnership,
} from '../../lib/account'
import { Search, User, Building, DoneCheck } from '../../components/Icons'
import { fileUrl } from '../../lib/data'

const LISTING_STATUS = {
  approved: ['Live in the directory', 'bg-cyan text-white'],
  pending: ['Waiting for approval', 'bg-sand text-ink/70'],
  rejected: ['Not approved', 'bg-red-100 text-red-700'],
}
const ROLE = { owner: 'Owner', manager: 'Manager', employee: 'Employee' }

function StatusBadge({ status }) {
  const [label, cls] = LISTING_STATUS[status] || LISTING_STATUS.pending
  return <span className={`badge ${cls}`}>{label}</span>
}

// ---------------- Individual ----------------
function IndividualTab({ onFirstSave }) {
  const { user, profile, refreshListing } = useAuth()
  const [row, setRow] = useState(undefined)
  const [msg, setMsg] = useState(null)

  const load = useCallback(() => fetchMyIndividual(user.id).then(setRow).catch(() => setRow(null)), [user.id])
  useEffect(() => { load() }, [load])

  if (row === undefined) return <p className="py-10 text-center text-ink/40">Loading…</p>

  // Every member must have a profile — this is the first thing after signup.
  if (!row) {
    const [first, ...rest] = (profile?.full_name || '').trim().split(' ')
    return (
      <Panel className="rise-in" title="Welcome! Let's set up your profile"
        sub="Your profile is your page in the SabraTech directory — your role, skills and how members can reach you. Finish it to enter the site. If you applied before with a different email, contact us and we'll link it to this account.">
        <div className="rise-in" style={{ animationDelay: '140ms' }}>
        <ListingForm type="individual" submitLabel={profile?.status === 'approved' ? 'Save my profile' : 'Save and send for approval'}
          initial={{ first_name: first || '', last_name: rest.join(' '), email: user.email }}
          onSubmit={async f => {
            const r = await createListing(user.id, f)
            setRow(r); await refreshListing()
            window.scrollTo({ top: 0, behavior: 'smooth' })
            onFirstSave?.()  // next onboarding step: the business
          }} />
        </div>
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={row.status} />
        {row.published && <Link to={`/individual/${row.id}`} state={{ backTo: '/profile', backLabel: 'Back to Profile' }} className="text-sm font-bold text-cyan hover:underline">View my page</Link>}
        <span className="text-xs text-ink/45">{row.status === 'approved' ? 'Changes go live as soon as you save.' : 'You can keep editing while it waits for approval.'}</span>
      </div>
      {msg && <Note kind={msg[0]}>{msg[1]}</Note>}
      <Panel>
        <ListingForm key={row.id + (row.photo_url || '')} type="individual" initial={row}
          onSubmit={async f => { const r = await updateListing(row.id, f); setRow(r); setMsg(['ok', row.status === 'approved' ? 'Saved — your page is updated.' : 'Saved.']); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
      </Panel>
    </div>
  )
}

// ---------------- Businesses ----------------
export function TeamPanel({ biz, onChanged }) {
  const [members, setMembers] = useState(null)
  const [msg, setMsg] = useState(null)
  const isOwner = biz.role === 'owner'
  const load = useCallback(() => businessMembers(biz.business_id).then(setMembers).catch(e => setMsg(['error', e.message])), [biz.business_id])
  useEffect(() => { load() }, [load])

  const act = async (fn, okText) => {
    setMsg(null)
    try { await fn(); setMsg(['ok', okText]); await load(); onChanged?.() }
    catch (e) { setMsg(['error', e.message]) }
  }

  if (!members) return <p className="py-4 text-sm text-ink/40">Loading team…</p>
  const pending = members.filter(m => m.status === 'pending')
  const team = members.filter(m => m.status === 'approved')

  return (
    <div className="flex flex-col gap-4">
      {msg && <Note kind={msg[0]}>{msg[1]}</Note>}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">Requests to join ({pending.length})</p>
        {pending.length === 0 ? <p className="text-sm text-ink/45">No requests waiting.</p> : pending.map(m => {
          const leader = m.requested_role === 'manager'
          return (
            <div key={m.id} className="flex flex-wrap items-center gap-3 border-b border-navy/5 py-2.5">
              <span className="font-semibold text-navy">{m.member_name}</span>
              {leader && <span className="badge bg-royal text-white">Company leadership</span>}
              <span className="text-xs text-ink/45">{m.member_email}</span>
              <span className="ml-auto flex flex-wrap gap-2">
                {leader && isOwner && (
                  <button onClick={() => act(() => respondJoin(m.id, true, 'manager'), `${m.member_name} joined as a manager.`)} className="rounded-md bg-cyan px-3 py-1.5 text-xs font-bold text-white">Approve as manager</button>
                )}
                <button onClick={() => act(() => respondJoin(m.id, true, 'employee'), `${m.member_name} joined the team.`)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold ${leader ? 'bg-navy/10 text-navy' : 'bg-cyan text-white'}`}>{leader ? 'Approve as employee' : 'Approve'}</button>
                <button onClick={() => act(() => respondJoin(m.id, false), 'Request declined.')} className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">Decline</button>
              </span>
              {leader && !isOwner && <p className="w-full text-xs text-ink/45">Asked to be a manager — only the owner can approve that. You can approve them as an employee.</p>}
            </div>
          )
        })}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">Team ({team.length})</p>
        {team.map(m => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 border-b border-navy/5 py-2.5">
            <span className="font-semibold text-navy">{m.member_name}</span>
            <span className="text-xs text-ink/45">{m.member_email}</span>
            <span className="ml-auto flex flex-wrap items-center gap-2">
              {m.role === 'owner' ? <span className="badge bg-navy text-white">Owner</span>
                : isOwner ? (
                  <select aria-label={`Role for ${m.member_name}`} value={m.role} className="rounded-md border border-navy/20 bg-white px-2 py-1 text-xs font-bold text-navy"
                    onChange={e => act(() => setMemberRole(m.id, e.target.value), 'Role updated.')}>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                ) : <span className="badge bg-navy/10 text-navy">{ROLE[m.role]}</span>}
              {isOwner && m.role !== 'owner' && (
                <button onClick={() => { if (window.confirm(`Make ${m.member_name} the owner of ${biz.name}? You will become a manager.`)) act(() => transferOwnership(biz.business_id, m.user_id), 'Ownership transferred.') }}
                  className="text-xs font-bold text-ink/45 hover:text-cyan hover:underline">Make owner</button>
              )}
              {m.role !== 'owner' && (isOwner || m.role === 'employee') && (
                <button onClick={() => { if (window.confirm(`Remove ${m.member_name} from ${biz.name}?`)) act(() => removeMember(m.id), 'Removed from the team.') }}
                  className="text-xs font-bold text-red-600 hover:underline">Remove</button>
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink/45">Owners and managers can edit the listing and approve requests. Only the owner can change roles or hand over ownership.</p>
    </div>
  )
}

function BusinessEditor({ biz, onSaved }) {
  const [row, setRow] = useState(undefined)
  const [msg, setMsg] = useState(null)
  useEffect(() => { fetchListing(biz.business_id).then(setRow).catch(e => { setRow(null); setMsg(['error', e.message]) }) }, [biz.business_id])
  if (row === undefined) return <p className="py-4 text-sm text-ink/40">Loading…</p>
  if (!row) return <Note kind="error">{msg?.[1] || 'Could not load this listing.'}</Note>
  return (
    <div className="flex flex-col gap-4">
      {msg && <Note kind={msg[0]}>{msg[1]}</Note>}
      <ListingForm key={row.id + (row.photo_url || '')} type="company" initial={row}
        onSubmit={async f => { const r = await updateListing(row.id, f); setRow(r); setMsg(['ok', r.status === 'approved' ? 'Saved — the business page is updated.' : 'Saved.']); onSaved?.() }} />
    </div>
  )
}

function BusinessCard({ biz, onChanged }) {
  const [open, setOpen] = useState(null) // 'edit' | 'team'
  const [msg, setMsg] = useState(null)
  const editor = biz.status === 'approved' && (biz.role === 'owner' || biz.role === 'manager')
  const pendingMine = biz.status === 'pending'

  const leave = async () => {
    if (!window.confirm(pendingMine ? `Cancel your request to join ${biz.name}?` : `Leave ${biz.name}?`)) return
    try { await removeMember(biz.member_id); onChanged() } catch (e) { setMsg(['error', e.message]) }
  }

  return (
    <div className="card !bg-white">
      <div className="flex flex-wrap items-center gap-4 p-5">
        {biz.photo_url
          ? <img src={fileUrl(biz.photo_url)} alt="" className="h-12 w-12 shrink-0 rounded-md border border-navy/10 bg-white object-contain p-1" />
          : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-navy/5"><Building className="h-6 w-6 text-navy/30" /></span>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg text-navy">{biz.name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            {pendingMine ? <span className="badge bg-sand text-ink/70">{biz.requested_role === 'manager' ? 'Leadership request sent' : 'Request sent'}</span> : <span className="badge bg-navy/10 text-navy">{ROLE[biz.role]}</span>}
            {biz.listing_status !== 'approved' && <StatusBadge status={biz.listing_status} />}
            {editor && biz.pending_requests > 0 && <span className="badge bg-red-600 text-white">{biz.pending_requests} waiting to join</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {biz.published && <Link to={`/individual/${biz.business_id}`} state={{ backTo: '/profile?tab=businesses', backLabel: 'Back to Profile' }} className="rounded-md px-3 py-1.5 text-xs font-bold text-cyan hover:underline">View</Link>}
          {editor && <button onClick={() => setOpen(o => (o === 'edit' ? null : 'edit'))} className={`rounded-md px-3 py-1.5 text-xs font-bold ${open === 'edit' ? 'bg-navy text-white' : 'bg-navy/5 text-navy'}`}>Edit listing</button>}
          {editor && <button onClick={() => setOpen(o => (o === 'team' ? null : 'team'))} className={`rounded-md px-3 py-1.5 text-xs font-bold ${open === 'team' ? 'bg-navy text-white' : 'bg-navy/5 text-navy'}`}>Team</button>}
          {biz.role !== 'owner' && <button onClick={leave} className="rounded-md px-3 py-1.5 text-xs font-bold text-red-600 hover:underline">{pendingMine ? 'Cancel request' : 'Leave'}</button>}
        </div>
      </div>
      {msg && <div className="px-5 pb-4"><Note kind={msg[0]}>{msg[1]}</Note></div>}
      {open && (
        <div className="border-t border-navy/10 p-5">
          {open === 'edit' ? <BusinessEditor biz={biz} onSaved={onChanged} /> : <TeamPanel biz={biz} onChanged={onChanged} />}
        </div>
      )}
    </div>
  )
}

function AddBusiness({ onChanged }) {
  const { user, isApproved } = useAuth()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [searchedFor, setSearchedFor] = useState('')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState(null)
  const [picked, setPicked] = useState(null)
  const [leader, setLeader] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    clearTimeout(timer.current)
    const term = q.trim()
    if (term.length < 2) { setResults(null); setSearchedFor(''); return }
    timer.current = setTimeout(() => {
      searchBusinesses(term).then(r => { setResults(r || []); setSearchedFor(term) }).catch(e => setMsg(['error', e.message]))
    }, 300)
    return () => clearTimeout(timer.current)
  }, [q])

  const join = async b => {
    setMsg(null)
    try {
      await requestJoin(b.id, leader)
      setResults(rs => rs.map(x => (x.id === b.id ? { ...x, my_status: 'pending', my_role: 'employee' } : x)))
      setMsg(['ok', leader
        ? `Request sent — the owner of ${b.name} will review adding you as a manager.`
        : `Request sent — the owner of ${b.name} will review it.`])
      setPicked(null); setLeader(false)
      onChanged()
    } catch (e) { setMsg(['error', e.message]) }
  }

  if (creating) return (
    <Panel title="Create a new business" sub="You'll be its owner. It goes live in the directory once the site admin approves it.">
      <ListingForm type="company" submitLabel="Send for approval" onCancel={() => setCreating(false)}
        initial={{ name: searchedFor, email: user.email }}
        onSubmit={async f => { await createListing(user.id, f); setCreating(false); setQ(''); setMsg(['ok', 'Business created and sent for approval.']); onChanged() }} />
    </Panel>
  )

  return (
    <Panel title="Add a business" sub="Search first — if your company is already here, ask to join it instead of creating a copy.">
      <div className="relative">
        <input className="input !pl-10" placeholder="Business name…" value={q} onChange={e => { setQ(e.target.value); setMsg(null) }} aria-label="Search businesses" />
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/30" />
      </div>
      {msg && <div className="mt-3"><Note kind={msg[0]}>{msg[1]}</Note></div>}
      {results && (
        <div className="mt-3 flex flex-col">
          {results.length === 0 && <p className="py-3 text-sm text-ink/50">No business matches “{searchedFor}”.</p>}
          {results.map(b => {
            const canAsk = !b.my_status || b.my_status === 'declined'
            const open = picked === b.id
            return (
              <div key={b.id} className={`border-b border-navy/5 ${open ? 'rounded-md bg-cream' : ''}`}>
                <button type="button" disabled={!canAsk} onClick={() => { setPicked(open ? null : b.id); setLeader(false) }}
                  className="flex w-full flex-wrap items-center gap-3 px-2 py-3 text-left disabled:cursor-default">
                  {b.photo_url ? <img src={fileUrl(b.photo_url)} loading="lazy" alt="" className="h-9 w-9 rounded-md border border-navy/10 bg-white object-contain p-0.5" /> : <span className="grid h-9 w-9 place-items-center rounded-md bg-navy/5"><Building className="h-5 w-5 text-navy/30" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-navy">{b.name}</span>
                    <span className="block truncate text-xs text-ink/45">{b.published ? b.title : 'Waiting for approval'}</span>
                  </span>
                  {b.my_status === 'approved' ? <span className="badge bg-navy/10 text-navy">You're on the team</span>
                    : b.my_status === 'pending' ? <span className="badge bg-sand text-ink/70">Request sent</span>
                    : <span className="text-xs font-bold text-cyan">{open ? 'Selected' : 'This is my company'}</span>}
                </button>
                {open && (
                  <div className="flex flex-wrap items-center gap-4 px-2 pb-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                      <input type="checkbox" className="h-4 w-4 accent-cyan" checked={leader} onChange={e => setLeader(e.target.checked)} />
                      I am Company Leadership
                    </label>
                    <span className="flex-1 text-xs text-ink/45">{leader ? 'The owner will be asked to add you as a manager (you can edit the listing and approve team requests).' : 'You will be added to the team once approved.'}</span>
                    <button onClick={() => join(b)} disabled={!isApproved} title={isApproved ? '' : 'Available once your membership is approved'}
                      className="rounded-md bg-cyan px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Send request</button>
                  </div>
                )}
              </div>
            )
          })}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-ink/55">{results.length ? 'Not one of these?' : 'Not listed yet?'}</span>
            <button onClick={() => setCreating(true)} className="btn-outline !px-4 !py-2 !text-sm">Create “{searchedFor}”</button>
          </div>
        </div>
      )}
    </Panel>
  )
}

// Second step of signup: shown once, right after the first profile is saved.
function BusinessWelcome({ onDone, hasBusiness }) {
  const { profile } = useAuth()
  if (hasBusiness) return (
    <div className="rise-in flex flex-wrap items-center gap-3 rounded-lg border border-cyan/30 bg-cyan/5 p-5">
      <DoneCheck className="!mx-0 h-9 w-9 shrink-0" />
      <p className="flex-1 font-serif text-xl text-navy">You're all set!</p>
      <button onClick={onDone} className="btn-accent !px-4 !py-2 !text-sm">{profile?.status === 'approved' ? 'Go to the directory' : 'Done'}</button>
    </div>
  )
  return (
    <div className="rise-in rounded-lg border border-cyan/30 bg-cyan/5 p-5">
      <p className="font-serif text-xl text-navy">Profile saved! One last step: your business</p>
      <p className="mt-1 text-sm text-ink/60">
        Own a business or work at one? Search for it below — ask to join if it's already listed, or create it.
        {profile?.status !== 'approved' && ' (Joining an existing business opens once your membership is approved; you can create one now.)'}
      </p>
      <button onClick={onDone} className="mt-3 text-sm font-bold text-cyan hover:underline">
        {profile?.status === 'approved' ? "I'm not part of a business — skip to the directory" : "I'm not part of a business — skip"}
      </button>
    </div>
  )
}

function BusinessesTab({ welcome, onWelcomeDone }) {
  const [list, setList] = useState(null)
  const [err, setErr] = useState('')
  const load = useCallback(() => myBusinesses().then(r => { setList(r || []); setErr('') }).catch(e => { setList([]); setErr(e.message) }), [])
  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-5">
      {welcome && <BusinessWelcome onDone={onWelcomeDone} hasBusiness={!!list?.length} />}
      {err && <Note kind="error">{err}</Note>}
      {list === null ? <p className="py-6 text-center text-ink/40">Loading…</p>
        : list.length === 0 ? <p className="text-sm text-ink/55">You're not part of any business yet.</p>
        : list.map(b => <BusinessCard key={b.member_id} biz={b} onChanged={load} />)}
      <AddBusiness onChanged={load} />
    </div>
  )
}

export default function Profile() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const tab = params.get('tab') === 'businesses' ? 'businesses' : 'individual'
  const welcome = params.get('welcome') === '1'
  const setTab = t => setParams(t === 'individual' ? {} : { tab: t }, { replace: true })
  const finishWelcome = () => (profile?.status === 'approved' ? navigate('/search') : setParams({}, { replace: true }))

  return (
    <AccountShell title="Profile" intro="Your listings in the directory — you as a person, and the businesses you're part of.">
      <div className="mb-6 flex gap-2">
        {[['individual', 'Individual', User], ['businesses', 'Businesses', Building]].map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold ${tab === k ? 'bg-navy text-white' : 'bg-white text-ink/60'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {tab === 'individual'
        ? <IndividualTab onFirstSave={() => setParams({ tab: 'businesses', welcome: '1' }, { replace: true })} />
        : <BusinessesTab welcome={welcome} onWelcomeDone={finishWelcome} />}
    </AccountShell>
  )
}
