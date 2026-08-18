import { useEffect, useState } from 'react'

// "Add SabraTech to your phone" bar.
//
// Two completely different mechanisms, because the platforms disagree:
//   - Chrome / Edge / Android fire `beforeinstallprompt`, which we capture and
//     replay when the visitor taps Install. This is a real one-tap install.
//   - iOS Safari fires nothing and has no install API at all. The only route is
//     Share -> Add to Home Screen, so there we show instructions instead of a
//     button that could not possibly work.
//
// Dismissal is remembered so we never nag. Reset by clearing the key below.
const DISMISS_KEY = 'sabratech_install_dismissed'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)')?.matches ||
  window.navigator.standalone === true

const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [showIOS, setShowIOS] = useState(false)

  useEffect(() => {
    // Already installed, or previously dismissed: stay out of the way.
    if (isStandalone()) return
    try { if (localStorage.getItem(DISMISS_KEY)) return } catch { /* private mode */ }

    const onPrompt = e => {
      e.preventDefault()          // stop Chrome's own mini-infobar
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS never fires the event, so decide on our own after a short delay —
    // long enough that it does not slam into the first paint.
    let timer
    if (isIOS() && window.navigator.userAgent.includes('Safari')) {
      timer = setTimeout(() => setShowIOS(true), 2500)
    }

    const onInstalled = () => { setDeferred(null); setShowIOS(false) }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode */ }
    setDeferred(null)
    setShowIOS(false)
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice.catch(() => {})
    // The event is single-use — Chrome will fire a fresh one if they decline.
    setDeferred(null)
  }

  if (!deferred && !showIOS) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1200] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[560px] items-center gap-3 rounded-md border border-navy/10 bg-white p-3 shadow-lg">
        <img src="/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base leading-tight text-navy">Add SabraTech to your phone</p>
          <p className="mt-0.5 text-sm leading-snug text-ink/60">
            {showIOS
              ? 'Tap the Share button, then "Add to Home Screen".'
              : 'Open it like an app, straight from your home screen.'}
          </p>
        </div>
        {deferred && (
          <button onClick={install} className="btn-accent shrink-0 !px-4 !py-2 !text-sm">
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 px-2 text-2xl leading-none text-ink/35 transition hover:text-navy"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
