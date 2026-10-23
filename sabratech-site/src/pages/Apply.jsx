import { useState, useEffect } from 'react'
import { DEFAULT_CATEGORIES, DEFAULT_CONTENT, fetchCategories, fetchContent, fetchTalents, txt, submitApplication, uploadFile } from '../lib/data'
import { hasSupabase } from '../lib/supabase'
import { Building, User, DoneCheck } from '../components/Icons'
import SkillsInput from '../components/SkillsInput'

const fmtPhone = v => {
  const d = v.replace(/\D/g, '').slice(0, 10)
  return d.length > 6 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d
}

function Section({ title, children }) {
  return (
    <div className="border-t border-navy/10 pt-6 first:border-t-0 first:pt-0">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-ink/40">{title}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

function Field({ id, label, type = 'text', required, value, onChange, ...rest }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}{required && ' *'}</label>
      {type === 'textarea'
        ? <textarea id={id} required={required} rows={rest.rows || 3} className="input" value={value} onChange={onChange} {...rest} />
        : <input id={id} type={type} required={required} className="input" value={value} onChange={onChange} {...rest} />}
    </div>
  )
}

export default function Apply() {
  const [type, setType] = useState('')
  const [form, setForm] = useState({})
  const [photo, setPhoto] = useState(null)
  const [status, setStatus] = useState('idle')
  const [cats, setCats] = useState(DEFAULT_CATEGORIES)
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [companies, setCompanies] = useState([])
  useEffect(() => {
    fetchCategories().then(setCats)
    fetchContent().then(setContent)
    fetchTalents('company').then(cs => setCompanies(cs.map(c => c.name)))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: k === 'phone' ? fmtPhone(v) : v }))
  const isPerson = type === 'individual'
  const L = key => txt(content, `apply_lbl_${key}`)
  const LT = key => txt(content, `apply_lbl_${key}_${isPerson ? 'individual' : 'company'}`)

  const submit = async e => {
    e.preventDefault()
    setStatus('sending')
    try {
      const { show_phone_ok, show_email_ok, skills, first_name, last_name, ...data } = form
      let photo_url = '', cv_url = '', cv_updated_at = null
      if (photo) photo_url = await uploadFile('talent-photos', photo)
      await submitApplication({
        ...data,
        type,
        // Individuals store first/last; `name` is also sent so the form works
        // even if the DB sync trigger is absent. Startups keep a single name.
        ...(isPerson
          ? {
              first_name: first_name || '',
              last_name: last_name || '',
              name: `${first_name || ''} ${last_name || ''}`.trim(),
            }
          : {}),
        skills: Array.isArray(skills) ? skills : [],
        photo_url, cv_url, cv_updated_at,
        show_phone: !!show_phone_ok,
        show_email: !!show_email_ok,
        open_to_work: isPerson && !!form.open_to_work,
        freelance: isPerson && !!form.freelance,
        hiring: !isPerson && !!form.hiring,
      })
      setStatus('done')
    } catch { setStatus('error') }
  }

  if (!hasSupabase) return (
    <div className="mx-auto max-w-xl px-5 py-28 text-center">
      <h1 className="font-serif text-3xl text-navy">Applications open soon</h1>
      <p className="mt-3 text-ink/60">The enrollment form will be live once the database is connected.</p>
    </div>
  )

  if (status === 'done') return (
    <div className="mx-auto max-w-xl px-5 py-28 text-center">
      <DoneCheck className="mb-6 h-20 w-20" />
      <p className="kicker">Thank you</p>
      <h1 className="mt-3 font-serif text-4xl text-navy">Application received</h1>
      <p className="mt-4 leading-relaxed text-ink/60">We'll review your details and add you to the directory soon. Welcome to the community!</p>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker">{txt(content,'apply_kicker')}</p>
      <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">{txt(content,'apply_title')}</h1>
      <p className="mt-3 text-ink/60">{txt(content,'apply_intro')}</p>

      {/* Type selector */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        {[['individual', 'Individual', User, 'A tech professional'], ['company', 'Startup', Building, 'An Israeli-founded startup']].map(([v, label, Icon, sub]) => (
          <button key={v} type="button" onClick={() => setType(v)}
            className={`card flex flex-col items-center gap-2 !p-6 text-center transition ${type === v ? '!border-cyan !shadow-[0_0_0_2px_#0099FF]' : ''}`}>
            <Icon className={`h-8 w-8 ${type === v ? 'text-cyan' : 'text-navy/40'}`} />
            <span className="font-serif text-lg text-navy">{label}</span>
            <span className="text-xs text-ink/50">{sub}</span>
          </button>
        ))}
      </div>

      <datalist id="company-list">
        {companies.map(c => <option key={c} value={c} />)}
      </datalist>

      {type && (
        <form onSubmit={submit} className="card mt-6 flex flex-col gap-7 p-7">
          <Section title="The basics">
            {isPerson ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="first_name" label={L('first_name')} required value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} />
                <Field id="last_name" label={L('last_name')} required value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} />
              </div>
            ) : (
              <Field id="name" label={LT('name')} required value={form.name || ''} onChange={e => set('name', e.target.value)} />
            )}
            {isPerson ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="title" label={L('title_individual')} required value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Senior Backend Engineer" />
                <Field id="company" label={L('company')} value={form.company || ''} onChange={e => set('company', e.target.value)} placeholder="e.g. NCR Voyix" list="company-list" />
              </div>
            ) : (
              <Field id="title" label={L('title_company')} required value={form.title || ''} onChange={e => set('title', e.target.value)} />
            )}
            <div>
              <label className="label" htmlFor="category">{L('category')} *</label>
              <select id="category" required className="input" value={form.category || ''} onChange={e => set('category', e.target.value)}>
                <option value="" disabled>Choose a field…</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field id="bio" label={LT('bio')} type="textarea" rows={2} required value={form.bio || ''} onChange={e => set('bio', e.target.value)} />
            <Field id="description" label={LT('description')} type="textarea" rows={4} value={form.description || ''} onChange={e => set('description', e.target.value)} />
            <SkillsInput id="skills" label={LT('skills')} value={form.skills || []} onChange={v => set('skills', v)} placeholder="React, Python, AWS, AI…" />
          </Section>

          <Section title="Status">
            {isPerson ? (
              <div className="flex flex-col gap-2 rounded-md border border-navy/10 bg-cream p-4 text-sm font-semibold text-ink/70">
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-cyan" checked={!!form.open_to_work} onChange={e => set('open_to_work', e.target.checked)} />
                  I'm open to work — show an "Open to work" badge on my profile
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-cyan" checked={!!form.freelance} onChange={e => set('freelance', e.target.checked)} />
                  I take freelance / consulting projects
                </label>
              </div>
            ) : (
              <label className="flex items-start gap-3 rounded-md border border-navy/10 bg-cream p-4 text-sm font-semibold text-ink/70">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-cyan" checked={!!form.hiring} onChange={e => set('hiring', e.target.checked)} />
                We're hiring — show a "Hiring" badge on our profile
              </label>
            )}
          </Section>

          <Section title="Contact & links">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="email" label={L('email')} type="email" required value={form.email || ''} onChange={e => set('email', e.target.value)} />
              <Field id="phone" label={L('phone')} type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
            </div>
            <Field id="linkedin" label={L('linkedin')} value={form.linkedin || ''} onChange={e => set('linkedin', e.target.value)} placeholder="linkedin.com/in/…" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="website" label={L('website')} value={form.website || ''} onChange={e => set('website', e.target.value)} />
              <Field id="github" label={LT('github')} value={form.github || ''} onChange={e => set('github', e.target.value)} />
            </div>
            <Field id="whatsapp" label={L('whatsapp')} value={form.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} />
            <Field id="address" label={LT('address')} value={form.address || ''} onChange={e => set('address', e.target.value)} />
            <div className="flex flex-col gap-2 rounded-md border border-navy/10 bg-cream p-4 text-sm font-semibold text-ink/70">
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-cyan" checked={!!form.show_phone_ok} onChange={e => set('show_phone_ok', e.target.checked)} />
                Display my phone number on the public profile
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-cyan" checked={!!form.show_email_ok} onChange={e => set('show_email_ok', e.target.checked)} />
                Display my email on the public profile
              </label>
              <span className="text-xs font-normal text-ink/50">You can change this anytime.</span>
            </div>
          </Section>

          <Section title={isPerson ? 'Photo (optional, recommended)' : 'Logo (optional, recommended)'}>
            <div>
              <label className="label" htmlFor="photo">{LT('photo')}</label>
              <input id="photo" type="file" accept="image/*" className="input !py-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-cream"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f && f.size > 5 * 1024 * 1024) { alert('Image is too large (5MB max)'); e.target.value = ''; return }
                  setPhoto(f || null)
                }} />
            </div>
          </Section>

          <button type="submit" disabled={status === 'sending'} className="btn-accent disabled:opacity-50">
            {status === 'sending' ? 'Submitting…' : 'Submit application'}
          </button>
          {status === 'error' && <p className="text-center text-sm font-semibold text-red-700">Something went wrong — please try again.</p>}
        </form>
      )}
    </div>
  )
}
