# Test checklist — run after the next deploy

Everything below needs a browser or a phone, so it waited for you.

## 0. Deploy first

In **cmd** (not PowerShell):

```
cd /d "C:\Local_AI\Claude_Code\peronal\websites\SabraTech\sabratech-site"
set NODE_OPTIONS=--use-system-ca
vercel deploy --prod --yes
```

This one has to be the CLI, not Vercel's Redeploy button — there are new files on
your laptop (icons, manifest, service worker, install prompt) that Vercel has
never seen. Redeploy would rebuild the old code with new settings and you would
swear the PWA work vanished.

---

## 1. Contact form email — Pass C

1. Live site → **Contact us** → submit a real message.
2. Expect: appears in **Admin → Contact**, and an email lands with subject
   **"SabraTech Contact-Us Inquiry"**.
3. **Check spam.** First mail from a new Resend account usually lands there, and
   `onboarding@resend.dev` is a shared address with no sender reputation.

If it saves but no mail arrives, the mail half is broken, not the form. Open
Vercel → Deployments → the live one → Functions → `/api/contact-notify` and read
the log. The route returns a JSON reason on every failure:
`{"skipped":"missing env"}`, `{"skipped":"no admin recipients"}`, or the raw
Resend error text.

## 2. PWA install — Android / Chrome

1. Open the site in Chrome on Android.
2. Within a few seconds a white bar should slide up: **"Add SabraTech to your
   phone"** with an **Install** button.
3. Tap Install → confirm → the cactus icon appears on your home screen.
4. Open it. It should launch with **no browser address bar**.

## 3. PWA install — iPhone / Safari

iOS has no install API at all, so there is no Install button — by design, not a bug.

1. Open the site in **Safari** (not Chrome — iOS Chrome cannot install apps).
2. After ~2.5s the bar appears reading *"Tap the Share button, then Add to Home
   Screen."*
3. Follow it. Confirm the icon looks right on the home screen.

## 4. Dismissal behaviour

1. Tap the **×** on the install bar.
2. Reload. It must not come back.
3. To make it reappear for testing: devtools → Application → Local Storage →
   delete `sabratech_install_dismissed`.

## 5. Service worker sanity — the one that matters

The service worker is the only thing here that can cause a weird, hard-to-explain
bug later, so verify it once:

1. Load the site, then devtools → Application → Service Workers → confirm one is
   **activated and running**.
2. Now the real test: **change a site text in Admin, save, reload the public
   page.** The change must appear immediately. If you see stale content, tell me
   — it means the caching is too aggressive and I will fix `public/sw.js`.
3. Offline check: devtools → Network → Offline → reload. You should get the
   SabraTech shell rather than the dinosaur.

---

## Known-deliberate behaviours, so you do not report them as bugs

- No Install button on iPhone. Apple does not allow one.
- No install bar on desktop Chrome unless it decides the site qualifies; it is
  stricter about desktop and may simply not offer it.
- The bar never reappears once dismissed. That is the point.
- The service worker does not run on `localhost` — it is skipped in dev so it
  cannot shadow the Vite dev server.
