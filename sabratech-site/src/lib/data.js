import { supabase, hasSupabase } from './supabase'
import { flushPush } from './push'

export const DEFAULT_CATEGORIES = [
  'Software Development', 'Data & AI', 'Cybersecurity', 'Cloud & DevOps',
  'Product Management', 'UX & Design', 'IT & Support', 'Fintech',
  'Marketing & Growth', 'Sales & BizDev', 'Hardware & IoT', 'Other',
]

// Directory reads go through the talents_directory view, which blanks the
// contact fields a member chose to hide (Settings → Privacy). The base table
// is private to admins, owners and business managers. Falls back to the base
// table only if the view is missing (e.g. mid-deploy).
const DIR = 'talents_directory'

export async function fetchTalents(type) {
  if (!hasSupabase) return []
  const run = table => {
    let q = supabase.from(table).select('*').eq('published', true)
    if (type) q = q.eq('type', type)
    return q.order('name')
  }
  let { data, error } = await run(DIR)
  if (error) ({ data, error } = await run('talents'))
  return error ? [] : data || []
}

export async function fetchTalent(id) {
  if (!hasSupabase) return null
  let { data, error } = await supabase.from(DIR).select('*').eq('id', id).maybeSingle()
  if (error) ({ data } = await supabase.from('talents').select('*').eq('id', id).eq('published', true).maybeSingle())
  return data
}

// Businesses a person belongs to (approved team member), for their page.
export async function fetchMemberBusinesses(individualId) {
  if (!hasSupabase) return []
  const { data, error } = await supabase.from('member_businesses').select('*').eq('individual_id', individualId)
  return error ? [] : data || []
}

// Approved team of a business, for its public page.
export async function fetchBusinessTeam(businessId) {
  if (!hasSupabase) return []
  const { data, error } = await supabase.from('business_team').select('*').eq('business_id', businessId)
  return error ? [] : data || []
}

// Deterministic weekly rotation — same pick for everyone all week, no cron needed.
export function weeklyFeatured(talents) {
  if (!talents.length) return null
  const now = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const week = Math.floor((now - jan1) / (7 * 24 * 3600 * 1000))
  const seed = now.getFullYear() * 53 + week
  return talents[seed % talents.length]
}

// Logged-in applicants own what they submit (so it shows up on their Profile page).
export async function submitApplication(payload) {
  if (!hasSupabase) throw new Error('Database not connected')
  let owner_id = null
  try { owner_id = (await supabase.auth.getSession())?.data?.session?.user?.id || null } catch { /* anonymous */ }
  const { error } = await supabase.from('talents').insert([{ ...payload, ...(owner_id ? { owner_id } : {}), published: false, status: 'pending' }])
  if (error) throw error
  flushPush({ force: true })
}

export async function submitSponsorInquiry(payload) {
  if (!hasSupabase) throw new Error('Database not connected')
  const { error } = await supabase.from('sponsor_inquiries').insert([payload])
  if (error) throw error
}

export async function submitContactInquiry(payload) {
  if (!hasSupabase) throw new Error('Database not connected')
  const { error } = await supabase.from('contact_inquiries').insert([payload])
  if (error) throw error
  flushPush({ force: true })
  // Best effort notification. The message is already stored, so a mail
  // failure must never surface as a submit failure to the visitor.
  try {
    await fetch('/api/contact-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch { /* stored anyway — admin inbox still has it */ }
}

export async function fetchCategories() {
  if (hasSupabase) {
    const { data, error } = await supabase.from('categories').select('name').order('sort')
    if (!error && data && data.length) return data.map(c => c.name)
  }
  return DEFAULT_CATEGORIES
}

// Files live in Neon Object Storage now. The browser asks /api/upload for a
// one-time signed upload link (the server holds the storage keys), PUTs the
// file to it, and stores the returned public URL.
export async function uploadFile(bucket, file, prefix = '') {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const contentType = file.type || 'application/octet-stream'
  const r = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, path, contentType, size: file.size }),
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok || !body.uploadUrl) throw new Error(body.error || 'Could not start the upload')
  const put = await fetch(body.uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file })
  if (!put.ok) throw new Error('Upload failed')
  return body.publicUrl
}

