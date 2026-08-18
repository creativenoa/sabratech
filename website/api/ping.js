// Daily keep-alive ping so Supabase free projects never get paused.
export default async function handler(req, res) {
  const projects = [
    { name: 'atlanta-israeli-women', url: 'https://ouuyicqwfabnmjwimpgw.supabase.co', key: 'sb_publishable_gdwrH5VMmP2nTvnVxuGg2Q_SQhNhNbj' },
    { name: 'catchball-connect', url: 'https://afsaefagpiwrbxuuvgor.supabase.co', key: 'sb_publishable_VJFoQqm77Q-LQLTMfFXZBA_qbcfhe7V' },
  ]
  const results = {}
  for (const p of projects) {
    try {
      const r = await fetch(`${p.url}/auth/v1/health`, { headers: { apikey: p.key } })
      results[p.name] = r.status
    } catch (e) { results[p.name] = String(e) }
  }
  res.status(200).json({ ok: true, pinged: results, at: new Date().toISOString() })
}
