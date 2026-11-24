# Dito Erfana — Portfolio V2 · Galaxy edition

Personal developer portfolio. **Turning Ideas Into Digital Experiences.**
Static site: HTML5, custom CSS, vanilla JavaScript, EmailJS (REST). No build step, no npm, no framework. Deployable to Vercel (or any static host). Portfolio V1 was not modified.

## Directory structure

```
portfolio-v2/
├── index.html                  Home / hero
├── work.html                   Selected projects
├── about.html                  About
├── skills.html                 Skills & technologies
├── journey.html                Journey & experience
├── contact.html                Contact form
├── 404.html                    Custom 404 (root-absolute paths, works at any URL)
├── projects/                   Case-study pages
│   ├── lapanganku.html
│   ├── portfolio-v1.html
│   ├── volibooking.html
│   ├── custom-controller.html       IDEA concept
│   ├── excel-tools.html              IDEA concept
│   ├── universal-website-template.html  Universal Website · IN DEVELOPMENT
│   └── food-ordering-app.html        EXPERIMENTAL
├── assets/
│   ├── css/    main.css (tokens, base) · components.css · galaxy.css (Galaxy layer) · clock.css (Galactic Clock) · animations.css · responsive.css
│   ├── js/     shared-components.js (header, footer, icons) · config.js (YOUR settings) · theme.js · navigation.js · animations.js · contact.js · orbital-clock.js (Galactic Clock) · starfield.js · main.js
│   ├── images/ profile/ · projects/ · gallery/ · social/
│   └── icons/  favicon.svg
├── robots.txt · sitemap.xml
└── README.md · .gitignore
```

## Local testing

Open any page directly, or serve the folder (recommended, mirrors production):

```bash
py -m http.server 8000           # then visit http://localhost:8000
```

## Deployment (Vercel)

1. Push the folder to a Git repository (or use `vercel` CLI from inside it).
2. Import into Vercel. Framework preset: **Other**. Build command: *none*. Output directory: *(root)*.
3. Replace the placeholder domain `https://your-domain.example` everywhere (canonical, Open Graph, sitemap, robots):
   ```bash
   grep -rl "your-domain.example" . | xargs sed -i 's#https://your-domain.example#https://YOUR-REAL-DOMAIN#g'
   ```
4. `404.html` at the root is served automatically by Vercel for unknown URLs.

## EmailJS configuration

The contact form on `contact.html` posts to EmailJS's public REST endpoint (no SDK). Nothing is invented — until you configure it, the form validates and then shows "The contact form isn't connected yet" (it never fakes success).

1. Create an account at emailjs.com, add an **Email Service** (e.g. Gmail) → copy the **Service ID**.
2. Create an **Email Template** → copy the **Template ID**. Use these variables in the template: `{{from_name}}`, `{{first_name}}`, `{{last_name}}`, `{{reply_to}}` (also `{{email}}`), `{{subject}}`, `{{message}}`. Set the template's *To email* to your address and *Reply-To* to `{{reply_to}}`.
3. Account → General → copy the **Public Key**.
4. Edit `assets/js/config.js`:

| Placeholder | Where to find it |
|---|---|
| `EMAILJS_PUBLIC_KEY` | Account → General |
| `EMAILJS_SERVICE_ID` | Email Services |
| `EMAILJS_TEMPLATE_ID` | Email Templates |

5. In EmailJS → Account → Security, restrict allowed domains to your site. Never put a private key in this repo.

Form behaviour: required fields (first name, email, subject, message), email-format check, loading state, duplicate-submit lock, success only after HTTP 200, error state with fallback email, hidden honeypot field (`website`).

## Theme & celestial phases

The site theme is now driven by the **Dual Celestial Clock phase** (see below). `<html data-phase>` (noon · sunrise · sunset · night) controls the sky, clouds and stars; `<html data-theme>` keeps the existing token polarity: **Noon = light** ("Daylight Observatory"), **Sunrise / Sunset / Night = dark** ("Deep Space"). The header sun/moon button is a shortcut that switches to Manual mode and jumps to Night or Noon. The old `dito-theme` key is no longer used.

Fonts (Google Fonts): Sora (headings), DM Sans (body), JetBrains Mono (labels/telemetry). Icons stay inline SVG. No framework, no Tailwind, no build step.

## Dual Celestial Clock (home page)

