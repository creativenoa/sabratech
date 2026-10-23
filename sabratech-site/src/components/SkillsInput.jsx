import { useRef, useState } from 'react'
import { Close } from './Icons'

// Skills as pills. Enter, comma, or leaving the field turns the typed text into
// a pill; pasting "React, AWS, AI" makes three. Backspace on an empty field
// removes the last pill. `value` is an array of strings.
export default function SkillsInput({ id, label, value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const add = text => {
    const parts = text.split(',').map(s => s.trim().slice(0, 40)).filter(Boolean)
    if (!parts.length) return
    const seen = new Set(value.map(s => s.toLowerCase()))
    const next = [...value]
    for (const p of parts) if (!seen.has(p.toLowerCase())) { seen.add(p.toLowerCase()); next.push(p) }
    onChange(next)
  }
  const commit = () => { if (draft.trim()) add(draft); setDraft('') }
  const remove = i => onChange(value.filter((_, j) => j !== i))

  return (
    <div>
      <label className="label" htmlFor={id}>{label.replace(/\s*\(comma-separated\)/i, '')}</label>
      <div className="input flex min-h-[50px] cursor-text flex-wrap items-center gap-2 !py-2" onClick={() => inputRef.current?.focus()}>
        {value.map((s, i) => (
          <span key={s + i} className="inline-flex items-center gap-1 rounded-md bg-cyan/10 py-1 pl-2.5 pr-1 text-sm font-semibold text-royal">
            {s}
            <button type="button" onClick={e => { e.stopPropagation(); remove(i) }} aria-label={`Remove ${s}`}
              className="rounded p-0.5 text-royal/60 hover:bg-cyan/20 hover:text-royal"><Close className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        <input ref={inputRef} id={id} value={draft}
          className="min-w-[8rem] flex-1 bg-transparent py-1 outline-none"
          placeholder={value.length ? 'Add another…' : placeholder}
          onChange={e => {
            const v = e.target.value
            if (v.includes(',')) { add(v); setDraft('') } else setDraft(v)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            else if (e.key === 'Backspace' && !draft && value.length) remove(value.length - 1)
          }}
          onBlur={commit} />
      </div>
      <p className="mt-1 text-xs text-ink/45">Press Enter after each one.</p>
    </div>
  )
}
