import { useState } from 'react'
import { Link } from 'react-router-dom'
import { neonAuthUrl, hasSupabase } from '../lib/supabase'

// Landing page for the password-reset email link:
//   /reset-password?token=…   (Neon Auth appends the token)
// Posts the new password + token straight to the Neon Auth endpoint.
export default function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done
  const [error, setError] = useState('')

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('The passwords do not match.'); return }
    setStatus('sending')
    try {
      const r = await fetch(`${neonAuthUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password, token }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body?.message || 'The reset link is invalid or has expired. Request a new one.')
      setStatus('done')
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please request a new reset link.')
      setStatus('idle')
    }
  }

  const invalid = !hasSupabase || !token

  return (
    <div className="mx-auto max-w-md px-5 py-24">
      <div className="card !bg-white p-8">
        <p className="kicker">SabraTech members</p>
        <h1 className="mt-2 font-serif text-3xl text-navy">Set a new password</h1>

        {status === 'done' ? (
          <div className="mt-6">
            <p className="leading-relaxed text-ink/70">Your password was updated. You can log in with it now.</p>
            <Link to="/" className="btn-accent mt-6 inline-block">Back to the site</Link>
          </div>
        ) : invalid ? (
          <p className="mt-6 leading-relaxed text-ink/70">
            This page only works when opened from a password-reset email link.
            Use "Forgot password?" on the login form to get one.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="rp-password">New password</label>
              <input id="rp-password" type="password" required minLength={6} autoComplete="new-password"
                className="input" value={password} onChange={e => setPassword(e.target.value)} />
              <p className="mt-1.5 text-xs text-ink/50">At least 6 characters.</p>
            </div>
            <div>
              <label className="label" htmlFor="rp-confirm">Repeat new password</label>
              <input id="rp-confirm" type="password" required minLength={6} autoComplete="new-password"
                className="input" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            <button type="submit" disabled={status === 'sending'} className="btn-accent disabled:opacity-50">
              {status === 'sending' ? 'Saving…' : 'Save new password'}
            </button>
            {error && <p className="text-center text-sm font-semibold text-red-700">{error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
