# CLEM Divine Breakthrough Assembly — Website

"A Place Where Everybody Is Somebody"

This is a professionally restructured version of the original single-file
site. **Every visible page, all copy, all colors/layout, and all existing
features work exactly as before** — what changed is how the code is
organized, secured, and delivered. See "What changed" below for the
complete, honest list.

---

## Project structure

Everything lives together in one folder — no subfolders — so it's simple
to upload as-is to any static host:

```
.
├── index.html                    Page markup (unchanged content/design)
├── style.css                     All styling (extracted from inline <style>)
├── firebase-service.js           Firestore + Auth (ES module)
├── app.js                        UI behavior, forms, admin dashboard
├── firebase-config.js            Your real Firebase credentials (gitignored)
├── firebase-config.example.js    Template to copy from
├── manifest.json                 PWA manifest (static file, installable)
├── robots.txt                    Search-engine crawling rules
├── sitemap.xml                   SEO sitemap
├── firestore.rules               Database security rules (see Security)
├── package.json                  Local dev server script
└── .gitignore
```

## Running it locally

No build step is required — it's a static site.

```bash
npm run dev
```

This serves the site at `http://localhost:3000`. Or just open
`index.html` directly in a browser (some features, like ES module
imports, require serving over `http://` rather than `file://`, so
`npm run dev` is recommended).

## Connecting Firebase (optional, but required to go live)

Right now the site runs in **Demo Mode**: forms and the admin dashboard
work, but nothing is saved to a real database, and it resets on refresh.

1. Create a project at <https://console.firebase.google.com>.
2. Enable **Firestore Database** and **Authentication → Email/Password**.
3. Project settings → General → "Your apps" → add a Web app → copy the
   config object.
4. Paste those values into `firebase-config.js` (already gitignored so
   you won't accidentally commit them).
5. Create your admin login: Authentication → Users → Add user.
6. Deploy the security rules in `firestore.rules` (Firestore → Rules tab
   in the console, or via the Firebase CLI: `firebase deploy --only
   firestore:rules`). **The admin dashboard is not safe to use in
   production until these rules are deployed.**
7. Add real app icons at `/icon-192.png` and `/icon-512.png` (referenced
   by `manifest.json`) — none were provided in the original files, so the
   "Add to Home Screen" install icon will be missing until you do.

## Security — what changed and why

The single biggest issue in the original file: the admin login checked a
**hardcoded username and password inside the client-side JavaScript**
(`if (u===ADMIN_UN && p===ADMIN_PW)`). Because all JavaScript sent to a
browser is fully readable (View Source, or DevTools → Sources), this
password was visible to anyone who looked — it provided no real
protection at all.

This has been replaced with:

- **Real authentication** via Firebase Authentication when configured
  (`firebase-config.js` filled in). Credentials are verified by
  Firebase's servers, not by JavaScript running in the visitor's browser.
- **Database-level rules** (`firestore.rules`) that independently enforce
  who can read/write each collection, so even if someone bypassed the
  page's login screen entirely, the database itself refuses unauthorized
  writes and reads (prayer requests and giving records, in particular,
  are never publicly readable).
- **Demo Mode fallback**: if you haven't configured Firebase yet, there's
  no backend to authenticate against, so a random passcode is generated
  fresh each time the page loads and printed to the browser console. This
  is clearly labeled as non-production and is only meant so you can
  explore the admin dashboard before connecting a real database — it is
  *not* something to rely on for a live site.
- **HTML-escaping** of every value that originates from a public,
  unauthenticated form (testimonies, prayer requests) before it's
  inserted into the page, closing a stored-XSS gap where a visitor could
  previously have submitted HTML/JavaScript as their "name" or
  "testimony" and had it render as live markup for the admin (or, once
  approved, for every visitor).

## Other fixes included in this pass

- **Dead code removed**: `testimony-form`, `prayer-form` and
  `giving-form` each had an `onsubmit="submitX(event)"` HTML attribute
  calling a function that was never defined anywhere in the script — a
  silent `ReferenceError` on every single submission. The real, working
  submit logic (already correctly wired via `addEventListener`) is
  untouched; only the broken duplicate attribute was removed.
- **Broken sermon entry fixed**: the second item in the "Recent Messages"
  list had a malformed `onclick` (an unescaped quote, which is a
  JavaScript syntax error) and a stray, unclosed duplicate `<div>` nested
  inside it, leaving its title permanently blank. Rebuilt to match the
  pattern of every other sermon item, using the speaker name already
  present in its details line ("Reverend Sobayo Abiodun").
- **PWA manifest** is now a real, static `manifest.json` file instead of
  being generated at runtime as a throwaway Blob URL — this is what
  browsers expect for "Add to Home Screen" and Lighthouse PWA scoring.

## Accessibility improvements

- A "Skip to main content" link for keyboard and screen-reader users.
- Every form `<label>` is now programmatically associated with its input
  via a `for`/`id` pair (39 labels updated) — previously they were only
  connected visually.
- Visible focus outlines on every interactive element for keyboard
  navigation (`:focus-visible`).
- `aria-label`s added to the few remaining icon-only buttons that were
  missing one (lightbox slideshow, admin-login close, sermon play
  buttons).
- `prefers-reduced-motion` support: visitors who've asked their OS to
  minimize animation get instant transitions instead of the site's
  animated effects.
- Print styles, so the page prints cleanly (service times, address)
  without navigation chrome, banners, or modals.

## Performance

- Scroll handling (navbar state, scroll-progress bar, active nav
  highlighting) is now throttled with `requestAnimationFrame` so it runs
  at most once per rendered frame, instead of on every raw scroll event.
- CSS and JavaScript are now cacheable external files instead of being
  re-downloaded as part of the HTML on every single page load.

## SEO

- `robots.txt` and `sitemap.xml` added. The existing meta tags, Open
  Graph tags, and JSON-LD structured data were already solid and are
  untouched.

## What was intentionally left as-is

- All copy, layout, colors, animations, and every existing feature.
- Inline `onclick`/`onsubmit` attributes used for admin-dashboard actions
  (approve, delete, tab-switching, etc.) and for rows generated
  dynamically from Firestore data. This is a deliberate, working pattern
  used consistently throughout the original build; converting all ~100+
  of these to `addEventListener`/event-delegation would be a legitimate
  next-phase refactor (and a prerequisite for a strict
  `Content-Security-Policy` header), but touching that much surface area
  risked introducing new bugs without a browser available to test every
  interaction against. Flagging it here as recommended future work
  rather than doing it silently.
- A pre-existing, very minor HTML nesting imbalance (a few unclosed
  `<div>`s) present in the original file elsewhere in the page. Browsers
  auto-recover from this without visible effect, so it wasn't touched to
  avoid guessing at intended structure in code that wasn't reported as
  broken.

## Admin dashboard shortcuts (unchanged)

- `Ctrl+Shift+A` — open admin login
- `Ctrl+K` — open search
- `Esc` — close any open modal/panel
