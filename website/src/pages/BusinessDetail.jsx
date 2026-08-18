import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchBusiness } from '../lib/data'
import { supabase, hasSupabase } from '../lib/supabase'
import { BusinessImage } from '../components/BusinessCard'
import { Phone, Mail, Globe, Pin, ArrowBack, Whatsapp, Facebook, Instagram } from '../components/Icons'

function ContactLink({ href, icon: Icon, children }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-md border border-navy/15 bg-white px-4 py-3.5 text-sm font-semibold text-navy transition hover:border-navy hover:bg-navy hover:text-cream">
      <Icon className="h-5 w-5" />
      {children}
    </a>
  )
}

export default function BusinessDetail() {
  const { id } = useParams()
  const [b, setB] = useState(undefined)
  const [gallery, setGallery] = useState([])
  const [lightbox, setLightbox] = useState(null)
  useEffect(() => {
    fetchBusiness(id).then(setB)
    if (hasSupabase) {
      supabase.storage.from('business-images').list(`biz-${id}`).then(({ data }) => {
        if (data) setGallery(data.map(f => supabase.storage.from('business-images').getPublicUrl(`biz-${id}/${f.name}`).data.publicUrl))
      })
    }
  }, [id])

  if (b === undefined) return <p className="py-24 text-center text-ink/40">טוען…</p>
  if (!b) return (
    <div className="py-24 text-center">
      <p className="font-serif text-3xl text-navy">העסק לא נמצא</p>
      <Link to="/businesses" className="btn-primary mt-8">חזרה לרשימה</Link>
    </div>
  )

  const site = b.website && (b.website.startsWith('http') ? b.website : 'https://' + b.website)

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-12">
      <Link to="/businesses" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 transition hover:text-royal">
        <ArrowBack className="h-4 w-4 rotate-180" />
        לכל העסקים
      </Link>

      <div className="mt-8 grid gap-10 md:grid-cols-[300px_1fr]">
        <div>
          <BusinessImage b={b} arch className="h-72 w-full md:h-80" />
        </div>
        <div>
          <p className="kicker">{b.category}</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-navy md:text-5xl">{b.name}</h1>
          {b.contact_name && <p className="mt-3 text-sm font-semibold text-ink/50">{b.contact_name}</p>}
          <p className="mt-6 whitespace-pre-line leading-loose text-ink/75">{b.description}</p>

          {b.offer && (
            <div className="mt-7 rounded-md border border-dashed border-royal/50 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-royal">הטבה בלעדית לחברות הקהילה</p>
              <p className="mt-2 font-serif text-xl text-navy">{b.offer}</p>
            </div>
          )}

          {b.address && (
            <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink/60">
              <Pin className="h-4 w-4 text-royal" /> {b.address}
            </p>
          )}

          <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {b.show_phone && b.phone && <ContactLink href={`tel:${b.phone.replace(/\D/g, '')}`} icon={Phone}>טלפון</ContactLink>}
            <ContactLink href={b.whatsapp} icon={Whatsapp}>וואטסאפ</ContactLink>
            {b.show_email && b.email && <ContactLink href={`mailto:${b.email.split(/[ ,]+/)[0]}`} icon={Mail}>אימייל</ContactLink>}
            {site && <ContactLink href={site} icon={Globe}>אתר</ContactLink>}
            <ContactLink href={b.facebook} icon={Facebook}>פייסבוק</ContactLink>
            <ContactLink href={b.instagram} icon={Instagram}>אינסטגרם</ContactLink>
          </div>
          {gallery.length > 0 && (
            <div className="mt-10">
              <p className="kicker">גלריה</p>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {gallery.map(url => (
                  <button key={url} type="button" onClick={() => setLightbox(url)}
                    className="aspect-square overflow-hidden rounded-md border border-navy/10 transition hover:opacity-85">
                    <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/80 p-6" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-[85vh] max-w-full rounded-md" />
        </div>
      )}
    </div>
  )
}
