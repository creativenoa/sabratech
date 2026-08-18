import { useState } from 'react'
import { useAuth } from '../lib/auth'
import AuthModal from './AuthModal'

export default function LoginCard() {
  const { isAuthed, isApproved, profile } = useAuth()
  const [modal, setModal] = useState(null)

  const rejected = isAuthed && profile?.status === 'rejected'
  const pending = isAuthed && !isApproved && !rejected

  return (
    <>
      <div className="card mt-10 w-full max-w-2xl !bg-white p-3">
        <div className="flex flex-col gap-4 rounded-md bg-cream px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="font-serif text-lg text-navy">The directory is for members</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/60">
              {pending
                ? 'Your membership is awaiting approval. We will email you as soon as it is approved.'
                : rejected
                  ? 'This account does not have access to the directory. Please contact the site owner.'
                  : 'Log in to search the Israeli tech community of Atlanta, or create an account to join it.'}
            </p>
          </div>
          {!isAuthed && (
            <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row">
              <button onClick={() => setModal('login')} className="btn-outline !px-5 !py-2.5 text-sm">Log in</button>
              <button onClick={() => setModal('signup')} className="btn-accent !px-5 !py-2.5 text-sm">Become a member</button>
            </div>
          )}
        </div>
      </div>

      <AuthModal open={!!modal} onClose={() => setModal(null)} initialTab={modal || 'login'} />
    </>
  )
}
