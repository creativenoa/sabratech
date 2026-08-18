// Daily keep-alive so Supabase free projects never pause and sites always show activity.
// Per project: a real table query (counts as database API activity; a 401/permission
// response still registers as an authenticated API request) + auth settings (returns 200).
export default async function handler(req, res) {
  const projects = [
    { name: 'sabratech', url: 'https://ngskhkjizjaxzquyqkkp.supabase.co', key: 'sb_publishable_6RiqlkES95dWYi2EPgn42g_ZKeOVbps', table: 'categories' },
    { name: 'catchball-connect', url: 'https://afsaefagpiwrbxuuvgor.supabase.co', key: 'sb_publishable_VJFoQqm77Q-LQLTMfFXZBA_qbcfhe7V', table: 'teams' },
  ]
  const sites = [
    'https://sabratech.vercel.app',
    // add future production sites here
  ]
  const results = {}
  for (const p of projects) {
    try {
      const r1 = await fetch(`${p.url}/rest/v1/${p.table}?select=*&limit=1`, { headers: { apikey: p.key } })
      results[`db:${p.name}`] = r1.status
      const r2 = await fetch(`${p.url}/auth/v1/settings`, { headers: { apikey: p.key } })
      results[`auth:${p.name}`] = r2.status
    } catch (e) { results[`db:${p.name}`] = String(e) }
  }
  for (const s of sites) {
    try {
      const r = await fetch(s, { headers: { 'User-Agent': 'keepalive-ping' } })
      results[`site:${s}`] = r.status
    } catch (e) { results[`site:${s}`] = String(e) }
  }
  res.status(200).json({ ok: true, pinged: results, at: new Date().toISOString() })
}
