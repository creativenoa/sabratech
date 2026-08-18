import { useState } from 'react'
import { useAuth, signOut } from '../lib/auth'
import AuthModal from './AuthModal'

const MESSAGES = {
  anon: {
    heading: 'Members only',
    body: 'The SabraTech directory is open to approved members. Log in, or create an account to join the community.',
  },
  pending: {
    heading: 'Your membership is awaiting approval',
    body: 'Your account was created and is in review. We will email you as soon as it is approved, and this page will open up.',
  },
  rejected: {
    heading: 'Your account was not approved',
    body: 'This account does not have access to the directory. If you believe this is a mistake, please contact the site owner.',
  },
}

export default function AuthGate({ children }) {
  const { loading, isAuthed, isApproved, profile } = useAuth()
  const [modal, setModal] = useState(null)

  // Blank while resolving — never flash gated content.
  if (loading) return <div className="min-h-[60vh]" />
  if (isApproved) return <>{children}</>

  const state = !isAuthed ? 'anon' : profile?.status === 'rejected' ? 'rejected' : 'pending'
  const { heading, body } = MESSAGES[state]

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none blur-[6px]">{children}</div>

      <div className="pointer-events-none fixed inset-0 z-[1500] grid place-items-center p-5">
        <div className="card pointer-events-auto w-full max-w-md !bg-white p-8 text-center shadow-[0_24px_70px_-24px_rgba(40,49,94,0.45)]">
          <p className="kicker">SabraTech members</p>
          <h2 className="mt-2 font-serif text-2xl text-navy md:text-3xl">{heading}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/60">{body}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {state === 'anon' ? (
              <>
                <button onClick={() => setModal('login')} className="btn-outline">Log in</button>
                <button onClick={() => setModal('signup')} className="btn-accent">Become a member</button>
              </>
            ) : (
              <button onClick={() => { signOut().catch(() => {}) }} className="btn-outline">Log out</button>
            )}
          </div>
        </div>
      </div>

      <AuthModal open={!!modal} onClose={() => setModal(null)} initialTab={modal || 'login'} />
    </div>
  )
}
