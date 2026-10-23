import { useId, useState } from 'react'
import Dialog from './Dialog'
import { submitContactInquiry } from '../lib/data'
import { Close, DoneCheck } from './Icons'

const PHONE_CHARS = /[^0-9 +().-]/g
const phoneProblem = v => {
  const t = v.trim()
  if (!t) return ''
  if (t.length < 7 || t.replace(/\D/g, '').length < 7) return 'Phone number looks too short — use at least 7 digits.'
  if (t.length > 20) return 'Phone number is too long — 20 characters at most.'
  return ''
}

export default function ContactModal({ onClose, returnFocusTo }) {
  const titleId = useId()
  const [phoneErr, setPhoneErr] = useState('')
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState('idle')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    const problem = phoneProblem(form.phone)
    if (problem) { setPhoneErr(problem); document.getElementById('ct-phone')?.focus(); return }
    setStatus('sending')
    try {
      await submitContactInquiry(form)
      setStatus('done')
    } catch { setStatus('error') }
  }

  return (
    <Dialog onClose={onClose} labelledBy={titleId} returnFocusTo={returnFocusTo}>
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="kicker">SabraTech</p>
            <h2 id={titleId} className="mt-1 font-serif text-3xl text-navy">Contact us</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-navy/70 transition hover:text-navy"><Close className="h-6 w-6" /></button>
        </div>

        {status === 'done' ? (
          <div className="py-10 text-center">
            <DoneCheck />
            <p className="rise-in mt-4 font-serif text-2xl text-navy" style={{ animationDelay: '200ms' }}>Thank you!</p>
            <p className="mt-2 text-ink/60">Your message is on its way to the SabraTech team.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-ink/60">
              Questions, ideas, or something you would like to see here? Send us a note.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ct-first">First name *</label>
                <input id="ct-first" required className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="ct-last">Last name *</label>
                <input id="ct-last" required className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ct-email">Email *</label>
                <input id="ct-email" type="email" required className="input" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="ct-phone">Phone *</label>
                <input id="ct-phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} className="input" value={form.phone}
                  aria-invalid={phoneErr ? 'true' : undefined} aria-describedby={phoneErr ? 'ct-phone-err' : undefined}
                  onChange={e => { set('phone', e.target.value.replace(PHONE_CHARS, '')); if (phoneErr) setPhoneErr('') }}
                  onBlur={e => setPhoneErr(phoneProblem(e.target.value))} />
                {phoneErr && <p id="ct-phone-err" role="alert" className="mt-1.5 text-xs font-semibold text-red-700">{phoneErr}</p>}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="ct-msg">Message *</label>
              <textarea id="ct-msg" rows={4} required className="input" value={form.message} onChange={e => set('message', e.target.value)} />
            </div>
            <button type="submit" disabled={status === 'sending'} className="btn-accent disabled:opacity-50">
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>
            {status === 'error' && <p className="text-center text-sm font-semibold text-red-700">Something went wrong — please try again.</p>}
          </form>
        )}
      </div>
    </Dialog>
  )
}
