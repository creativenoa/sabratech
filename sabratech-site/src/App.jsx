import { Suspense } from 'react'
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import AuthGate from './components/AuthGate'
import Home from './pages/Home'
import About from './pages/About'
import { usePageViews } from './lib/analytics'
import { useAuth } from './lib/auth'
import { ADMIN_PATH } from './lib/adminPath'

// Route pages that are not needed for the first public view load on demand.
import lazyPage from './lib/lazyPage'
import PageErrorBoundary from './components/PageErrorBoundary'
const Search = lazyPage(() => import('./pages/Search'))
const TalentDetail = lazyPage(() => import('./pages/TalentDetail'))
const AI = lazyPage(() => import('./pages/AI'))
const Apply = lazyPage(() => import('./pages/Apply'))
const Blog = lazyPage(() => import('./pages/Blog'))
const Events = lazyPage(() => import('./pages/Events'))
const Disclaimer = lazyPage(() => import('./pages/Disclaimer'))
const ResetPassword = lazyPage(() => import('./pages/ResetPassword'))
const MyAccount = lazyPage(() => import('./pages/account/MyAccount'))
const Profile = lazyPage(() => import('./pages/account/Profile'))
const Notifications = lazyPage(() => import('./pages/account/Notifications'))
const Settings = lazyPage(() => import('./pages/account/Settings'))
const Admin = lazyPage(() => import('./pages/Admin'))

// Fixed-height placeholder so the footer does not jump while a page chunk loads.
const Fallback = () => <div className="min-h-[70vh]" aria-hidden="true" />

// Old /talent/:id links stay alive.
function LegacyTalentRedirect() {
  const { id } = useParams()
  return <Navigate to={`/individual/${id}`} replace />
}

// Exactly what an unknown URL renders.
const NotFound = () => <AuthGate><Home /></AuthGate>

// Admin console: only approved admins ever see it. Everyone else gets the
// unknown-URL page, with no hint that a console exists.
function AdminGuard() {
  const { loading, isAdmin } = useAuth()
  if (loading) return <div className="min-h-[70vh]" />
  if (!isAdmin) return <NotFound />
  return <Admin />
}

// Old notification links point at /admin.
function LegacyAdminRedirect() {
  const { loading, isAdmin } = useAuth()
  const { search, hash } = useLocation()
  if (loading) return <div className="min-h-[70vh]" />
  if (!isAdmin) return <NotFound />
  return <Navigate to={ADMIN_PATH + search + hash} replace />
}

export default function App() {
  usePageViews()
  return (
    <PageErrorBoundary>
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<AuthGate><Search /></AuthGate>} />
          <Route path="/individual/:id" element={<AuthGate><TalentDetail /></AuthGate>} />
          <Route path="/talent/:id" element={<LegacyTalentRedirect />} />
          <Route path="/about" element={<About />} />
          <Route path="/events" element={<AuthGate><Events /></AuthGate>} />
          <Route path="/ai" element={<AuthGate><AI /></AuthGate>} />
          <Route path="/apply" element={<AuthGate><Apply /></AuthGate>} />
          <Route path="/blog" element={<AuthGate><Blog /></AuthGate>} />
          <Route path={ADMIN_PATH} element={<AdminGuard />} />
          <Route path="/admin" element={<LegacyAdminRedirect />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/account" element={<MyAccount />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
    </PageErrorBoundary>
  )
}