| File | Role |
|---|---|
| `assets/js/celestial-core.js` | Loaded in `<head>` on every page. **Phase schedule (`SCHEDULE`)**, phase metadata, detection, preference storage, first-paint boot. |
| `assets/js/celestial-phase.js` | Controller: Automatic / Manual, boundary timer, request queue. No animation. |
| `assets/js/celestial-transition.js` | Sunrise/Sunset choreography as a pure function of time (`sample`) + runner. All timings in `TIMING`. |
| `assets/js/orbital-clock.js` | Clock maths (`GalacticClockMath`), digits, indicators, Sun/Moon poses, presenter. |
| `assets/js/celestial-controls.js` | Automatic/Manual + Noon/Sunrise/Sunset/Night selector beneath the clock. |
| `assets/js/celestial-sky.js`, `assets/css/celestial.css` | Sky gradients, clouds, rays, particles, phase tokens, selector styles. |
| `assets/images/clock/planet.webp` | Ringed Planet (minutes) from the Stitch prototype. |

**Changing the schedule:** edit `SCHEDULE` at the top of `celestial-core.js` (24-hour `"HH:MM"` start times; default Sunrise 05:00, Noon 07:00, Sunset 16:00, Night 19:00). Nothing else holds time boundaries. `CLOCK.hourZeroAt` there sets which hour is at the top of Earth's ring (0 = midnight, 12 = noon).

| Body | Represents | One revolution |
|---|---|---|
| Sun (day) / Moon (night) | digital local time `HH:MM:SS` | — |
| Asteroid | seconds (with milliseconds) | 60 s |
| Planet | minutes (with fractional seconds) | 60 min |
| Earth | hours (with fractional minutes) | **24 h** |

**Modes.** *Automatic* (default) follows local time; *Manual* lets the visitor pick a phase. Stored in `localStorage` key `dito-celestial` as `{mode:"auto"}` or `{mode:"manual",phase}`; the phase is only ever read in Manual mode. Without storage the choice lasts for the visit.

**Transitions** (~7.4 s; Moon → Sun at Sunrise, Sun → Moon at Sunset): indicators fade → outgoing body rotates, shrinks, exits right → incoming body enters from the left, grows, rotates and settles → indicators return. Sunrise → Noon and Sunset → Night keep the same body, so only the sky cross-fades. `prefers-reduced-motion` uses a ~1.5 s opacity-only version and disables drifting clouds/particles.

All indicators read one fresh `new Date()` per update (never accumulated), so nothing drifts. Animation pauses when the tab is hidden or the clock is off-screen; the star canvas stops entirely at Noon. `window.GalacticClockMath.angles(date)` and `window.CelestialTransition.sample(kind, ms)` expose the pure maths for testing.

## Optimized images

`work.html` loads WebP copies in `assets/images/projects/optimized/` (about 300 KB total instead of about 6.3 MB). **The original PNGs are untouched** and remain the sources. To replace one, overwrite the original, then regenerate its copy: `python3 tools/optimize-images.py assets/images/projects/<name>.png` (needs Pillow), or just overwrite the `.webp` directly.

## ASSET-MANAGEMENT

All images live under `assets/images/`. **To replace any asset, save your file with the exact same filename and path** — no code changes needed. If a file is missing, the page shows a labelled CSS fallback instead of a broken image. Images are never Base64-embedded. Keep the aspect ratio listed below so layouts don't shift (images use `object-fit: cover`). Compress to roughly < 300 KB each (JPG/WebP-quality 80).

To use a different format (e.g. `.webp`), replace the filename in the HTML `src` (search for the old name).

