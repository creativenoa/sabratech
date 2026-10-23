// Google Analytics 4 (property "SabraTech website", account "SabraTech").
// Privacy: only the page path is ever sent — never query strings (password-reset
// links carry a secret token there), emails, names or member IDs.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const GA_ID = 'G-9CC6GQM59M'
const LIVE_HOSTS = ['atlanta-sabra.tech', 'www.atlanta-sabra.tech', 'sabratech.vercel.app']
const enabled = typeof window !== 'undefined' && LIVE_HOSTS.includes(window.location.hostname)

let loaded = false
function load() {
  if (loaded || !enabled) return
  loaded = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, {
    send_page_view: false,          // we send our own, cleaned page views below
    page_location: cleanUrl(),
    page_referrer: cleanRef(),
  })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
}

const cleanUrl = () => `${window.location.origin}${window.location.pathname}`
const cleanRef = () => {
  try { const r = new URL(document.referrer); return `${r.origin}${r.pathname}` } catch { return '' }
}

// One page view per route change (the site is a single-page app).
export function usePageViews() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!enabled) return
    load()
    const page_location = cleanUrl()
    window.gtag('set', { page_location })   // later automatic events use the clean URL too
    window.gtag('event', 'page_view', { page_location, page_title: document.title })
  }, [pathname])
}
