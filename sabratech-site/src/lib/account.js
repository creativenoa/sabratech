// Member account area: listings, businesses, alerts, preferences.
// Permission rules live in the database (sabratech-account-2026-10-22.sql);
// these helpers just call them and turn errors into plain messages.
import { supabase, hasSupabase } from './supabase'

const need = () => { if (!hasSupabase) throw new Error('Database not connected') }
const plain = error => {
  const m = error?.message || String(error || 'Something went wrong')
  if (/talents_one_individual_per_owner/.test(m)) return 'You already have an individual listing — edit it on your Profile page.'
  if (/row-level security/i.test(m)) return 'You do not have permission to do that.'
  return m
}
const unwrap = ({ data, error }) => { if (error) throw new Error(plain(error)); return data }
const rpc = async (fn, args) => { need(); return unwrap(await supabase.rpc(fn, args)) }

// ---------- listings ----------
export const LISTING_FIELDS = [
  'type', 'name', 'first_name', 'last_name', 'title', 'company', 'bio', 'description', 'category', 'skills',
  'linkedin', 'website', 'github', 'email', 'phone', 'whatsapp', 'address', 'photo_url',
  'open_to_work', 'freelance', 'hiring', 'show_phone', 'show_email', 'show_whatsapp', 'show_on_map',
]
const pick = obj => Object.fromEntries(Object.entries(obj).filter(([k]) => LISTING_FIELDS.includes(k)))

// Individuals: `name` is kept in sync by a DB trigger, but send it too so a
// brand-new row satisfies NOT NULL.
const withName = t => t.type === 'individual'
  ? { ...t, name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.name || '' }
  : t

export async function fetchMyIndividual(userId) {
  need()
  const data = unwrap(await supabase.from('talents').select('*')
    .eq('owner_id', userId).eq('type', 'individual').limit(1))
  return data?.[0] || null
}

export async function fetchListing(id) {
  need()
  return unwrap(await supabase.from('talents').select('*').eq('id', id).maybeSingle())
}

export async function createListing(userId, fields) {
  need()
  const row = withName({ ...pick(fields), owner_id: userId, status: 'pending', published: false })
  const data = unwrap(await supabase.from('talents').insert([row]).select('*'))
  return data?.[0]
}

export async function updateListing(id, fields) {
  need()
  const { type, ...rest } = withName(pick(fields))
  const data = unwrap(await supabase.from('talents').update(rest).eq('id', id).select('*'))
  if (!data?.length) throw new Error('Could not save — you may no longer have edit rights to this listing.')
  return data[0]
}

// ---------- businesses ----------
export const myBusinesses = () => rpc('my_businesses')
export const searchBusinesses = q => rpc('search_businesses', { q })
export const requestJoin = (bid, asLeader = false) => rpc('request_join_business', { bid, as_leader: !!asLeader })
export const businessMembers = bid => rpc('business_members_detail', { bid })
export const respondJoin = (memberId, approve, asRole) => rpc('respond_join_request', { member_id: memberId, approve, ...(asRole ? { as_role: asRole } : {}) })
export const setMemberRole = (memberId, role) => rpc('set_business_member_role', { member_id: memberId, new_role: role })
export const removeMember = memberId => rpc('remove_business_member', { member_id: memberId })
export const transferOwnership = (bid, newOwner) => rpc('transfer_business_ownership', { bid, new_owner: newOwner })
export const adminSetOwner = (tid, email) => rpc('admin_set_listing_owner', { tid, member_email: email })

// ---------- alerts ----------
export async function fetchAlerts(limit = 50) {
  if (!hasSupabase) return []
  const { data, error } = await supabase.from('notifications').select('*')
    .order('created_at', { ascending: false }).limit(limit)
  return error ? [] : data || []
}
export async function countUnread() {
  if (!hasSupabase) return 0
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null)
  return error ? 0 : count || 0
}
export async function markRead(ids) {
  need()
  if (!ids?.length) return
  unwrap(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids))
}
export async function deleteAlert(id) {
  need()
  unwrap(await supabase.from('notifications').delete().eq('id', id))
}

// ---------- preferences ----------
// Alert types. `channels` lists what each can use; absent switch = on.
export const ALERT_TYPES = [
  { key: 'listing_updates', label: 'My listing', desc: 'When your listing is approved or needs attention.', channels: ['site', 'email', 'push'] },
  { key: 'join_requests', label: 'Join requests', desc: 'When someone asks to join a business you own or manage.', channels: ['site', 'email', 'push'] },
  { key: 'join_decisions', label: 'My business requests', desc: 'When a business approves or declines your request, or makes you owner.', channels: ['site', 'email', 'push'] },
  { key: 'account', label: 'Membership', desc: 'When your membership is approved.', channels: ['site', 'email', 'push'] },
  { key: 'new_members', label: 'New in the directory', desc: 'When a new person or business joins the directory.', channels: ['site', 'email', 'push'] },
  { key: 'newsletter', label: 'Community news', desc: 'Occasional emails about events and community updates.', channels: ['email'] },
  { key: 'admin_alerts', label: 'Admin: items waiting for you', desc: 'New members and listings waiting for approval.', channels: ['site', 'email', 'push'], adminOnly: true },
]
export const CHANNELS = [
  { key: 'site', label: 'On the site', live: true },
  { key: 'email', label: 'Email', live: false, note: 'Starts once email sending is set up' },
  { key: 'push', label: 'Phone', live: false, note: 'Coming soon — install SabraTech on your phone to get these' },
]
export const prefOn = (notify, type, channel) => notify?.[type]?.[channel] !== false

export async function saveNotify(userId, notify) {
  need()
  unwrap(await supabase.from('profiles').update({ notify }).eq('id', userId))
}
export async function saveFullName(userId, fullName) {
  need()
  unwrap(await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId))
  try { await supabase.auth.updateUser({ data: { name: fullName } }) } catch { /* login name is cosmetic */ }
}

// ---------- password + account ----------
const betterAuth = () => supabase?.auth?.getBetterAuthInstance?.()

export async function changePassword(currentPassword, newPassword) {
  need()
  const ba = betterAuth()
  if (!ba?.changePassword) throw new Error('Password change is not available right now.')
  const res = await ba.changePassword({ currentPassword, newPassword, revokeOtherSessions: false })
  if (res?.error) {
    const m = res.error.message || ''
    throw new Error(/invalid|incorrect/i.test(m) ? 'Your current password is not correct.' : m || 'Could not change the password.')
  }
}

export const deleteMyAccount = () => rpc('delete_my_account')
