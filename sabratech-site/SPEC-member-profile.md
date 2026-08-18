# SPEC — My Profile (member self-service)

Decisions locked by Noa 2026-07-30. A new session should read this file plus
`sabratech-fix-2026-07-30.sql` and build from it. Do not re-interrogate Noa on
anything already settled here.

---

## The gap this closes

Today there is **no link between a login and a directory listing**. `profiles`
holds auth users, `talents` holds listings, and `talents` has no owner column.
Members cannot edit their own entry — only Noa can, via `/admin`.

## Ownership model — DECIDED: auto-match on email

When a member signs up, if their auth email matches `talents.email`
(case-insensitive, trimmed), they own that listing. No claims queue, no manual
assignment.

Add `talents.owner_id uuid references auth.users(id)`.

Three places it gets set:
1. **Backfill** — one-time UPDATE joining `talents.email` to `auth.users.email`.
2. **On signup** — extend `handle_new_user()` to also stamp `owner_id` on any
   matching talent row.
3. **On approval** — when Noa approves a listing in Admin, re-run the match, in
   case the person signed up before their listing existed.

**Known hole Noa accepted:** someone who applies with a work email but registers
with Gmail will not match. They stay unlinked until Noa sets `owner_id` by hand.
Admin needs a small "owner" field on the talent editor for exactly this. Build it.

**RLS required** — members may update ONLY their own row, and must NOT be able to
change moderation fields. Deny `status`, `published`, `owner_id` from the member
update path (column grants, or a BEFORE UPDATE trigger that reverts them when
`auth.uid() is not null and not is_admin()` — mirror the existing
`protect_profile_fields()` pattern in `sabratech-auth.sql`).

## Notification settings — DECIDED: all four, and make it extensible

Noa explicitly said "maybe additional things in the future", so do **not** create
four boolean columns. Use a single `jsonb` prefs column with defaults, so adding
a fifth type is a UI change and not a migration.

`profiles.notify jsonb not null default '{}'::jsonb`

Keys, all defaulting to true when absent:
| key | meaning | status |
|---|---|---|
| `contacted` | someone messaged me through the site | **blocked** — member-to-member messaging does not exist yet. Render the toggle disabled with a "coming soon" note, or hide it until messaging ships. Do not fake it. |
| `new_members` | digest of newly approved individuals/startups | needs a cron or a scheduled Vercel function |
| `newsletter` | opt-in for community emails Noa sends manually | just a flag; Noa exports the list |
| `listing_approved` | transactional, when Noa approves/updates their listing | easiest — fires from the existing Admin approve action |

Ship order: `listing_approved` first (real, transactional, easy), then
`newsletter` (flag only), then `new_members` (needs scheduling), then
`contacted` (needs messaging built first).

All of these need Resend working. See Pass C below.

## The /profile page

Route `/profile`, wrapped in `<AuthGate>`.

Two sections:
1. **My listing** — reuse the Apply form's field set. If `owner_id` matches no
   row, show an empty state pointing at `/apply` instead of a broken form.
   Respect the individual/startup split: individuals edit `first_name` /
   `last_name` (never `name` — the `talents_sync_name_trg` trigger overwrites it,
   and a visible `name` box makes saves look broken). Startups edit `name`.
2. **Notifications** — toggles bound to `profiles.notify`.

## Header menu

`Layout.jsx:49` currently renders `memberName` as a plain `<span>`. Convert to a
dropdown: **My Profile** · **Admin** (only when `isAdmin`) · **Log out**.
Mobile equivalent at `Layout.jsx:77`. Needs Escape-to-close and click-outside —
the existing modals lack both, don't copy that mistake.

`memberName` falls back to the raw email when `profiles.full_name` is empty,
which is why Noa's header shows an email. Once listings are linked, prefer the
talent's `first_name`.

---

## Also queued, not part of this spec

**PWA / install on mobile** — manifest.json, icon set from the existing favicon
(fav2, cyan square + white cactus), service worker, and a custom install prompt.
Independent of everything above; can ship on its own.

**Pass C — Resend.** Blocked on Noa creating the account and API key. Then set
Vercel env vars `RESEND_API_KEY`, `CONTACT_FROM`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`. Resend cannot send from `sabratech.vercel.app` —
use `onboarding@resend.dev` until `sabratech.ai` is bought and DNS-verified.
Every notification above depends on this landing first.

## House rules that bite on this feature

- Noa deploys, not Claude — Cowork's classifier blocks `vercel deploy`.
  `cd /d "...\sabratech-site"` then `set NODE_OPTIONS=--use-system-ca` then
  `vercel deploy --prod --yes`, in **cmd**, not PowerShell.
- SQL goes in a **file in the repo**, never pasted into chat. A prior session
  pasted `sabratech-admins.sql` into chat, it was never run, and it locked Noa
  out of her own site for days.
- `site_content` rows override `DEFAULT_CONTENT` in `data.js`. Editing the JS
  default alone will not change what visitors see.
- Supabase's "destructive operation" warning on these files is a false positive
  from `drop policy/trigger if exists` + immediate recreate. Say so plainly.
