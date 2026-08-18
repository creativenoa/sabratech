import { useEffect, useState } from 'react'
import { signUp, signIn, resetPassword } from '../lib/auth'
import { Close } from './Icons'

export default function AuthModal({ open, onClose, initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab)
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!open) return
    setTab(initialTab === 'signup' ? 'signup' : 'login')
    setStatus('idle')
    setError('')
    setNotice('')
  }, [open, initialTab])

  if (!open) return null

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const busy = status === 'sending'

  const pick = t => {
    setTab(t)
    setStatus('idle')
    setError('')
    setNotice('')
  }

  const submitLogin = async e => {
    e.preventDefault()
    setStatus('sending'); setError(''); setNotice('')
    try {
      await signIn({ email: form.email, password: form.password })
      setStatus('idle')
      onClose?.()
    } catch (err) {
      setError(err?.message || 'We could not log you in. Check your email and password.')
      setStatus('idle')
    }
  }

  const submitJoin = async e => {
    e.preventDefault()
    setNotice('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setStatus('sending'); setError('')
    try {
      await signUp({ email: form.email, password: form.password, fullName: form.fullName })
      setStatus('done')
    } catch (err) {
      setError(err?.message || 'We could not create your account. Please try again.')
      setStatus('idle')
    }
  }

  const forgot = async () => {
    setError(''); setNotice('')
    if (!form.email.trim()) { setError('Enter your email address above, then click Forgot password.'); return }
    setStatus('sending')
    try {
      await resetPassword(form.email)
      setNotice('Password reset link sent. Check your inbox.')
    } catch (err) {
      setError(err?.message || 'We could not send the reset link. Please try again.')
    }
    setStatus('idle')
  }

  const tabClass = active =>
    'flex-1 border-b-2 pb-2.5 text-sm font-semibold tracking-wide transition ' +
    (active ? 'border-cyan text-navy' : 'border-navy/10 text-ink/40 hover:text-navy')

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-navy/60 p-5 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg !bg-white p-7" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="kicker">SabraTech members</p>
            <h2 className="mt-1 font-serif text-3xl text-navy">
              {tab === 'signup' ? 'Become a member' : 'Log in'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-navy/40 transition hover:text-navy"><Close className="h-6 w-6" /></button>
        </div>

        {status === 'done' ? (
          <div className="py-8 text-center">
            <p className="font-serif text-2xl text-navy">Your account was created</p>
            <p className="mt-3 leading-relaxed text-ink/60">
              Your membership is awaiting approval. Once the SabraTech team approves it, you will get full access to the directory.
            </p>
            <button onClick={onClose} className="btn-primary mt-6">Got it</button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex gap-6">
              <button type="button" onClick={() => pick('login')} className={tabClass(tab === 'login')}>Log in</button>
              <button type="button" onClick={() => pick('signup')} className={tabClass(tab === 'signup')}>Become a member</button>
            </div>

            {tab === 'login' ? (
              <form onSubmit={submitLogin} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="label" htmlFor="au-email">Email</label>
                  <input id="au-email" type="email" required autoComplete="email" className="input"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="au-password">Password</label>
                  <input id="au-password" type="password" required autoComplete="current-password" className="input"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                </div>
                <button type="submit" disabled={busy} className="btn-accent disabled:opacity-50">
                  {busy ? 'Logging in…' : 'Log in'}
                </button>
                <button type="button" onClick={forgot} disabled={busy}
                  className="self-center text-sm text-ink/50 underline underline-offset-4 transition hover:text-cyan disabled:opacity-50">
                  Forgot password?
                </button>
              </form>
            ) : (
              <form onSubmit={submitJoin} className="mt-6 flex flex-col gap-4">
                <p className="text-sm leading-relaxed text-ink/60">
                  Create your account and the SabraTech team will review it. You get access to the directory once your membership is approved.
                </p>
                <div>
                  <label className="label" htmlFor="au-name">Full name</label>
                  <input id="au-name" required autoComplete="name" className="input"
                    value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="au-join-email">Email</label>
                  <input id="au-join-email" type="email" required autoComplete="email" className="input"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="au-join-password">Password</label>
                  <input id="au-join-password" type="password" required minLength={6} autoComplete="new-password" className="input"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <p className="mt-1.5 text-xs text-ink/50">At least 6 characters.</p>
                </div>
                <button type="submit" disabled={busy} className="btn-accent disabled:opacity-50">
                  {busy ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            )}

            {error && <p className="mt-4 text-center text-sm font-semibold text-red-700">{error}</p>}
            {notice && <p className="mt-4 text-center text-sm font-semibold text-royal">{notice}</p>}
          </>
        )}
      </div>
    </div>
  )
}
