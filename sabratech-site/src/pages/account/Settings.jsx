import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AccountShell, { Panel, Note, Toggle } from '../../components/AccountShell'
import { useAuth } from '../../lib/auth'
import { fetchMyIndividual, updateListing } from '../../lib/account'

const PRIVACY = [
  { key: 'show_email', label: 'Show my email', desc: 'Members can email you from your page.' },
  { key: 'show_phone', label: 'Show my phone number', desc: 'Members can call or text you.' },
  { key: 'show_whatsapp', label: 'Show my WhatsApp', desc: 'Members can message you on WhatsApp.' },
  { key: 'show_on_map', label: 'Show my area on the map', desc: 'Your area/address and a pin on the directory map.' },
]
// show_email/show_phone default off (as on the application form); the others default on.
const isOn = (row, key) => (key === 'show_email' || key === 'show_phone' ? !!row?.[key] : row?.[key] !== false)

export default function Settings() {
  const { user } = useAuth()
  const [row, setRow] = useState(undefined)
  const [msg, setMsg] = useState(null)
  const uid = user?.id
  const load = useCallback(() => { if (uid) fetchMyIndividual(uid).then(setRow).catch(() => setRow(null)) }, [uid])
  useEffect(() => { load() }, [load])

  const flip = async (key, value) => {
    const prev = row
    setRow(r => ({ ...r, [key]: value })); setMsg(null)
    try { const r = await updateListing(row.id, { [key]: value }); setRow(r); setMsg(['ok', 'Saved.']) }
    catch (e) { setRow(prev); setMsg(['error', e.message]) }
  }

  return (
    <AccountShell title="Settings" intro="Privacy — what other members can see about you.">
      <Panel title="Privacy" sub="These control your individual listing. Hidden details are never sent to other members' browsers — only you and the site admin can see them.">
        {row === undefined ? <p className="py-6 text-center text-ink/40">Loading…</p>
          : !row ? (
            <p className="text-sm text-ink/55">You don't have an individual listing yet, so there's nothing to hide. <Link to="/profile" className="font-bold text-cyan hover:underline">Create one on your Profile page</Link>.</p>
          ) : (
            <div className="flex flex-col">
              {msg && <div className="mb-3"><Note kind={msg[0]}>{msg[1]}</Note></div>}
              {PRIVACY.map(p => {
                const hasValue = p.key === 'show_on_map' ? !!row.address : !!row[p.key.replace('show_', '')]
                return (
                  <div key={p.key} className="flex items-center gap-4 border-b border-navy/5 py-4 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy">{p.label}</p>
                      <p className="text-xs text-ink/50">{p.desc}{!hasValue && ' (not filled in on your listing)'}</p>
                    </div>
                    <Toggle checked={isOn(row, p.key)} onChange={v => flip(p.key, v)} label={p.label} />
                  </div>
                )
              })}
              <p className="mt-4 text-xs text-ink/45">Business listings have their own privacy choices — edit them under Profile → Businesses.</p>
            </div>
          )}
      </Panel>
    </AccountShell>
  )
}
