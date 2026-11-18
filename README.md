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
│   ├── software-experiments.html
│   ├── custom-controller.html       IDEA concept
│   ├── excel-tools.html              IDEA concept
│   ├── universal-website-template.html
│   └── restaurant-website.html       DETAILS PENDING
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

## Theme

Two themes built on semantic tokens in `assets/css/main.css`: **Deep Space** (dark, default; from the Stitch "Deep Space Observatory" design) and **Daylight Observatory** (light; designed for this build, since the Stitch export is dark-only). Choice is saved in `localStorage` (`dito-theme`); the OS preference is used only when nothing is saved. `galaxy.css` holds the glass surfaces, header/footer, chips and form skin; it uses tokens only.

Fonts (Google Fonts): Sora (headings), DM Sans (body), JetBrains Mono (labels/telemetry). Icons stay inline SVG. No framework, no Tailwind, no build step.

## Galactic Clock (home page)

`assets/js/orbital-clock.js` + `assets/css/clock.css`, markup in `index.html`.

| Body | Represents | One revolution |
|---|---|---|
| Sun (centre) | digital local time `HH:MM:SS` | — |
| Mercury | seconds (with milliseconds) | 60 s |
| Venus | minutes (with fractional seconds) | 60 min |
| Earth | hours (with fractional minutes) | **24 h** |

