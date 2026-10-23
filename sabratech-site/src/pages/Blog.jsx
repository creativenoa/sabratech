import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchContent, txt, DEFAULT_CONTENT } from '../lib/data'

export default function Blog() {
  const [content, setContent] = useState(DEFAULT_CONTENT)
  useEffect(() => { fetchContent().then(setContent) }, [])
  return (
    <div className="mx-auto max-w-[1080px] px-5 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">{txt(content,'blog_kicker')}</p>
          <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">{txt(content,'blog_title')}</h1>
        </div>
        <a href="mailto:noabet@gmail.com?subject=SabraTech%20blog%20post%20submission"
          className="btn-accent">{txt(content,'blog_submit_button')}</a>
      </div>
      <div className="card mt-10 !bg-white p-12 text-center">
        <p className="font-serif text-2xl text-navy">{txt(content,'blog_coming_title')}</p>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink/60">{txt(content,'blog_coming_body')}</p>
        <div className="mt-8 flex justify-center gap-3">
          <a href="mailto:noabet@gmail.com?subject=SabraTech%20blog%20post%20submission" className="btn-outline">{txt(content,'blog_submit_button')}</a>
          <Link to="/directory" className="btn-primary">Meet the community</Link>
        </div>
      </div>
    </div>
  )
}
