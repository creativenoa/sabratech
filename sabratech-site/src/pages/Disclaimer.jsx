import { useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'

export default function Disclaimer() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const send = async e => {
    e.preventDefault()
    if (hasSupabase) {
      await supabase.from('sponsor_inquiries').insert([{
        name: `Contact: ${form.name}`, email: form.email, message: form.message, status: 'new',
      }])
    }
    setSent(true)
  }
  return (
    <div className="mx-auto max-w-[700px] px-5 py-14">
      <p className="kicker">Legal</p>
      <h1 className="mt-2 font-serif text-4xl text-navy">Disclaimer</h1>
      <div className="mt-8 flex flex-col gap-5 leading-loose text-ink/75">
        <p>
          SabraTech (the "Site") is a community directory showcasing Israeli-affiliated technology
          startups and professionals in the greater Atlanta area. The Site is operated on a volunteer,
          non-profit basis.
        </p>
        <p>
          All information appearing on the Site — including profiles, descriptions, photos, CVs, links,
          and contact details — is provided by the listed individuals and startups themselves and is
          their sole responsibility. The Site does not verify, endorse, or supervise the accuracy of the
          information, the quality of any products or services, or any other aspect of the listed parties.
        </p>
        <p>
          Appearance in the directory does not constitute a recommendation, endorsement, or guarantee of
          any kind by the Site or its operators. Any engagement, transaction, employment relationship, or
          communication between visitors and listed parties is made directly between those parties and at
          their own responsibility.
        </p>
        <p>
          The Site's operators shall not be liable for any damage, direct or indirect, arising from
          reliance on information appearing on the Site, from engagement with listed parties, or from
          inaccuracies, omissions, or errors in the information.
        </p>
        <p>
          To request a correction or removal of your information, contact us using the form below.
        </p>
      </div>

      <div className="card mt-10 p-6">
        <p className="font-serif text-xl text-navy">Contact us</p>
        {sent ? (
          <p className="mt-4 font-semibold text-ink/70">Thank you — we received your message.</p>
        ) : (
          <form onSubmit={send} className="mt-4 flex flex-col gap-3">
            <label htmlFor="dc-name" className="sr-only">Your name</label>
            <input id="dc-name" required autoComplete="name" className="input" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <label htmlFor="dc-email" className="sr-only">Email</label>
            <input id="dc-email" required type="email" autoComplete="email" className="input" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <label htmlFor="dc-msg" className="sr-only">Message</label>
            <textarea id="dc-msg" required rows={3} className="input" placeholder="Message" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            <button className="btn-primary">Send</button>
          </form>
        )}
      </div>
    </div>
  )
}
