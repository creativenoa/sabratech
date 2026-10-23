import { useEffect, useRef } from 'react'

// Page-scroll lock shared by every overlay (dialogs, mobile menu). A counter keeps
// two overlays from unlocking each other.
let locks = 0
let savedOverflow = ''
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    if (locks === 0) savedOverflow = document.body.style.overflow
    locks += 1
    document.body.style.overflow = 'hidden'
    return () => {
      locks -= 1
      if (locks === 0) document.body.style.overflow = savedOverflow
    }
  }, [active])
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const tabbables = root => [...root.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length > 0)

/**
 * Accessible modal dialog: role="dialog", aria-modal, labelled by `labelledBy`,
 * focus moves in on open, Tab is trapped, Escape closes, focus returns to the
 * opener on close and the page behind does not scroll.
 * Mount it only while it is open.
 *   returnFocusTo — optional () => element to focus on close (default: whatever had focus on open)
 */
export default function Dialog({ onClose, labelledBy, className = 'card w-full max-w-lg !bg-white p-7', returnFocusTo, children }) {
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const returnRef = useRef(returnFocusTo)
  returnRef.current = returnFocusTo
  useScrollLock(true)

  useEffect(() => {
    const opener = document.activeElement
    const root = panel.current
    // First form field if there is one, otherwise the first control (the close button).
    const first = root.querySelector('input:not([type="hidden"]):not([disabled]), textarea, select') || tabbables(root)[0] || root
    first.focus({ preventScroll: true })

    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current?.(); return }
      if (e.key !== 'Tab') return
      const items = tabbables(root)
      if (!items.length) { e.preventDefault(); root.focus(); return }
      const a = document.activeElement
      const firstEl = items[0], lastEl = items[items.length - 1]
      if (!root.contains(a)) { e.preventDefault(); (e.shiftKey ? lastEl : firstEl).focus() }
      else if (e.shiftKey && (a === firstEl || a === root)) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && a === lastEl) { e.preventDefault(); firstEl.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      const target = returnRef.current?.() || opener
      if (target && document.contains(target) && typeof target.focus === 'function') target.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div className="backdrop-in fixed inset-0 z-[2000] grid place-items-center overflow-y-auto bg-navy/60 p-5 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}
        className={`modal-in ${className} outline-none`}>
        {children}
      </div>
    </div>
  )
}
