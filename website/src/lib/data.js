import { supabase, hasSupabase } from './supabase'
import localBusinesses from '../data/businesses.json'

export const DEFAULT_CATEGORIES = [
  'אוכל ומאפים','אירועים','ארגון וסדר','בריאות וטיפול','חינוך והדרכה',
  'חיות מחמד','טיפוח ויופי','נדל"ן ומשכנתאות','ספורט וכושר','עיצוב פנים',
  'עסקים ושיווק','צילום','תכשיטים ומתנות','אחר',
]

export const CATEGORY_ICONS = {
  'אוכל ומאפים':'🍪','אירועים':'🎉','ארגון וסדר':'🧺','בריאות וטיפול':'🌿',
  'חינוך והדרכה':'📚','חיות מחמד':'🐾','טיפוח ויופי':'💆‍♀️','נדל"ן ומשכנתאות':'🏠',
  'ספורט וכושר':'💪','עיצוב פנים':'🛋️','עסקים ושיווק':'📈','צילום':'📸',
  'תכשיטים ומתנות':'💎','אחר':'✨',
}

export async function fetchBusinesses() {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('businesses').select('*').eq('published', true).order('name')
    if (!error && data) return data
  }
  return localBusinesses.filter(b => b.published)
}

export async function fetchBusiness(id) {
  const all = await fetchBusinesses()
  return all.find(b => String(b.id) === String(id))
}

export async function submitJoinForm(payload) {
  if (hasSupabase) {
    const { error } = await supabase.from('submissions').insert([payload])
    if (error) throw error
    return { via: 'db' }
  }
  const body = Object.entries(payload).map(([k, v]) => `${k}: ${v || '-'}`).join('\n')
  window.location.href = `mailto:noabet@gmail.com?subject=${encodeURIComponent('הצטרפות חדשה — עצמאיות באטלנטה')}&body=${encodeURIComponent(body)}`
  return { via: 'mailto' }
}

export const CATEGORIES = DEFAULT_CATEGORIES

export async function fetchCategories() {
  if (hasSupabase) {
    const { data, error } = await supabase.from('categories').select('name').order('name')
    if (!error && data && data.length) {
      const names = data.map(c => c.name).filter(n => n !== 'אחר')
      if (data.some(c => c.name === 'אחר')) names.push('אחר')
      return names
    }
  }
  return DEFAULT_CATEGORIES
}

export const DEFAULT_CONTENT = {
  discounts_subtitle: 'פשוט תגידי שהגעת מ״עצמאיות באטלנטה״.',
  about_quote: 'כעצמאיות ובעלות עסקים קטנים אנו לעיתים קרובות מרגישות לבד מול העולם.',
  about_body: 'קהילת עצמאיות באטלנטה נוצרה על מנת להעניק מרחב משותף לנשות הקהילה הישראלית של אטלנטה והסביבה. במרחב הזה נשים עצמאיות ובעלות עסקים קטנים יכולות ליצור ולהיחשף לתכנים איכותיים, מפגשים ואירועים, שיתופי פעולה עסקיים, ועוד מגוון פעילויות.',
  about_closing: 'מהקהילה שלנו תצמח אהבה וחוכמה, ויחד נגדל 🔆',
}

export async function fetchContent() {
  const merged = { ...DEFAULT_CONTENT }
  if (hasSupabase) {
    const { data, error } = await supabase.from('site_content').select('*')
    if (!error && data) for (const row of data) if (row.value) merged[row.key] = row.value
  }
  return merged
}
