import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import AuthGate from './components/AuthGate'
import Home from './pages/Home'
import Search from './pages/Search'
import TalentDetail from './pages/TalentDetail'
import About from './pages/About'
import AI from './pages/AI'
import Apply from './pages/Apply'
import Blog from './pages/Blog'
import Admin from './pages/Admin'
import Disclaimer from './pages/Disclaimer'
import ResetPassword from './pages/ResetPassword'
import MyAccount from './pages/account/MyAccount'
import Profile from './pages/account/Profile'
import Notifications from './pages/account/Notifications'
import Settings from './pages/account/Settings'

// Old /talent/:id links stay alive.
function LegacyTalentRedirect() {
  const { id } = useParams()
  return <Navigate to={`/individual/${id}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<AuthGate><Search /></AuthGate>} />
        <Route path="/individual/:id" element={<AuthGate><TalentDetail /></AuthGate>} />
        <Route path="/talent/:id" element={<LegacyTalentRedirect />} />
        <Route path="/about" element={<About />} />
        <Route path="/ai" element={<AuthGate><AI /></AuthGate>} />
        <Route path="/apply" element={<AuthGate><Apply /></AuthGate>} />
        <Route path="/blog" element={<AuthGate><Blog /></AuthGate>} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/account" element={<MyAccount />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/disclaimer" element={<AuthGate><Disclaimer /></AuthGate>} />
        <Route path="*" element={<AuthGate><Home /></AuthGate>} />
      </Route>
    </Routes>
  )
}
