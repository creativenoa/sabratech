import { useState, useEffect } from 'react'
import { CATEGORIES, fetchCategories, submitJoinForm } from '../lib/data'
import { supabase, hasSupabase } from '../lib/supabase'

const FIELDS = [
  ['business_name', 'שם העסק *', 'text', true],
  ['contact_name', 'שם מלא (שלך) *', 'text', true],
  ['category', 'תחום *', 'select', true],
  ['description', 'תיאור העסק (מה את מציעה?) *', 'textarea', true],
  ['phone', 'טלפון * (מבנה: 404-123-4567)', 'tel', true],
  ['email', 'אימייל *', 'email', true],
  ['whatsapp', 'וואטסאפ עסקי (מספר או קישור wa.me)', 'text', false],
  ['website', 'אתר', 'text', false],
  ['facebook', 'עמוד פייסבוק', 'text', false],
  ['instagram', 'אינסטגרם', 'text', false],
  ['address', 'כתובת העסק (אם יש מיקום פיזי — תופיע במפה)', 'text', false],
  ['offer', 'הטבה בלעדית לחברות הקהילה (לא חובה, אבל שווה)', 'text', false],
]

export default function Join() {
  const [form, setForm] = useState({})
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [cats, setCats] = useState(CATEGORIES)
  useEffect(() => { fetchCategories().then(setCats) }, [])
  const fmtPhone = v => {
    const d = v.replace(/\D/g, '').slice(0, 10)
    return d.length > 6 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d
  }
  const set = (k, v) => setForm(f => ({ ...f, [k]: k === 'phone' ? fmtPhone(v) : v }))

  const submit = async e => {
    e.preventDefault()
    setStatus('sending')
    try {
      const { show_phone_ok, show_email_ok, ...data } = form
      let image_url = ''
      if (file && hasSupabase) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('business-images').upload(path, file)
        if (!upErr) image_url = supabase.storage.from('business-images').getPublicUrl(path).data.publicUrl
      }
      await submitJoinForm({ ...data, image_url, show_phone: !!show_phone_ok, show_email: !!show_email_ok })
      setStatus('done')
    } catch { setStatus('error') }
  }

  if (status === 'done') return (
    <div className="mx-auto max-w-xl px-5 py-28 text-center">
      <p className="kicker">תודה</p>
      <h1 className="mt-3 font-serif text-4xl text-navy">הבקשה נשלחה</h1>
      <p className="mt-4 leading-relaxed text-ink/60">נעבור על הפרטים ונוסיף את העסק שלך לרשימה בקרוב. מתרגשות שהצטרפת.</p>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker">ברוכה הבאה</p>
      <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">הצטרפי אלינו</h1>
      <p className="mt-3 text-ink/60">בעלת עסק בקהילה? מלאי את הפרטים וניצור לך דף עסק משלך באתר.</p>

      <form onSubmit={submit} className="card mt-8 flex flex-col gap-5 p-7">
        {FIELDS.map(([key, label, type, required]) => (
          <div key={key}>
            <label className="label" htmlFor={key}>{label}</label>
            {type === 'select' ? (
              <select id={key} required={required} className="input" value={form[key] || ''} onChange={e => set(key, e.target.value)}>
                <option value="" disabled>בחרי תחום…</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : type === 'textarea' ? (
              <textarea id={key} required={required} rows={3} className="input" value={form[key] || ''} onChange={e => set(key, e.target.value)} />
            ) : (
              <input id={key} type={type} required={required} className="input" value={form[key] || ''} onChange={e => set(key, e.target.value)} />
            )}
          </div>
        ))}
        {form.category === 'אחר' && (
          <div>
            <label className="label" htmlFor="category_other">מהו התחום? (בשפה חופשית) *</label>
            <input id="category_other" required className="input" value={form.category_other || ''} onChange={e => set('category_other', e.target.value)} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="image">תמונה לדף העסק (לוגו או תמונה מייצגת)</label>
          <input id="image" type="file" accept="image/*" className="input !py-2.5 file:me-3 file:rounded-md file:border-0 file:bg-navy file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-cream"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f && f.size > 5 * 1024 * 1024) { alert('התמונה גדולה מדי (מקסימום 5MB)'); e.target.value = ''; return }
              setFile(f || null)
            }} />
        </div>
        <div className="flex flex-col gap-2 rounded-md border border-navy/10 bg-cream p-4 text-sm font-semibold text-ink/70">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-royal" checked={!!form.show_phone_ok} onChange={e => set('show_phone_ok', e.target.checked)} />
            מאשרת להציג את הטלפון שלי בדף העסק באתר
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-royal" checked={!!form.show_email_ok} onChange={e => set('show_email_ok', e.target.checked)} />
            מאשרת להציג את האימייל שלי בדף העסק באתר
          </label>
          <span className="text-xs font-normal text-ink/50">אפשר לשנות בכל שלב</span>
        </div>
        <button type="submit" disabled={status === 'sending'} className="btn-primary disabled:opacity-50">
          {status === 'sending' ? 'שולח…' : 'שליחת בקשת הצטרפות'}
        </button>
        {status === 'error' && <p className="text-center text-sm font-semibold text-red-700">משהו השתבש. נסי שוב או כתבי לנו בקבוצת הפייסבוק.</p>}
      </form>
    </div>
  )
}