| Asset filename | Purpose | Recommended size | Aspect ratio | Replacement |
|---|---|---|---|---|
| `profile/dito-profile-portrait.png` | About-section identity portrait artwork | 768 × 1365 | 9:16 | Owner-provided stylized silhouette artwork. |
| `projects/lapanganku-thumbnail.png` (shown via `optimized/lapanganku-thumbnail.webp`) | Featured LapanganKu card on Work | 1600 × 1000 | 16:10 | Replace with an approved project image. |
| `projects/lapanganku-hero.jpg` | LapanganKu case-study hero | 1920 × 1080 | 16:9 | **Placeholder** — overwrite. |
| `projects/portfolio-v1-thumbnail.png` | Portfolio V1 card | 1367 × 768 | 16:9 | Owner-provided screenshot of the Portfolio V1 home page. |
| `projects/portfolio-v1-hero.jpg` | Portfolio V1 hero | 1920 × 1080 | 16:9 | **Placeholder** — overwrite. |
| `projects/custom-controller-thumbnail.png` (shown via `optimized/…webp`) | Custom Controller IDEA card on Work | 1600 × 1000 | 16:10 | Replace with user-provided artwork; do not present it as a product screenshot. |
| `projects/excel-tools-thumbnail.png` (shown via `optimized/…webp`) | Excel Tools IDEA card on Work | 1600 × 1000 | 16:10 | Replace with user-provided artwork; do not present it as a product screenshot. |
| `projects/universal-website.png` | Universal Website card and detail page | 1365 × 768 | 16:9 | Owner-provided conceptual artwork; not a screenshot of completed functionality. |
| `projects/food-ordering-app-screenshot.png` | Food Ordering App card and detail page | 1365 × 768 | 16:9 | Owner-provided concept visual; mockup branding and completion label are not project identity or status claims. |
| `gallery/volibooking-home-screenshot.png` | VoliBooking card and case-study hero (**real V1 asset `image.png`**) | 1919 × 1079 | 16:9 | Historical project screenshot. |
| `gallery/lapanganku-screenshot-01-booking-flow.jpg` | LapanganKu gallery #1 (full width) | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `gallery/lapanganku-screenshot-02-vendor-dashboard.jpg` | LapanganKu gallery #2 | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `gallery/lapanganku-screenshot-03-superadmin-panel.jpg` | LapanganKu gallery #3 | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `gallery/portfolio-v1-screenshot-01-home.jpg` | Portfolio V1 gallery #1 | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `gallery/portfolio-v1-screenshot-02-projects.jpg` | Portfolio V1 gallery #2 | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `social/og-cover.jpg` | Open Graph / social share image | 1200 × 630 | 1.91:1 | **Placeholder** — overwrite with a branded card. |
| `../icons/favicon.svg` (`assets/icons/`) | Browser tab icon | vector | 1:1 | Overwrite file. |

Alt text lives in the HTML next to each `<img>`; update it when you swap a placeholder for a real screenshot (the placeholder alt text says "Placeholder for…").

## Content to review before publishing

I did not invent personal data, but some copy had to be drafted from V1. Please check:

- **GitHub URL** — V1 used two different handles: `github.com/ditoerfana` (footer) and `github.com/erfara-dev` (contact page). V2 uses `erfara-dev`. Search `erfara-dev` to change it.
- **Phone number** — V1 listed `+62 859-1838-93590` (one digit too many). It is intentionally **not** shown in V2.
- **VoliBooking** is the Class XI single-vendor concept and predecessor to LapanganKu; LapanganKu is a substantially different multivendor platform with distinct features and workflows.
- **Education** details on About and Journey are based on the confirmed school, programme, grade and academic year; no extra milestone dates are inferred.
- **VoliBooking source code** is no longer available. Its case study is limited to confirmed history, single-vendor architecture, PHPMailer focus and technologies; no unverified implementation details are inferred.
- **Custom Controller** and **Excel Tools** are concept-only projects marked `IDEA`; their planned features are not claims of implementation.
- **Universal Website** is in development: Core extraction and BOOK are underway; BUY, BOTH, file-based customization, installer and package builder are planned or not yet implemented as labelled on its detail page.
- **Food Ordering App** is an experimental, mobile-focused customer interface designed with Google Stitch and developed with React and Vite using Google AI Studio. Its described scope is not a claim of verified backend behavior or production functionality.
- **Case-study text** (problem, challenges, lessons) is a first draft grounded in V1's own wording; make it yours.
- Feature statuses: LapanganKu payments and deployment are marked **Not claimed**.
- Site language is English (V1 was Indonesian).
- Contact form `Last name` is optional (as in V1).
- Fonts load from Google Fonts (Sora, DM Sans, JetBrains Mono); icons are inline SVG.
- **Placeholder artwork** (Portfolio V1 hero, gallery placeholders, and `og-cover.jpg`) remains in place; the Work-card thumbnail is the owner-provided Portfolio V1 screenshot.
- **Galaxy design vs. content:** the Stitch mock-ups contained invented details (Vue/Tailwind claims, mastery/commit percentages, uptime metrics, locations, another email address, different project statuses). None were carried over; all copy, statuses, tech tags and contact details come from V2.
