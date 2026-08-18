import { useState } from 'react'
import { submitContactInquiry } from '../lib/data'
import { Close } from './Icons'

export default function ContactModal({ onClose }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState('idle')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    setStatus('sending')
    try {
      await submitContactInquiry(form)
      setStatus('done')
    } catch { setStatus('error') }
  }

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-navy/60 p-5 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg !bg-white p-7" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="kicker">SabraTech</p>
            <h2 className="mt-1 font-serif text-3xl text-navy">Contact us</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-navy/40 transition hover:text-navy"><Close className="h-6 w-6" /></button>
        </div>

        {status === 'done' ? (
          <div className="py-10 text-center">
            <p className="font-serif text-2xl text-navy">Thank you!</p>
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
                <input id="ct-phone" type="tel" required className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
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
    </div>
  )
}
