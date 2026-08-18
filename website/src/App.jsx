import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Directory from './pages/Directory'
import BusinessDetail from './pages/BusinessDetail'
import Discounts from './pages/Discounts'
import About from './pages/About'
import Join from './pages/Join'
import Admin from './pages/Admin'
import Disclaimer from './pages/Disclaimer'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/businesses" element={<Directory />} />
        <Route path="/business/:id" element={<BusinessDetail />} />
        <Route path="/discounts" element={<Discounts />} />
        <Route path="/about" element={<About />} />
        <Route path="/join" element={<Join />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
