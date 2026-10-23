import { Component } from 'react'

// Last line of defence: if a page crashes, show a friendly reload card, never a blank screen.
export default class PageErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error('Page failed to load', err) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <p className="font-serif text-2xl text-navy">This page didn’t load</p>
        <p className="mt-3 text-sm text-ink/70">The site was probably just updated. Reloading usually fixes it.</p>
        <button onClick={() => window.location.reload()} className="btn-accent mt-6">Reload</button>
      </div>
    )
  }
}
