// Phone alerts (web push) — browser side.
// Turning alerts on = asking permission, subscribing this device with the
// site's public key, and saving the subscription for the logged-in member.
import { supabase, hasSupabase } from './supabase'

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// What the Notifications page should show for this device.
//   unsupported | ios-install | denied | off | on
export async function pushState() {
  if (isIOS() && !isStandalone()) return 'ios-install'
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

const b64ToBytes = b64 => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

export async function enablePush(userId) {
  if (!hasSupabase) throw new Error('Database not connected')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Alerts were not allowed. You can allow them in your browser or phone settings.')
  const { publicKey } = await fetch('/api/push').then(r => r.json())
  if (!publicKey) throw new Error('Phone alerts are not available right now. Please try again later.')
  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) })
  const j = sub.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_user_agent: navigator.userAgent,
  })
  if (error) throw new Error(error.message)
  return j.endpoint
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  try { await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint) } catch { /* ignore */ }
  await sub.unsubscribe()
}

export async function sendTestPush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) throw new Error('Alerts are not on for this device.')
  const r = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test', endpoint: sub.endpoint }) })
  const body = await r.json().catch(() => ({}))
  if (!body.ok) throw new Error(body.error || 'The test alert could not be sent.')
}

// Ask the server to deliver queued alerts now. Fire-and-forget; called after
// anything that creates alerts, and every minute while someone has the site open.
let last = 0
export function flushPush({ force = false } = {}) {
  const now = Date.now()
  if (!force && now - last < 15000) return
  last = now
  try {
    fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'flush' }), keepalive: true }).catch(() => {})
  } catch { /* ignore */ }
}
