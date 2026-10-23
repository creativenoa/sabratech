import { lazy } from 'react'

// Load a page's code on demand. If that fails — almost always because the site was
// updated while this tab/app window was open and the old file no longer exists —
// reload once to pick up the new version instead of showing a blank page.
const KEY = 'sabra.reloadedForUpdate'

export default function lazyPage(load) {
  return lazy(() =>
    load().then(
      mod => { try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } return mod },
      err => {
        let already = false
        try { already = sessionStorage.getItem(KEY) === '1'; sessionStorage.setItem(KEY, '1') } catch { /* ignore */ }
        if (!already) { window.location.reload(); return new Promise(() => {}) }
        throw err
      },
    ),
  )
}
