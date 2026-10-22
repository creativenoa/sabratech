import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AccountShell, { Panel, Note } from '../../components/AccountShell'
import { useAuth, signOut } from '../../lib/auth'
import { saveFullName, changePassword, deleteMyAccount } from '../../lib/account'

const STATUS = {
  approved: ['Approved member', 'bg-cyan text-white'],
  pending: ['Waiting for approval', 'bg-sand text-ink/70'],
  rejected: ['Not approved', 'bg-red-100 text-red-700'],
}

export default function MyAccount() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [nameMsg, setNameMsg] = useState(null)
  useEffect(() => { setName(profile?.full_name || '') }, [profile?.full_name])

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [pwBusy, setPwBusy] = useState(false)

  const [confirmText, setConfirmText] = useState('')
  const [delMsg, setDelMsg] = useState(null)
  const [delBusy, setDelBusy] = useState(false)

  const saveName = async e => {
    e.preventDefault()
    const v = name.trim()
    if (!v) { setNameMsg(['error', 'Please enter your name.']); return }
    try { await saveFullName(user.id, v); await refreshProfile(); setNameMsg(['ok', 'Saved.']) }
    catch (ex) { setNameMsg(['error', ex.message]) }
  }

  const savePw = async e => {
    e.preventDefault()
    if (pw.next.length < 8) { setPwMsg(['error', 'The new password needs at least 8 characters.']); return }
    if (pw.next !== pw.confirm) { setPwMsg(['error', 'The two new passwords do not match.']); return }
    setPwBusy(true); setPwMsg(null)
    try { await changePassword(pw.current, pw.next); setPw({ current: '', next: '', confirm: '' }); setPwMsg(['ok', 'Password changed.']) }
    catch (ex) { setPwMsg(['error', ex.message]) }
    finally { setPwBusy(false) }
  }

  const del = async () => {
    setDelBusy(true); setDelMsg(null)
    try {
      await deleteMyAccount()
      await signOut().catch(() => {})
      navigate('/', { replace: true })
    } catch (ex) { setDelMsg(['error', ex.message]); setDelBusy(false) }
  }

  const [statusLabel, statusCls] = STATUS[profile?.status] || STATUS.pending

  return (
    <AccountShell title="My Account" intro="Your login and membership.">
      <div className="flex flex-col gap-6">
        <Panel title="Your details">
          <form onSubmit={saveName} className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="acc-name">Full name</label>
              <input id="acc-name" className="input" value={name} onChange={e => { setName(e.target.value); setNameMsg(null) }} />
            </div>
            <div>
              <p className="label">Email (your login)</p>
              <p className="rounded-md border border-navy/10 bg-cream px-4 py-3 text-ink/70">{user?.email}</p>
              <p className="mt-1 text-xs text-ink/45">To change your login email, use Contact us and we'll move it for you.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="label !mb-0">Membership</span>
              <span className={`badge ${statusCls}`}>{statusLabel}</span>
              {profile?.is_admin && <span className="badge bg-navy text-white">Admin</span>}
              {profile?.created_at && <span className="text-ink/45">since {new Date(profile.created_at).toLocaleDateString()}</span>}
            </div>
            {nameMsg && <Note kind={nameMsg[0]}>{nameMsg[1]}</Note>}
            <div><button className="btn-accent !py-2.5 !text-sm">Save name</button></div>
          </form>
        </Panel>

        <Panel title="Password">
          <form onSubmit={savePw} className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="pw-cur">Current password</label>
              <input id="pw-cur" type="password" autoComplete="current-password" required className="input"
                value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="pw-new">New password</label>
                <input id="pw-new" type="password" autoComplete="new-password" required minLength={8} className="input"
                  value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="pw-conf">Repeat new password</label>
                <input id="pw-conf" type="password" autoComplete="new-password" required className="input"
                  value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
              </div>
            </div>
            {pwMsg && <Note kind={pwMsg[0]}>{pwMsg[1]}</Note>}
            <div><button disabled={pwBusy} className="btn-accent !py-2.5 !text-sm disabled:opacity-50">{pwBusy ? 'Changing…' : 'Change password'}</button></div>
          </form>
        </Panel>

        <Panel title="Delete account" tone="danger"
          sub="Permanently removes your login, your individual listing, your alerts and your business memberships. Businesses you own stay listed and the site admin assigns them a new owner. This cannot be undone.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="label" htmlFor="del-conf">Type DELETE to confirm</label>
              <input id="del-conf" className="input" value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off" />
            </div>
            <button onClick={del} disabled={confirmText !== 'DELETE' || delBusy}
              className="rounded-md bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">
              {delBusy ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
          {delMsg && <div className="mt-3"><Note kind={delMsg[0]}>{delMsg[1]}</Note></div>}
        </Panel>
      </div>
    </AccountShell>
  )
}
