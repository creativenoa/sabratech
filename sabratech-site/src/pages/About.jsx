import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchContent, txt, DEFAULT_CONTENT } from '../lib/data'

export default function About() {
  const [content, setContent] = useState(DEFAULT_CONTENT)
  useEffect(() => { fetchContent().then(setContent) }, [])
  return (
    <div className="mx-auto max-w-[1080px] px-5 py-14">
      <p className="kicker">{txt(content,'about_kicker')}</p>
      <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">{txt(content,'about_title')}</h1>
      <div className="mt-8 border-l-2 border-cyan pl-6">
        <p className="font-serif text-2xl leading-relaxed text-navy">{txt(content,'about_quote')}</p>
      </div>
      <p className="mt-8 max-w-3xl whitespace-pre-line leading-loose text-ink/70">{txt(content,'about_body')}</p>
      <p className="mt-6 font-serif text-xl leading-relaxed text-navy">{txt(content,'about_closing')}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/apply" className="btn-accent">Join</Link>
        <Link to="/directory" className="btn-outline">Browse the community</Link>
      </div>
    </div>
  )
}
