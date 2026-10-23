import { useEffect, useMemo, useState } from 'react'
import SkillsInput from './SkillsInput'
import { DEFAULT_CATEGORIES, DEFAULT_CONTENT, fetchCategories, fetchContent, txt, uploadFile, fileUrl } from '../lib/data'

const fmtPhone = v => {
  const d = (v || '').replace(/\D/g, '').slice(0, 10)
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

function Check({ checked, onChange, children }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-cyan" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      {children}
    </label>
  )
}

// Create/edit form for one listing. `type` is 'individual' or 'company'.
// Calls onSubmit(fields) with a clean object; the parent saves it.
export default function ListingForm({ type, initial, onSubmit, submitLabel = 'Save changes', onCancel }) {
  const isPerson = type === 'individual'
  const [form, setForm] = useState(() => ({
    show_whatsapp: true, show_on_map: true, ...(initial || {}),
    skills: Array.isArray(initial?.skills) ? initial.skills : [],
  }))
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [cats, setCats] = useState(DEFAULT_CATEGORIES)
  const [content, setContent] = useState(DEFAULT_CONTENT)
  useEffect(() => { fetchCategories().then(setCats); fetchContent().then(setContent) }, [])
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : ''), [photo])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const set = (k, v) => setForm(f => ({ ...f, [k]: k === 'phone' ? fmtPhone(v) : v }))
  const L = key => txt(content, `apply_lbl_${key}`)
  const LT = key => txt(content, `apply_lbl_${key}_${isPerson ? 'individual' : 'company'}`)

  const submit = async e => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const { ...rest } = form
      let photo_url = rest.photo_url || ''
      if (photo) photo_url = await uploadFile('talent-photos', photo)
      await onSubmit({
        ...rest,
        type,
        photo_url,
        skills: Array.isArray(rest.skills) ? rest.skills : [],
        open_to_work: isPerson && !!rest.open_to_work,
        freelance: isPerson && !!rest.freelance,
        hiring: !isPerson && !!rest.hiring,
        show_phone: !!rest.show_phone, show_email: !!rest.show_email,
        show_whatsapp: rest.show_whatsapp !== false, show_on_map: rest.show_on_map !== false,
      })
      setPhoto(null)
    } catch (ex) {
      setErr(ex?.message || 'Could not save. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-7">
      <Section title="The basics">
        {isPerson ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="lf-first" label={L('first_name')} required value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} />
            <Field id="lf-last" label={L('last_name')} required value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} />
          </div>
        ) : (
          <Field id="lf-name" label={LT('name')} required value={form.name || ''} onChange={e => set('name', e.target.value)} />
        )}
        {isPerson ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="lf-title" label={L('title_individual')} required value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Senior Backend Engineer" />
            <Field id="lf-company" label={L('company')} value={form.company || ''} onChange={e => set('company', e.target.value)} />
          </div>
        ) : (
          <Field id="lf-title" label={L('title_company')} required value={form.title || ''} onChange={e => set('title', e.target.value)} />
        )}
        <div>
          <label className="label" htmlFor="lf-cat">{L('category')} *</label>
          <select id="lf-cat" required className="input" value={form.category || ''} onChange={e => set('category', e.target.value)}>
            <option value="" disabled>Choose a field…</option>
            {[...new Set([...(form.category ? [form.category] : []), ...cats])].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Field id="lf-bio" label={LT('bio')} type="textarea" rows={2} required value={form.bio || ''} onChange={e => set('bio', e.target.value)} />
        <Field id="lf-desc" label={LT('description')} type="textarea" rows={4} value={form.description || ''} onChange={e => set('description', e.target.value)} />
        <SkillsInput id="lf-skills" label={LT('skills')} value={form.skills || []} onChange={v => set('skills', v)} placeholder="React, Python, AWS, AI…" />
      </Section>

      <Section title="Status">
        <div className="flex flex-col gap-2 rounded-md border border-navy/10 bg-cream p-4 text-sm font-semibold text-ink/70">
          {isPerson ? (
            <>
              <Check checked={form.open_to_work} onChange={v => set('open_to_work', v)}>I'm open to work — show an "Open to work" badge</Check>
              <Check checked={form.freelance} onChange={v => set('freelance', v)}>I take freelance / consulting projects</Check>
            </>
          ) : (
            <Check checked={form.hiring} onChange={v => set('hiring', v)}>We're hiring — show a "Hiring" badge</Check>
          )}
        </div>
      </Section>

      <Section title="Contact & links">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="lf-email" label={L('email')} type="email" required value={form.email || ''} onChange={e => set('email', e.target.value)} />
          <Field id="lf-phone" label={L('phone')} type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
        </div>
        <Field id="lf-linkedin" label={L('linkedin')} value={form.linkedin || ''} onChange={e => set('linkedin', e.target.value)} placeholder="linkedin.com/…" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="lf-site" label={L('website')} value={form.website || ''} onChange={e => set('website', e.target.value)} />
          <Field id="lf-gh" label={LT('github')} value={form.github || ''} onChange={e => set('github', e.target.value)} />
        </div>
        <Field id="lf-wa" label={L('whatsapp')} value={form.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} />
        <Field id="lf-addr" label={LT('address')} value={form.address || ''} onChange={e => set('address', e.target.value)} />
        <div className="flex flex-col gap-2 rounded-md border border-navy/10 bg-cream p-4 text-sm font-semibold text-ink/70">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">Who can see this</p>
          <Check checked={form.show_email} onChange={v => set('show_email', v)}>Show the email on the listing</Check>
          <Check checked={form.show_phone} onChange={v => set('show_phone', v)}>Show the phone number on the listing</Check>
          <Check checked={form.show_whatsapp !== false} onChange={v => set('show_whatsapp', v)}>Show WhatsApp on the listing</Check>
          <Check checked={form.show_on_map !== false} onChange={v => set('show_on_map', v)}>Show the address and map pin</Check>
        </div>
      </Section>

      <Section title={isPerson ? 'Photo' : 'Logo'}>
        <div className="flex items-center gap-4">
          {(photo || form.photo_url) && (
            <img src={preview || fileUrl(form.photo_url)} alt=""
              className={`h-16 w-16 shrink-0 ${isPerson ? 'rounded-full object-cover' : 'rounded-md border border-navy/10 bg-white object-contain p-1'}`} />
          )}
          <input id="lf-photo" type="file" accept="image/*" aria-label={LT('photo')}
            className="input !py-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-cream"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f && f.size > 5 * 1024 * 1024) { setErr('Image is too large (5MB max)'); e.target.value = ''; return }
              setPhoto(f || null)
            }} />
        </div>
      </Section>

      {err && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">{err}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="btn-accent disabled:opacity-50">{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>}
      </div>
    </form>
  )
}