// Every key here is editable in Admin → Site texts. Prefix = page/section.
export const DEFAULT_CONTENT = {
  // Home
  home_hero_title: 'Israeli entrepreneurship, tech and AI in Atlanta.',
  home_hero_sub: 'SabraTech is the home of Israeli innovation in Georgia — find the startups building here and the people behind them. Connect, hire, collaborate.',
  home_search_placeholder: 'Search by name, role, skill, category…',
  home_hero_kicker: 'Israeli tech · Atlanta',
  home_featured_kicker: 'Featured',
  home_featured_note: 'A new member of the community is featured here every week.',
  home_fields_kicker: 'Fields',
  home_fields_title: 'What are you looking for?',
  // Search
  search_kicker: 'The directory',
  search_title: 'Find your people',
  // AI page
  ai_kicker: 'Artificial intelligence',
  ai_title: 'AI, together',
  ai_whatsapp_title: 'Join our local AI WhatsApp group',
  ai_whatsapp_sub: "Where Atlanta's Israeli tech community talks AI — tools, news, prompts, and hands-on help. In Hebrew, in English, in real time.",
  ai_whatsapp_button: 'Join the group',
  ai_whatsapp_link: 'https://chat.whatsapp.com/GTenT98bWXC9rkmXs5DVeb',
  ai_tools_kicker: 'Curated by the community',
  ai_tools_title: 'Leading Tools',
  ai_disclosure: 'Some links on this page are affiliate links — if you sign up through them, SabraTech may earn a commission at no extra cost to you. It helps keep this community project running.',
  // About
  about_kicker: 'Who we are',
  about_title: 'About SabraTech',
  about_quote: 'Like the sabra, we thrive wherever we take root.',
  about_body: `SabraTech was created to map and connect the Israeli tech ecosystem of greater Atlanta — the founders, engineers, designers, product leaders, and startups that carry the startup-nation spirit into Georgia.

Whether you are an Israeli professional looking for your next role, a startup searching for an exceptional addition to their team, or a local partner who wants to work with Israeli innovators — this is where you find each other.`,
  about_closing: 'Rooted here. Growing together.',
  // Apply page + form field labels
  apply_kicker: 'Join',
  apply_title: 'Apply',
  apply_intro: 'Part of the Israeli tech scene in greater Atlanta? Claim your page in the directory.',
  apply_lbl_name_individual: 'Full name',
  apply_lbl_name_company: 'Startup name',
  apply_lbl_first_name: 'First name',
  apply_lbl_last_name: 'Last name',
  apply_lbl_title_individual: 'Current role',
  apply_lbl_title_company: 'Tagline (one line about the startup)',
  apply_lbl_company: 'At (company)',
  apply_lbl_category: 'Field',
  apply_lbl_bio_individual: 'Short bio summary (shown under your name)',
  apply_lbl_bio_company: 'Short summary',
  apply_lbl_description_individual: 'More about you (optional)',
  apply_lbl_description_company: 'About the startup (optional)',
  apply_lbl_skills_individual: 'Skills / tech stack (comma-separated)',
  apply_lbl_skills_company: 'Technologies (comma-separated)',
  apply_lbl_email: 'Email',
  apply_lbl_phone: 'Phone (xxx-xxx-xxxx format)',
  apply_lbl_linkedin: 'LinkedIn URL',
  apply_lbl_website: 'Website',
  apply_lbl_github_individual: 'GitHub',
  apply_lbl_github_company: 'Careers page',
  apply_lbl_whatsapp: 'WhatsApp (number or wa.me link)',
  apply_lbl_address_individual: 'Area / neighborhood (optional — appears on the map)',
  apply_lbl_address_company: 'Office address (optional — appears on the map)',
  apply_lbl_photo_individual: 'Profile photo',
  apply_lbl_photo_company: 'Startup logo',
  // Blog
  blog_kicker: 'Community voices',
  blog_title: 'Blog',
  blog_submit_button: 'Submit a blog post',
  blog_coming_title: 'The community blog is coming soon',
  blog_coming_body: 'Members will share stories, launches, and lessons from the Israeli tech scene in Atlanta. Want to be one of the first voices? Send us your post.',
  // Sponsor modal + footer
  sponsor_kicker: 'Partner with us',
  sponsor_title: 'Become a Sponsor',
  sponsor_sub: 'Support the Israeli tech community of Atlanta and put your brand in front of its most connected members.',
  footer_tagline: 'The Israeli entrepreneur, tech and AI directory of greater Atlanta',
}

// fetchContent() merges DB overrides over these defaults; use txt() for lookups.
export const txt = (content, key) => content?.[key] ?? DEFAULT_CONTENT[key] ?? ''

export async function fetchTools() {
  if (hasSupabase) {
    const { data, error } = await supabase.from('ai_tools').select('*').eq('published', true).order('sort')
    if (!error && data && data.length) return data
  }
  return []
}

export async function fetchContent() {
  const merged = { ...DEFAULT_CONTENT }
  if (hasSupabase) {
    const { data, error } = await supabase.from('site_content').select('*')
    if (!error && data) for (const row of data) if (row.value) merged[row.key] = row.value
  }
  return merged
}
