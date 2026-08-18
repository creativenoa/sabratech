import { useEffect, useState } from 'react'
import { FB_GROUP } from '../components/Layout'
import { fetchContent, DEFAULT_CONTENT } from '../lib/data'

export default function About() {
  const [content, setContent] = useState(DEFAULT_CONTENT)
  useEffect(() => { fetchContent().then(setContent) }, [])
  return (
    <div className="mx-auto max-w-[1080px] px-5 py-14">
      <p className="kicker">מי אנחנו</p>
      <h1 className="mt-2 font-serif text-4xl text-navy md:text-5xl">על הקהילה</h1>
      <div className="mt-8 border-s-2 border-royal ps-6">
        <p className="font-serif text-2xl leading-relaxed text-navy">
          {content.about_quote}
        </p>
      </div>
      <p className="mt-8 whitespace-pre-line leading-loose text-ink/70">{content.about_body}</p>
      <p className="mt-6 font-serif text-xl leading-relaxed text-navy">
        {content.about_closing}
      </p>
      <a href={FB_GROUP} target="_blank" rel="noopener noreferrer" className="btn-primary mt-10">
        הצטרפי לקבוצת הפייסבוק
      </a>
    </div>
  )
}
