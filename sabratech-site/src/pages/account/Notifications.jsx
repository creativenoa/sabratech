import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AccountShell, { Panel, Note, Toggle } from '../../components/AccountShell'
import { useAuth } from '../../lib/auth'
import { fetchAlerts, markRead, deleteAlert, ALERT_TYPES, CHANNELS, prefOn, saveNotify } from '../../lib/account'
import { pingAlerts } from '../../components/AccountMenu'
import { Close } from '../../components/Icons'

export default function Notifications() {
  const { user, profile, isAdmin, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState(null)
  const [notify, setNotify] = useState({})
  const [msg, setMsg] = useState(null)

  useEffect(() => { if (user?.id) fetchAlerts(100).then(setAlerts) }, [user?.id])
  useEffect(() => { setNotify(profile?.notify || {}) }, [profile?.notify])

  const open = async a => {
    if (!a.read_at) { await markRead([a.id]).catch(() => {}); pingAlerts() }
    if (a.link) navigate(a.link)
    else setAlerts(xs => xs.map(x => (x.id === a.id ? { ...x, read_at: new Date().toISOString() } : x)))
  }
  const readAll = async () => {
    await markRead(alerts.filter(a => !a.read_at).map(a => a.id)).catch(() => {})
    setAlerts(xs => xs.map(a => ({ ...a, read_at: a.read_at || new Date().toISOString() })))
    pingAlerts()
  }
  const remove = async id => {
    await deleteAlert(id).catch(() => {})
    setAlerts(xs => xs.filter(a => a.id !== id))
    pingAlerts()
  }

  const flip = async (type, channel, value) => {
    const next = { ...notify, [type]: { ...(notify[type] || {}), [channel]: value } }
    setNotify(next); setMsg(null)
    try { await saveNotify(user.id, next); refreshProfile() }
    catch (e) { setNotify(notify); setMsg(['error', e.message]) }
  }

  const types = ALERT_TYPES.filter(t => !t.adminOnly || isAdmin)
  const unread = (alerts || []).filter(a => !a.read_at).length

  return (
    <AccountShell title="Notifications" intro="Your alerts, and how you'd like to get them.">
      <div className="flex flex-col gap-6">
        <Panel title={`Alerts${unread ? ` · ${unread} new` : ''}`}>
          {unread > 0 && <button onClick={readAll} className="-mt-2 mb-3 text-sm font-bold text-cyan hover:underline">Mark all as read</button>}
          {alerts === null ? <p className="py-6 text-center text-ink/40">Loading…</p>
            : alerts.length === 0 ? <p className="py-6 text-center text-sm text-ink/45">No alerts yet. You'll see them here — and on the bell at the top.</p>
            : (
              <ul className="flex flex-col">
                {alerts.map(a => (
                  <li key={a.id} className={`flex items-start gap-3 border-b border-navy/5 py-3 ${a.read_at ? '' : 'bg-cyan/5'} -mx-3 px-3`}>
                    <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${a.read_at ? 'bg-transparent' : 'bg-cyan'}`} />
                    <button onClick={() => open(a)} className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-semibold text-navy">{a.title}</span>
                      {a.body && <span className="block text-sm text-ink/55">{a.body}</span>}
                      <span className="block text-xs text-ink/40">{new Date(a.created_at).toLocaleString()}</span>
                    </button>
                    <button onClick={() => remove(a.id)} aria-label="Delete alert" className="rounded p-1 text-ink/30 hover:bg-navy/5 hover:text-navy">
                      <Close className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </Panel>

        <Panel title="How to reach me" sub="Choose which alerts you get, and where.">
          {msg && <div className="mb-3"><Note kind={msg[0]}>{msg[1]}</Note></div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.15em] text-ink/40">
                  <th className="pb-3 font-semibold">Alert</th>
                  {CHANNELS.map(c => <th key={c.key} className={`w-24 pb-3 text-center font-semibold ${c.soon ? 'text-ink/25' : ''}`}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {types.map((t, row) => (
                  <tr key={t.key} className="border-t border-navy/5">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-navy">{t.label}</p>
                      <p className="text-xs text-ink/50">{t.desc}</p>
                    </td>
                    {CHANNELS.map(c => c.soon ? (
                      // One greyed-out cell spanning the whole column, watermarked "Coming soon".
                      row === 0 ? (
                        <td key={c.key} rowSpan={types.length} aria-label={`${c.label}: coming soon`}
                          className="relative select-none bg-navy/[0.04] text-center align-middle">
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                            <span className="-rotate-90 whitespace-nowrap text-sm font-black uppercase tracking-[0.35em] text-navy/30">Coming soon</span>
                          </span>
                        </td>
                      ) : null
                    ) : (
                      <td key={c.key} className="py-3 text-center">
                        {t.channels.includes(c.key)
                          ? <span className="inline-flex"><Toggle checked={prefOn(notify, t.key, c.key)} onChange={v => flip(t.key, c.key, v)} label={`${t.label} — ${c.label}`} /></span>
                          : <span className="text-ink/20">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-4 flex flex-col gap-1 text-xs text-ink/45">
            {CHANNELS.filter(c => !c.live && !c.soon).map(c => <li key={c.key}><strong className="text-ink/60">{c.label}:</strong> {c.note}. Your choices are saved now and take effect then.</li>)}
          </ul>
        </Panel>
      </div>
    </AccountShell>
  )
}
