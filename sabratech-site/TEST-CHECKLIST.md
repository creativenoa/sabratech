# SabraTech — test checklist (post-Neon migration)

Updated 2026-08-23. Everything below needs a browser or a phone, so it waited for you.
Deploying is no longer your job — Claude deploys and verifies. Just test.

Status key: [x] = already verified by Claude · [ ] = needs you

---

## 1. Login — the part that was broken twice

Do these in order, they build on each other.

1. [ ] Open https://sabratech.vercel.app and press **Ctrl+Shift+R** once (drops any cached old version).
2. [ ] **Log out, then log back in.** The header must change *instantly* — no manual refresh.
   (This also writes the new, longer-lived login cookie. Old cookies were the fragile kind.)
3. [ ] You should land as an **admin**: Search opens, no "awaiting approval" card, /admin works.
4. [ ] **Close the browser completely, reopen the site.** You should still be logged in.

If step 4 still logs you out: check Chrome → Settings → Privacy and security → Cookies →
"Delete cookies and site data when you close all windows". If that is on, every site logs
you out on restart, not just this one. Turn it off and retest before reporting a bug.

## 2. Contact form email

- [x] **Verified by Claude 2026-08-23** — the route found the admin recipient and Resend
      accepted the message (`{"ok":true,"sent":1}`).
- [ ] Confirm the email actually landed: subject **"SabraTech Contact-Us Inquiry"**.
      **Check spam** — it sends from the shared address `onboarding@resend.dev`, which has
      no sender reputation. Mark it "not spam" so future ones arrive.
- [ ] Submit one through the site's own **Contact us** button and confirm it appears in
      **Admin → Contact** as well as your inbox.

Note: only *approved admins with a profile* receive these. Right now that is you alone.
Once Moran re-registers, she gets them too, automatically.

## 3. Photo upload (new plumbing — files moved to Neon storage)

- [ ] Admin → Directory → open any profile → upload a photo → save → confirm it displays.
- [x] Claude verified the upload path end to end (signed link → upload → public URL) and
      that both existing member photos already serve from Neon.

## 4. PWA install — Android / Chrome

1. [ ] Open the site in Chrome on Android.
2. [ ] Within a few seconds a white bar slides up: **"Add SabraTech to your phone"** + Install.
3. [ ] Tap Install → confirm → the cactus icon appears on your home screen.
4. [ ] Open it — it should launch with **no browser address bar**.

## 5. PWA install — iPhone / Safari

iOS has no install API at all, so there is no Install button — by design, not a bug.

1. [ ] Open the site in **Safari** (not iOS Chrome — it cannot install apps).
2. [ ] After ~2.5s a bar appears: *"Tap the Share button, then Add to Home Screen."*
3. [ ] Follow it, confirm the icon looks right.
4. [ ] Bonus, worth checking: **log in on the iPhone.** Safari is the strictest browser about
      logins, and the migration changed exactly that plumbing.

## 6. Dismissal behaviour

1. [ ] Tap the **×** on the install bar.
2. [ ] Reload — it must not come back.
3. [ ] To make it reappear for testing: devtools → Application → Local Storage → delete
      `sabratech_install_dismissed`.

## 7. Service worker sanity — the one that can bite later

1. [ ] Load the site → devtools → Application → Service Workers → one is **activated and running**.
2. [ ] The real test: **change a site text in Admin, save, reload the public page.** The change
      must appear immediately. Stale content = caching too aggressive, tell Claude.
3. [ ] Offline check: devtools → Network → Offline → reload. You should get the SabraTech
      shell, not the dinosaur.

---

## Known-deliberate behaviours, so you do not report them as bugs

- No Install button on iPhone. Apple does not allow one.
- Desktop Chrome is stricter and may simply never offer the install bar.
- The install bar never reappears once dismissed. That is the point.
- The service worker does not run on `localhost` — skipped in dev on purpose.
- Password-reset emails come from `auth@mail.myneon.app` until sabratech.ai exists.
- The homepage says "0 Israeli startups" because no startup has been added yet — real,
  not a bug.
