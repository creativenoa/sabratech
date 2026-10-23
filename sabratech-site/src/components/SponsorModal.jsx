import { useId, useState } from 'react'
import Dialog from './Dialog'
import { submitSponsorInquiry, fetchContent, txt, DEFAULT_CONTENT } from '../lib/data'
import { Close } from './Icons'
import { useEffect } from 'react'

export default function SponsorModal({ onClose, returnFocusTo }) {
  const titleId = useId()
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState('idle')
  const [content, setContent] = useState(DEFAULT_CONTENT)
  useEffect(() => { fetchContent().then(setContent) }, [])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    setStatus('sending')
    try {
      await submitSponsorInquiry(form)
      setStatus('done')
    } catch { setStatus('error') }
  }

  return (
    <Dialog onClose={onClose} labelledBy={titleId} returnFocusTo={returnFocusTo}>
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="kicker">{txt(content,'sponsor_kicker')}</p>
            <h2 id={titleId} className="mt-1 font-serif text-3xl text-navy">{txt(content,'sponsor_title')}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-navy/70 transition hover:text-navy"><Close className="h-6 w-6" /></button>
        </div>

        {status === 'done' ? (
          <div className="py-10 text-center">
            <p className="font-serif text-2xl text-navy">Thank you!</p>
            <p className="mt-2 text-ink/60">We received your inquiry and will be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-ink/60">
              {txt(content,'sponsor_sub')}
            </p>
            <div>
              <label className="label" htmlFor="sp-name">Full name *</label>
              <input id="sp-name" required className="input" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="sp-company">Company</label>
              <input id="sp-company" className="input" value={form.company} onChange={e => set('company', e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="sp-email">Email *</label>
                <input id="sp-email" type="email" required className="input" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="sp-phone">Phone</label>
                <input id="sp-phone" type="tel" className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="sp-msg">How would you like to partner?</label>
              <textarea id="sp-msg" rows={3} className="input" value={form.message} onChange={e => set('message', e.target.value)} />
            </div>
            <button type="submit" disabled={status === 'sending'} className="btn-accent disabled:opacity-50">
              {status === 'sending' ? 'Sending…' : 'Send inquiry'}
            </button>
            {status === 'error' && <p className="text-center text-sm font-semibold text-red-700">Something went wrong — please try again.</p>}
          </form>
        )}
      </div>
    </Dialog>
  )
}
