import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import AuthModal from './AuthModal'
import LogoAnimated, { LOGO_MODE } from './LogoAnimated'

// Headline rises in once per browser visit (not on every trip back to Home).
let heroPlays = (() => {
  try { if (sessionStorage.getItem('st_hero_seen')) return false; sessionStorage.setItem('st_hero_seen', '1'); return true } catch { return false }
})()
const riseAt = (on, ms) => (on ? { className: 'rise-in', style: { animationDelay: `${ms}ms` } } : { className: '' })

// Logged-out call to action without the heavy box-in-a-box frame.
export function HeroJoin({ dark = false }) {
  const { isAuthed, isApproved, profile } = useAuth()
  const [modal, setModal] = useState(null)
  const rejected = isAuthed && profile?.status === 'rejected'
  const pending = isAuthed && !isApproved && !rejected
  const note = pending
    ? 'Your membership is awaiting approval — we will email you as soon as it is approved.'
    : rejected
      ? 'This account does not have access to the directory. Please contact the site owner.'
      : 'The directory is for members. Join free, or log in to search the community.'
  return (
    <div className="mt-9">
      {!isAuthed && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={() => setModal('signup')} className="btn-accent !px-7 !py-3.5 !text-base">Become a member</button>
          <button onClick={() => setModal('login')}
            className={dark
              ? 'inline-flex items-center justify-center rounded-md border border-white/40 px-7 py-3.5 font-semibold tracking-wide text-white transition hover:bg-white hover:text-navy active:scale-[0.97]'
              : 'btn-outline !px-7 !py-3.5'}>
            Log in
          </button>
        </div>
      )}
      <p className={`mt-4 text-sm ${dark ? 'text-white/75' : 'text-ink/70'}`}>{note}</p>
      <AuthModal open={!!modal} onClose={() => setModal(null)} initialTab={modal || 'login'} />
    </div>
  )
}

function Headline({ line1, words, dark, className = '', anim = false }) {
  const l1 = riseAt(anim, 90), l2 = riseAt(anim, 180)
  return (
    <h1 className={`break-words font-serif font-600 leading-[1.08] tracking-[-0.02em] ${dark ? 'text-white' : 'text-navy'} ${className}`}>
      {line1 && <span className={`block ${l1.className}`} style={l1.style}>{line1}</span>}
      <span className={`block ${l2.className}`} style={l2.style}>
        {words.slice(0, -1).join(' ')}{' '}
        <span className="text-cyan">{words.slice(-1)}</span>
      </span>
    </h1>
  )
}

// B — bold navy band, white type, your Atlanta skyline line art along the bottom.
export function HeroSkyline({ kicker, line1, words, sub, cta }) {
  const [anim] = useState(heroPlays)
  useEffect(() => { heroPlays = false }, [])
  const k = riseAt(anim, 0), s = riseAt(anim, 300)
  const [skylineReady, setSkylineReady] = useState(false)
  useEffect(() => {
    const img = new Image()
    img.onload = img.onerror = () => setSkylineReady(true)
    img.src = '/hero-skyline.webp'
    if (img.complete) setSkylineReady(true)
  }, [])
  return (
    <section className="relative overflow-hidden bg-navy">
      {/* Skyline art: small file, preloaded in index.html, fades in instead of popping. */}
      <div aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[url('/hero-skyline.webp')] bg-contain bg-bottom bg-repeat-x transition-opacity duration-700 md:h-[70%] ${skylineReady ? 'opacity-[0.12]' : 'opacity-0'}`} />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-cyan/25 blur-[120px]" />
      <div className="relative mx-auto max-w-[1080px] px-5 pb-24 pt-20 text-center md:pb-36 md:pt-32">
        {LOGO_MODE !== 'header' && <LogoAnimated tone="dark" className="mx-auto mb-8 h-20 w-auto md:h-28" />}
        <p className={`text-xs font-semibold uppercase tracking-[0.25em] text-cyan-bright ${k.className}`} style={k.style}>{kicker}</p>
        <Headline dark anim={anim} line1={line1} words={words} className="mx-auto mt-5 max-w-4xl text-[clamp(2.2rem,9vw,3.2rem)] md:text-7xl" />
        <p className={`mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/80 ${s.className}`} style={s.style}>{sub}</p>
        <div className="mx-auto flex min-h-[262px] w-full max-w-2xl flex-col items-center sm:min-h-[146px] [&>div]:w-full [&>div>div]:justify-center [&>form]:w-full [&_p]:text-center">{cta}</div>
      </div>
    </section>
  )
}
