import { useEffect, useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'
import { CATEGORIES, DEFAULT_CATEGORIES, DEFAULT_CONTENT } from '../lib/data'
import { Search } from '../components/Icons'

const EMPTY = { name: '', category: 'אחר', description: '', contact_name: '', phone: '', email: '', whatsapp: '', website: '', facebook: '', instagram: '', address: '', offer: '', image_url: '', show_phone: false, show_email: false, published: true }

export default function Admin() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('businesses')
  const [rows, setRows] = useState([])
  const [subs, setSubs] = useState([])
  const [editing, setEditing] = useState(null)
  const [cats, setCats] = useState([])
  const [bizImages, setBizImages] = useState([])
  const [adminQ, setAdminQ] = useState('')
  const [newCat, setNewCat] = useState('')
  const [content, setContent] = useState(null)
  const [creds, setCreds] = useState({ email: '', password: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!hasSupabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const load = async () => {
    const { data: b } = await supabase.from('businesses').select('*').order('name')
    setRows(b || [])
    const { data: s } = await supabase.from('submissions').select('*').order('created_at', { ascending: false })
    setSubs(s || [])
    const { data: c } = await supabase.from('categories').select('*').order('name')
    setCats(c || [])
    const { data: sc } = await supabase.from('site_content').select('*')
    const merged = { ...DEFAULT_CONTENT }
    if (sc) for (const row of sc) if (row.value) merged[row.key] = row.value
    setContent(merged)
  }
  useEffect(() => { if (session) load() }, [session])
  useEffect(() => {
    if (!editing?.id) { setBizImages([]); return }
    supabase.storage.from('business-images').list(`biz-${editing.id}`).then(({ data }) => setBizImages(data || []))
  }, [editing?.id])

  const fmtPhone = v => {
    const d = v.replace(/\D/g, '').slice(0, 10)
    return d.length > 6 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d
  }
  const imgUrl = name => supabase.storage.from('business-images').getPublicUrl(`biz-${editing.id}/${name}`).data.publicUrl
  const uploadImages = async files => {
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) { alert(`${f.name} גדולה מדי (מקס' 5MB)`); continue }
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
      await supabase.storage.from('business-images').upload(`biz-${editing.id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`, f)
    }
    const { data } = await supabase.storage.from('business-images').list(`biz-${editing.id}`)
    setBizImages(data || [])
    if (data && data.length === 1 && !editing.image_url) {
      const url = supabase.storage.from('business-images').getPublicUrl(`biz-${editing.id}/${data[0].name}`).data.publicUrl
      setEditing(ed => ({ ...ed, image_url: url }))
    }
  }

  if (!hasSupabase) return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="mt-4 font-bold text-ink/70">קונסולת הניהול תהיה זמינה אחרי חיבור הדאטהבייס (Supabase).</p>
    </div>
  )

  const match = b => {
    const n = adminQ.trim().toLowerCase()
    if (!n) return true
    return [b.name, b.category, b.contact_name, b.description, b.offer]
      .some(f => (f || '').toLowerCase().includes(n))
  }

  if (!session) return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-black text-navy">כניסת ניהול</h1>
      <form className="card mt-4 flex flex-col gap-3" onSubmit={async e => {
        e.preventDefault(); setMsg('')
        const { error } = await supabase.auth.signInWithPassword(creds)
        if (error) setMsg('פרטים שגויים')
      }}>
        <input className="input" type="email" placeholder="אימייל" value={creds.email} onChange={e => setCreds(c => ({ ...c, email: e.target.value }))} />
        <input className="input" type="password" placeholder="סיסמה" value={creds.password} onChange={e => setCreds(c => ({ ...c, password: e.target.value }))} />
        <button className="btn-primary">כניסה</button>
        {msg && <p className="text-center text-sm font-bold text-red-600">{msg}</p>}
      </form>
    </div>
  )

  const save = async b => {
    const { id, created_at, ...fields } = b
    const q = id ? supabase.from('businesses').update(fields).eq('id', id) : supabase.from('businesses').insert([fields])
    const { error } = await q
    setMsg(error ? 'שגיאה בשמירה: ' + error.message : 'נשמר')
    if (!error) { setEditing(null); load() }
  }

  const del = async id => {
    if (!confirm('למחוק את העסק?')) return
    await supabase.from('businesses').delete().eq('id', id)
    load()
  }

  const approveSub = async s => {
    const { id, created_at, status, show_contact, business_name, category_other, ...rest } = s
    if (category_other) rest.description = `${rest.description || ''}\nתחום: ${category_other}`.trim()
    await supabase.from('businesses').insert([{ name: business_name, ...rest, published: true }])
    await supabase.from('submissions').update({ status: 'approved' }).eq('id', id)
    load()
  }

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-navy">ניהול האתר</h1>
        <button className="text-sm font-bold text-royal hover:underline" onClick={() => supabase.auth.signOut()}>יציאה</button>
      </div>
      <div className="mt-4 flex gap-2">
        {[['businesses', `עסקים (${rows.length})`], ['subs', `בקשות הצטרפות (${subs.filter(s => s.status === 'pending').length})`], ['offers', `הנחות (${rows.filter(b => b.offer).length})`], ['cats', `קטגוריות (${cats.length})`], ['content', 'טקסטים']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-bold ${tab === t ? 'bg-navy text-white' : 'bg-white text-ink/60'}`}>{label}</button>
        ))}
      </div>
      {(tab === 'businesses' || tab === 'offers') && (
        <div className="relative mt-4 max-w-md">
          <input className="input !ps-10 !py-2 text-sm" placeholder="חיפוש עסק לפי שם, קטגוריה, איש קשר…"
            value={adminQ} onChange={e => setAdminQ(e.target.value)} />
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/30" />
        </div>
      )}
      {msg && <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold">{msg}</p>}

      {tab === 'businesses' && (
        <div className="mt-4">
          <button className="btn-primary !py-2 !text-sm" onClick={() => setEditing({ ...EMPTY })}>+ עסק חדש</button>
          <div className="mt-3 flex flex-col gap-2">
            {rows.filter(match).map(b => (
              <button key={b.id} type="button" onClick={() => setEditing(b)} className="card flex w-full flex-wrap items-center gap-3 !p-3 text-start transition hover:!border-royal">
                <strong className="text-navy">{b.name}</strong>
                <span className="text-xs text-ink/50">{b.category}</span>
                {!b.published && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">מוסתר</span>}
                {b.show_phone && <span className="text-xs font-bold text-royal">טל׳</span>}
                {b.show_email && <span className="text-xs font-bold text-royal">מייל</span>}
                <span className="ms-auto text-sm text-navy/30">עריכה ←</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'subs' && (
        <div className="mt-4 flex flex-col gap-3">
          {subs.length === 0 && <p className="py-8 text-center font-bold text-ink/50">אין בקשות עדיין</p>}
          {subs.map(s => (
            <div key={s.id} className="card">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-navy">{s.business_name}</strong>
                <span className="text-xs text-ink/50">{s.category} · {s.contact_name}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{s.status === 'pending' ? 'ממתין' : 'אושר'}</span>
              </div>
              <p className="mt-2 text-sm text-ink/70">{s.description}</p>
              <p className="mt-1 text-xs text-ink/50">{s.phone} · {s.email} {s.address && `· ${s.address}`}</p>
              {s.status === 'pending' && s.category !== 'פנייה' && (
                <button className="btn-primary mt-3 !py-2 !text-sm" onClick={() => approveSub(s)}>אשרי והוסיפי לרשימה</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'offers' && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-ink/60">ההנחה מופיעה בדף "הנחות בלעדיות" ובדף העסק. השאירי ריק = אין הנחה.</p>
          {[...rows].filter(match).sort((a, b) => (b.offer ? 1 : 0) - (a.offer ? 1 : 0)).map(b => (
            <div key={b.id} className="card flex flex-wrap items-center gap-3 !p-3">
              <strong className="w-52 truncate text-navy">{b.name}</strong>
              <input className="input flex-1 !py-1.5 text-sm" placeholder="אין הנחה — הקלידי כדי להוסיף" defaultValue={b.offer || ''} id={`offer-${b.id}`} />
              <button className="btn-primary !py-1.5 !text-sm" onClick={async () => {
                const v = document.getElementById(`offer-${b.id}`).value.trim()
                const { error } = await supabase.from('businesses').update({ offer: v }).eq('id', b.id)
                setMsg(error ? 'שגיאה: ' + error.message : `ההנחה של ${b.name} נשמרה`)
                if (!error) load()
              }}>שמרי</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'cats' && (
        <div className="mt-4 flex max-w-lg flex-col gap-2">
          {cats.length === 0 && (
            <div className="rounded-md bg-white p-4 text-sm font-semibold text-ink/70">
              טבלת הקטגוריות עוד לא קיימת או ריקה — הריצי את supabase-update-1.sql ב-SQL Editor ואז לחצי "טעני קטגוריות מהרשימה הקבועה".
              <button className="btn-primary mt-3 !py-2 !text-sm" onClick={async () => {
                await supabase.from('categories').insert(DEFAULT_CATEGORIES.map((name, i) => ({ name, sort: (i + 1) * 10 })))
                load()
              }}>טעני קטגוריות מהרשימה הקבועה</button>
            </div>
          )}
          {cats.map(c => (
            <div key={c.id} className="card flex items-center gap-2 !p-3">
              <input className="input !w-auto flex-1 !py-1.5 text-sm" defaultValue={c.name} id={`cat-${c.id}`} />
              <button className="rounded-md bg-cream px-3 py-1.5 text-sm font-bold" onClick={async () => {
                const newName = document.getElementById(`cat-${c.id}`).value.trim()
                if (!newName || newName === c.name) return
                await supabase.from('categories').update({ name: newName }).eq('id', c.id)
                await supabase.from('businesses').update({ category: newName }).eq('category', c.name)
                setMsg(`הקטגוריה עודכנה (כולל כל העסקים שהיו תחת "${c.name}")`)
                load()
              }}>שמרי</button>
              <button className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-bold text-red-600" onClick={async () => {
                const inUse = rows.filter(b => b.category === c.name).length
                if (inUse > 0) { alert(`יש ${inUse} עסקים בקטגוריה הזו — העבירי אותם קודם לקטגוריה אחרת`); return }
                if (!confirm('למחוק את הקטגוריה?')) return
                await supabase.from('categories').delete().eq('id', c.id)
                load()
              }}>מחקי</button>
            </div>
          ))}
          <div className="card mt-2 flex items-center gap-2 !p-3">
            <input className="input flex-1 !py-1.5 text-sm" placeholder="קטגוריה חדשה…" value={newCat} onChange={e => setNewCat(e.target.value)} />
            <button className="btn-primary !py-1.5 !text-sm" onClick={async () => {
              if (!newCat.trim()) return
              await supabase.from('categories').insert([{ name: newCat.trim() }])
              setNewCat(''); load()
            }}>הוסיפי</button>
          </div>
        </div>
      )}

      {tab === 'content' && content && (
        <div className="mt-4 flex max-w-2xl flex-col gap-4">
          {[['discounts_subtitle', 'הנחות בלעדיות — שורת פתיחה'], ['about_quote', 'על הקהילה — משפט פתיחה מודגש'], ['about_body', 'על הקהילה — גוף הטקסט'], ['about_closing', 'על הקהילה — משפט סיום']].map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <textarea rows={key === 'about_body' ? 5 : 2} className="input" value={content[key] || ''}
                onChange={e => setContent(c => ({ ...c, [key]: e.target.value }))} />
            </div>
          ))}
          <button className="btn-primary" onClick={async () => {
            const rows = Object.entries(content).map(([key, value]) => ({ key, value }))
            const { error } = await supabase.from('site_content').upsert(rows)
            setMsg(error ? 'שגיאה: ' + error.message : 'הטקסטים נשמרו')
          }}>שמרי טקסטים</button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black text-navy">{editing.id ? 'עריכת עסק' : 'עסק חדש'}</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[['name', 'שם העסק'], ['contact_name', 'איש קשר'], ['phone', 'טלפון'], ['email', 'אימייל'], ['whatsapp', 'וואטסאפ'], ['website', 'אתר'], ['facebook', 'פייסבוק'], ['instagram', 'אינסטגרם'], ['address', 'כתובת'], ['image_url', 'קישור לתמונה'], ['offer', 'הטבה']].map(([k, label]) => (
                <div key={k}>
                  <label className="label">{label}</label>
                  <input className="input !py-2" value={editing[k] || ''} onChange={e => setEditing(ed => ({ ...ed, [k]: k === 'phone' ? fmtPhone(e.target.value) : e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="label">קטגוריה</label>
                <select className="input !py-2" value={editing.category} onChange={e => setEditing(ed => ({ ...ed, category: e.target.value }))}>
                  {(cats.length ? cats.map(c => c.name) : DEFAULT_CATEGORIES).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">תיאור</label>
                <textarea rows={3} className="input" value={editing.description || ''} onChange={e => setEditing(ed => ({ ...ed, description: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 rounded-md border border-navy/10 bg-cream p-4">
              <p className="label !mb-2">תמונות העסק</p>
              {!editing.id ? (
                <p className="text-sm text-ink/50">שמרי קודם את העסק — ואז אפשר להעלות תמונות.</p>
              ) : (
                <>
                  <input type="file" accept="image/*" multiple className="text-sm"
                    onChange={e => { uploadImages([...e.target.files]); e.target.value = '' }} />
                  {bizImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {bizImages.map(img => {
                        const url = imgUrl(img.name)
                        const isMain = editing.image_url === url
                        return (
                          <div key={img.name} className={`overflow-hidden rounded-md border-2 ${isMain ? 'border-royal' : 'border-transparent'}`}>
                            <img src={url} alt="" className="h-20 w-full object-cover" />
                            <div className="flex">
                              <button type="button" className={`flex-1 py-1 text-[11px] font-bold ${isMain ? 'bg-royal text-white' : 'bg-white text-royal'}`}
                                onClick={() => setEditing(ed => ({ ...ed, image_url: isMain ? '' : url }))}>
                                {isMain ? 'ראשית ✓' : 'קבעי כראשית'}
                              </button>
                              <button type="button" className="bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600" onClick={async () => {
                                if (!confirm('למחוק את התמונה?')) return
                                const { error } = await supabase.storage.from('business-images').remove([`biz-${editing.id}/${img.name}`])
                                if (error) { setMsg('מחיקה נכשלה: ' + error.message); return }
                                if (isMain) setEditing(ed => ({ ...ed, image_url: '' }))
                                setBizImages(list => list.filter(i => i.name !== img.name))
                              }}>מחקי</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-ink/40">התמונה הראשית מופיעה בכרטיס ובדף העסק. אל תשכחי "שמירה" אחרי הבחירה.</p>
                  {editing.image_url && ('image_pos_x' in editing) && (
                    <div className="mt-4 border-t border-navy/10 pt-4">
                      <p className="label !mb-2">כיוון התמונה הראשית (כמו שתיראה בכרטיס)</p>
                      <div className="h-40 w-full overflow-hidden rounded-md">
                        <img src={editing.image_url} alt="" className="h-full w-full object-cover"
                          style={{ objectPosition: `${editing.image_pos_x ?? 50}% ${editing.image_pos_y ?? 50}%`, transform: `scale(${editing.image_zoom ?? 1})`, transformOrigin: `${editing.image_pos_x ?? 50}% ${editing.image_pos_y ?? 50}%` }} />
                      </div>
                      {[['image_pos_x', 'מיקום אופקי', 0, 100, 1], ['image_pos_y', 'מיקום אנכי', 0, 100, 1], ['image_zoom', 'זום', 1, 2.5, 0.05]].map(([k, label, min, max, step]) => (
                        <div key={k} className="mt-2 flex items-center gap-3 text-sm">
                          <span className="w-24 font-semibold text-navy">{label}</span>
                          <input type="range" min={min} max={max} step={step} className="flex-1 accent-royal"
                            value={editing[k] ?? (k === 'image_zoom' ? 1 : 50)}
                            onChange={e => setEditing(ed => ({ ...ed, [k]: Number(e.target.value) }))} />
                        </div>
                      ))}
                      <button type="button" className="mt-2 text-xs font-bold text-royal hover:underline"
                        onClick={() => setEditing(ed => ({ ...ed, image_pos_x: 50, image_pos_y: 50, image_zoom: 1 }))}>איפוס</button>
                    </div>
                  )}
                  {editing.image_url && !('image_pos_x' in editing) && (
                    <p className="mt-3 text-xs font-bold text-red-600">כדי לכוון מיקום/זום צריך להריץ את supabase-update-2.sql (בתיקיית הפרויקט)</p>
                  )}
                </>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">
              {[['published', 'מוצג באתר'], ['show_phone', 'הצג טלפון'], ['show_email', 'הצג אימייל']].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5 accent-royal" checked={!!editing[k]} onChange={e => setEditing(ed => ({ ...ed, [k]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <button className="btn-primary !py-2.5" onClick={() => save(editing)}>שמירה</button>
              <button className="btn-secondary !py-2.5" onClick={() => setEditing(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
