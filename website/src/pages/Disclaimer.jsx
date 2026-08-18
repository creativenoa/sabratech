import { useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'

export default function Disclaimer() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const send = async e => {
    e.preventDefault()
    if (hasSupabase) {
      await supabase.from('submissions').insert([{
        business_name: `פנייה: ${form.name}`, contact_name: form.name,
        email: form.email, description: form.message, category: 'פנייה',
      }])
    }
    setSent(true)
  }
  return (
    <div className="mx-auto max-w-[700px] px-5 py-14">
      <p className="kicker">מידע משפטי</p>
      <h1 className="mt-2 font-serif text-4xl text-navy">הסרת אחריות</h1>
      <div className="mt-8 flex flex-col gap-5 leading-loose text-ink/75">
        <p>
          אתר "עצמאיות באטלנטה" (להלן: "האתר") הוא מדריך עסקים קהילתי, המרכז מידע על עסקים
          של חברות הקהילה הישראלית באזור אטלנטה. האתר מופעל בהתנדבות וללא מטרות רווח.
        </p>
        <p>
          המידע המופיע באתר — לרבות פרטי עסקים, תיאורים, תמונות, קישורים, מחירים והטבות —
          נמסר על ידי בעלות העסקים עצמן ובאחריותן הבלעדית. האתר אינו בודק, מאמת או מפקח על
          נכונות המידע, איכות המוצרים או השירותים, או כל היבט אחר של העסקים המופיעים בו.
        </p>
        <p>
          הופעת עסק באתר אינה מהווה המלצה, אישור או ערובה מכל סוג שהוא מטעם האתר או מפעילותיו.
          כל התקשרות, עסקה או תקשורת בין המשתמשות באתר לבין העסקים המפורסמים בו נעשית באופן
          ישיר בין הצדדים, ועל אחריותם בלבד.
        </p>
        <p>
          מפעילות האתר לא תישאנה בכל אחריות לנזק, ישיר או עקיף, שייגרם כתוצאה מהסתמכות על
          מידע המופיע באתר, משימוש בשירותי העסקים המפורסמים בו, או מאי-דיוקים, השמטות או
          טעויות במידע. ההטבות המפורסמות באתר כפופות לשינוי או ביטול בכל עת על ידי העסקים,
          ללא הודעה מוקדמת.
        </p>
        <p>
          האתר מכיל קישורים לאתרים חיצוניים (אתרי עסקים, רשתות חברתיות ועוד). האתר אינו אחראי
          לתוכן, לזמינות או למדיניות הפרטיות של אתרים אלה.
        </p>
        <p>
          בעלת עסק המעוניינת לעדכן, לתקן או להסיר את פרטי העסק שלה מהאתר מוזמנת{' '}
          <button onClick={() => setOpen(true)} className="font-semibold text-royal underline underline-offset-4 hover:text-navy">לפנות אלינו</button>
          {' '}והבקשה תטופל בהקדם.
        </p>
        <p>
          השימוש באתר מהווה הסכמה לתנאים אלה.
        </p>
      </div>

      {open && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-md bg-white p-6" onClick={e => e.stopPropagation()}>
            {sent ? (
              <div className="py-6 text-center">
                <p className="font-serif text-2xl text-navy">הפנייה נשלחה</p>
                <p className="mt-2 text-sm text-ink/60">נחזור אלייך בהקדם.</p>
                <button className="btn-primary mt-6 !py-2" onClick={() => setOpen(false)}>סגירה</button>
              </div>
            ) : (
              <form onSubmit={send} className="flex flex-col gap-3">
                <h2 className="font-serif text-2xl text-navy">יצירת קשר</h2>
                <div>
                  <label className="label" htmlFor="c-name">שם *</label>
                  <input id="c-name" required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label" htmlFor="c-email">אימייל *</label>
                  <input id="c-email" type="email" required className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label" htmlFor="c-msg">מה תרצי לעדכן/לתקן/להסיר? *</label>
                  <textarea id="c-msg" required rows={4} className="input" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1 !py-2.5">שליחה</button>
                  <button type="button" className="btn-outline !py-2.5" onClick={() => setOpen(false)}>ביטול</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