All three read one `new Date()` per animation frame (the browser's local clock). Angles are clockwise from 12 o'clock (`θ = fraction × 2π`; `x = cx + r·sin θ`, `y = cy − r·cos θ`), so 00:00:00 puts every planet at the top, 06:00 puts Earth at 3 o'clock and 12:00 at 6 o'clock. Motion is continuous (`requestAnimationFrame`), not once per second.

- The **12h/24h button changes the digital text only**; the orbit maths never reads it.
- Wall-clock time is used on purpose, so planets always match the digits. On a daylight-saving change the wall clock jumps and Earth jumps with it.
- `prefers-reduced-motion`: planets step once per second, corona/glow animations are off. Animation pauses when the tab is hidden or the clock is off-screen, and resumes from fresh absolute time (no drift).
- `window.GalacticClockMath.angles(date)` exposes the pure maths for testing.

## Optimized images

`work.html` loads WebP copies in `assets/images/projects/optimized/` (about 300 KB total instead of about 6.3 MB). **The original PNGs are untouched** and remain the sources. To replace one, overwrite the original, then regenerate its copy: `python3 tools/optimize-images.py assets/images/projects/<name>.png` (needs Pillow), or just overwrite the `.webp` directly.

## ASSET-MANAGEMENT

All images live under `assets/images/`. **To replace any asset, save your file with the exact same filename and path** — no code changes needed. If a file is missing, the page shows a labelled CSS fallback instead of a broken image. Images are never Base64-embedded. Keep the aspect ratio listed below so layouts don't shift (images use `object-fit: cover`). Compress to roughly < 300 KB each (JPG/WebP-quality 80).

To use a different format (e.g. `.webp`), replace the filename in the HTML `src` (search for the old name).

| Asset filename | Purpose | Recommended size | Aspect ratio | Replacement |
|---|---|---|---|---|
| `profile/dito-profile-portrait.jpg` | About-section photo (**your original V1 photo `dito.jpeg`**) | 960 × 1280 | 3:4 | Overwrite file. Swap for any photo you prefer. |
| `projects/lapanganku-thumbnail.png` (shown via `optimized/lapanganku-thumbnail.webp`) | Featured LapanganKu card on Work | 1600 × 1000 | 16:10 | Replace with an approved project image. |
| `projects/lapanganku-hero.jpg` | LapanganKu case-study hero | 1920 × 1080 | 16:9 | **Placeholder** — overwrite. |
| `projects/portfolio-v1-thumbnail.jpg` | Portfolio V1 card | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `projects/portfolio-v1-hero.jpg` | Portfolio V1 hero | 1920 × 1080 | 16:9 | **Placeholder** — overwrite. |
| `projects/custom-controller-thumbnail.png` (shown via `optimized/…webp`) | Custom Controller IDEA card on Work | 1600 × 1000 | 16:10 | Replace with user-provided artwork; do not present it as a product screenshot. |
| `projects/excel-tools-thumbnail.png` (shown via `optimized/…webp`) | Excel Tools IDEA card on Work | 1600 × 1000 | 16:10 | Replace with user-provided artwork; do not present it as a product screenshot. |
| `projects/universal-template-thumbnail.jpg` | Universal Website Template card on Work | 1600 × 1000 | 16:10 | Optional project artwork; do not imply every planned use case is implemented. |
| `projects/restaurant-website-thumbnail.jpg` | Restaurant Website card on Work | 1600 × 1000 | 16:10 | Optional project artwork; details pending, do not use a fabricated screenshot. |
| `gallery/volibooking-home-screenshot.png` | Software Experiments card, hero and gallery (**real V1 asset `image.png`**) | 1919 × 1079 | 16:9 | Overwrite file. |
| `gallery/lapanganku-screenshot-01-booking-flow.jpg` | LapanganKu gallery #1 (full width) | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `gallery/lapanganku-screenshot-02-vendor-dashboard.jpg` | LapanganKu gallery #2 | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `gallery/lapanganku-screenshot-03-superadmin-panel.jpg` | LapanganKu gallery #3 | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `gallery/portfolio-v1-screenshot-01-home.jpg` | Portfolio V1 gallery #1 | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `gallery/portfolio-v1-screenshot-02-projects.jpg` | Portfolio V1 gallery #2 | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `gallery/experiment-dashboard-screenshot.jpg` | Experiments gallery #2 | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `gallery/experiment-company-profile-screenshot.jpg` | Experiments gallery #3 | 1600 × 1000 | 16:10 | **Placeholder** — overwrite. |
| `social/og-cover.jpg` | Open Graph / social share image | 1200 × 630 | 1.91:1 | **Placeholder** — overwrite with a branded card. |
| `../icons/favicon.svg` (`assets/icons/`) | Browser tab icon | vector | 1:1 | Overwrite file. |

Alt text lives in the HTML next to each `<img>`; update it when you swap a placeholder for a real screenshot (the placeholder alt text says "Placeholder for…").

## Content to review before publishing

I did not invent personal data, but some copy had to be drafted from V1. Please check:

- **GitHub URL** — V1 used two different handles: `github.com/ditoerfana` (footer) and `github.com/erfara-dev` (contact page). V2 uses `erfara-dev`. Search `erfara-dev` to change it.
- **Phone number** — V1 listed `+62 859-1838-93590` (one digit too many). It is intentionally **not** shown in V2.
- **LapanganKu tech stack** (PHP, Blade, Tailwind CSS, MySQL) mirrors the VoliBooking project in V1; confirm it matches LapanganKu. Edit in `work.html` and `projects/lapanganku.html`.
- **Education** timeline entry is an explicit placeholder; add your real institution/programme in `journey.html`.
- **Timeline order** (VoliBooking → LapanganKu → Portfolio V1) is a best guess; dates were left out on purpose.
- **Custom Controller** and **Excel Tools** are concept-only projects marked `IDEA`; their planned features are not claims of implementation.
- **Universal Website Template** describes separate booking and ordering directions; its technology stack and individual implementation status have not been provided.
- **Restaurant Website** is marked `DETAILS PENDING`; update its entry and detail page only after reviewing the original project source and information.
- **Case-study text** (problem, challenges, lessons) is a first draft grounded in V1's own wording; make it yours.
- Feature statuses: LapanganKu payments and deployment are marked **Not claimed**.
- Site language is English (V1 was Indonesian).
- Contact form `Last name` is optional (as in V1).
- Fonts load from Google Fonts (Sora, DM Sans, JetBrains Mono); icons are inline SVG.
- **Placeholder artwork** (`portfolio-v1-thumbnail.jpg`, hero, gallery placeholders, `og-cover.jpg`) is still the original orange/charcoal V2 placeholder. It is intentionally left as-is; replace with real images.
- **Galaxy design vs. content:** the Stitch mock-ups contained invented details (Vue/Tailwind claims, mastery/commit percentages, uptime metrics, locations, another email address, different project statuses). None were carried over; all copy, statuses, tech tags and contact details come from V2.
