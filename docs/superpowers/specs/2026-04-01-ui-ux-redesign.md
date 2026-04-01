# Gateway to Oman — UI/UX Redesign Spec

## Overview

Redesign the landing page and polish the admin dashboard using Trust & Authority + Classic Elegant style, guided by UI/UX Pro Max recommendations. Integrate premium Oman photography, the official logo, and upgrade typography to Playfair Display (headings) + Inter (body). Fix chat widget leaking into admin routes.

## Design System

### Style: Trust & Authority + Classic Elegant

Professional, premium consulting aesthetic. Clean surfaces, elegant typography contrast, gold accent on navy/white foundations. No gimmicks — the photos and content do the work.

### Typography

| Role | Font | Weights | Source |
|------|------|---------|--------|
| Headings (h1-h3) | Playfair Display | 400, 500, 600, 700 | Google Fonts via `next/font/google` |
| Display numbers (scorecard) | Playfair Display | 700 | Same — exception to heading-only rule |
| Body, UI, labels | Inter | 300, 400, 500, 600, 700 | `next/font/google` (already installed) |

Loading: Use `next/font/google` for both fonts (Next.js optimized, no layout shift, automatic `font-display: swap`).

Tailwind config:
```js
fontFamily: {
  serif: ['var(--font-playfair)', 'serif'],
  sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
}
```

Rules:
- Body text minimum 16px
- Line-height 1.5-1.75 for body, 1.2 for headings
- Headings use `font-serif`, body uses `font-sans`
- Display numbers (scorecard values) use `font-serif font-bold`
- Line length max 75 characters (`max-w-3xl` on text blocks)
- Gold gradient text: `text-transparent bg-clip-text bg-gradient-to-r from-gold to-gold-light`

### Color Palette

Existing brand colors unchanged. Tailwind `theme.extend.colors` already configured:

```js
colors: {
  gold: { DEFAULT: "#C99B3C", light: "#E8C777", dark: "#A67D2E" },
  navy: { DEFAULT: "#1A1A2E", light: "#2A2A4E" },
  teal: { DEFAULT: "#7EBEC5" },
  warm: { white: "#F8F5F0", cream: "#F0EBE1" },
}
```

Usage rules:
| Token | Usage |
|-------|-------|
| `gold` | Primary CTA backgrounds (as gradient with gold-light), accents, active states |
| `gold-light` | Gradient end only — never as standalone hover color. Hover = `gold` with shadow increase |
| `gold-dark` | Gold text on light backgrounds (meets 4.5:1 WCAG AA) |
| `navy` | Headings, hero/dark section overlays, admin sidebar, footer |
| `teal` | Secondary data viz, supporting badges, secondary accent |
| `warm-white` | Page background |
| `warm-cream` | Card alt backgrounds, form backgrounds |

Additional semantic CSS variables (in globals.css):
```css
:root {
  --color-text-secondary: #64748B;
  --color-text-muted: #94A3B8;
  --color-border: #E5E7EB;
  --color-destructive: #DC2626;
}
```

### Global Border Radius

| Element | Radius |
|---------|--------|
| Cards, image containers, modals | `rounded-xl` (12px) |
| Buttons, inputs, badges | `rounded-lg` (8px) |
| Avatars, small indicators | `rounded-full` |

Applies to both landing page and admin dashboard.

### Effects & Animation

| Effect | Spec | When |
|--------|------|------|
| Scroll reveal | opacity 0→1, translateY 30→0, 600ms ease-out, stagger children by 50ms | All sections on scroll into view |
| Parallax | `next/image` with `fill` + `object-cover`, container has `overflow-hidden`, image translateY at 0.3x scroll speed via Framer Motion `useScroll`+`useTransform` | Hero image, Contact CTA image |
| Card hover | translateY -4px, `shadow-md` → `shadow-xl`, 200ms ease-out | All clickable cards |
| Gold gradient bg | `bg-gradient-to-r from-gold to-gold-light` | CTA buttons, accent bars |
| Gold gradient text | `text-transparent bg-clip-text bg-gradient-to-r from-gold to-gold-light` | "Oman" in hero H1, "Oman Opportunity" in CTA H2 |
| Image overlay (full-bleed) | `bg-gradient-to-t from-navy/80 via-navy/50 to-navy/20` — overlay covers full image ensuring text readability at center and bottom | Hero, Contact CTA |
| Glass effect (Track Record) | `bg-white/15 backdrop-blur-md border border-white/20 rounded-xl` | Stat counter cards on dark bg |
| Counter animation | `useMotionValue` + `animate` from 0 to target, 2s duration, trigger on `useInView` | Track Record numbers |
| 3D tilt (Who We Help) | Framer Motion `whileHover={{ rotateY: 5, rotateX: -5, scale: 1.02 }}` with `transformPerspective: 1000` — already exists in `Card` component with `hover3d` prop | Segment cards |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` — disable all animations, show content immediately | Global |

### Z-Index Scale

| Layer | Z-Index |
|-------|---------|
| Page content | 0 |
| Sticky section headers | 10 |
| Navbar | 40 |
| Chat widget | 45 |
| Modals/overlays | 50 |

### Icons

- Heroicons (outline style, 1.5px stroke) via inline SVG
- No emojis as icons anywhere
- 24px for standard inline, 20px for compact contexts, 32px for feature highlights

### Contained Image Definition

"Contained image" throughout this spec means:
- `next/image` with `fill` mode inside a fixed-dimension container
- Container: `relative overflow-hidden rounded-xl`
- `object-cover` for cropping
- Fixed height: `h-64 md:h-80 lg:h-96` (scales with breakpoint)
- On mobile (< 768px): full-width, stacks above or below text content
- On desktop (>= 768px): sits in a grid column alongside text

## Landing Page Redesign

### Global Elements

**Navbar (NEW):**
- Fixed top, z-40
- Hero state: transparent background, white logo + nav text
- Scrolled state (after 80px scroll): white background, `shadow-sm`, navy text, gold logo
- Transition: 300ms ease background-color and shadow
- Layout: `max-w-7xl mx-auto px-6`, flex between logo and nav
- Logo: `Logo.png` at height 36px (auto width)
- Nav links (desktop): Why Oman, Services, Opportunities, About — anchor links to sections
- CTA button (desktop): "Get Started" — gold gradient, `rounded-lg`, links to contact section
- Mobile (< 768px): hamburger icon (Heroicon `Bars3`), opens drawer from right
- Mobile drawer: full-height, white bg, slide-in from right with Framer Motion, backdrop overlay `bg-black/50`, close on X button or tap outside
- Active section highlighted via Intersection Observer

**Footer (NEW):**
- Navy background, white/gold text
- 4-column grid on desktop, stacked on mobile
- Col 1: Logo (white) + tagline "Your Strategic Bridge to Opportunity"
- Col 2: Quick links — Why Oman, Services, Opportunities, About
- Col 3: Contact — Email: azizi@alazizigroup.com, Phone (if provided)
- Col 4: "Back to top" button with up-arrow Heroicon
- Bottom bar: "© 2026 Gateway to Oman. All rights reserved." centered, text-sm text-white/50
- No social links (not provided — omit rather than guess)

### Section 1: Hero

- **Layout:** Full-viewport height (`min-h-dvh`), full-bleed image
- **Image:** `public/images/hero.jpg` — `next/image` with `fill`, `priority`, `object-cover`, `sizes="100vw"`
- **Overlay:** `absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/50 to-navy/20` — ensures text readable across center
- **Parallax:** Wrap image in container with `overflow-hidden`, use Framer Motion `useScroll`/`useTransform` to translateY image at 0.3x
- **Content (centered, z-10, over overlay):**
  - H1: "Your Strategic Bridge to Opportunity in Oman" — `font-serif text-5xl md:text-7xl font-bold text-white leading-tight`
  - "Oman" rendered as gold gradient text: `text-transparent bg-clip-text bg-gradient-to-r from-gold to-gold-light`
  - Subtitle: "Strategic advisory for entrepreneurs, investors, professionals, and families" — `font-sans text-lg md:text-xl text-white/80 mt-4 max-w-2xl mx-auto`
  - CTA: "Explore Your Opportunity" — `Button variant="gold" size="lg"`, `mt-8`
- **Scroll indicator:** Bouncing chevron-down Heroicon, `text-white/50`, `animate-bounce`, bottom-8
- **No logo in hero** — logo is in the navbar which sits over the hero
- **No quote** — moved to Founder Mission

### Section 2: Why Oman

- **Background:** White (`bg-white`)
- **Layout:** `max-w-7xl mx-auto px-6 py-24`, grid `lg:grid-cols-2 gap-12 items-center`
- **Left column (text):**
  - Eyebrow: "WHY OMAN" — `text-gold-dark uppercase tracking-[0.2em] font-sans text-sm font-semibold`
  - H2: "The Gulf's Best-Kept Secret" — `font-serif text-3xl md:text-4xl font-bold text-navy mt-3`
  - 4 fact rows, each: `flex items-start gap-4 mt-6`
    - Gold Heroicon (24px): `ShieldCheckIcon`, `BuildingOffice2Icon`, `GlobeAltIcon`, `HeartIcon`
    - Bold stat + supporting text:
      - "0% Corporate Tax" — for the first 5 years
      - "100% Foreign Ownership" — fully permitted across sectors
      - "Gateway to 2B Consumers" — 2-hour flight to GCC, East Africa, South Asia
      - "Stable & Family-Friendly" — political neutrality, safety, affordability
- **Right column:** Contained image — `oman-coastline.jpg`, `h-64 md:h-80 lg:h-[28rem]`, rounded-xl
- **Mobile:** Image stacks above text block

### Section 3: Sectors

- **Background:** Warm White (`bg-warm-white`)
- **Layout:** `max-w-7xl mx-auto px-6 py-24`, centered heading, then `lg:grid-cols-3 gap-8`
- **Content:**
  - Eyebrow + H2: "SECTORS" / "Thriving Industries" — centered
  - Grid: 2 columns for pill cloud, 1 column for contained image `oman-modern-arch.jpg` (`h-64 lg:h-80`)
  - Pill cloud: existing animated pills, add `hover:scale-105 transition-transform cursor-default`
  - Pills: Tourism, Real Estate, Fintech, Logistics, F&B, Healthcare, Education, Franchising, Tech
- **Mobile:** Image above, pills below in a wrap grid

### Section 4: Track Record

- **Background:** Relative container with background image `oman-fort-mountains.jpg`
- **Image:** `next/image` with `fill`, `object-cover`, `sizes="100vw"`
- **Overlay:** `absolute inset-0 bg-navy/75`
- **Layout:** `relative z-10 max-w-7xl mx-auto px-6 py-24 text-center`
- **Content:**
  - H2: "26+ Years of Trusted Experience" — `font-serif text-3xl md:text-4xl font-bold text-white`
  - Subtitle: "Deep roots in Oman's telecom and legal sectors" — `text-white/70 mt-2`
  - Stats grid: `grid grid-cols-2 md:grid-cols-4 gap-6 mt-12`
  - Each stat card: glass effect (`bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-6`)
    - Number: `font-serif text-4xl font-bold text-gold` — animated counter
    - Label: `text-white/80 text-sm mt-1`
    - Stats: "26+" Years Experience, "100+" Clients Served, "50+" Businesses Established, "OMR 200K+" Investments Facilitated

### Section 5: Who We Help

- **Background:** White
- **Layout:** `max-w-7xl mx-auto px-6 py-24`
- **Content:**
  - Eyebrow + H2 centered: "WHO WE HELP" / "Your Journey, Our Expertise"
  - Contained image: `oman-opera-house.jpg` — full-width, `h-48 md:h-64`, rounded-xl, `mt-4 mb-12`
  - 4 segment cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`
  - Each card uses `Card` component with `hover3d` prop:
    - Icon (32px Heroicon): `RocketLaunchIcon` (Entrepreneur), `BanknotesIcon` (Investor), `BriefcaseIcon` (Professional), `HomeModernIcon` (Retiree)
    - Title: `font-serif text-lg font-semibold text-navy`
    - Description:
      - Entrepreneur: "Launch or expand your business in Oman's growing economy"
      - Investor: "Discover high-return opportunities in real estate, fintech, and more"
      - Professional: "Build your career with Oman's welcoming visa pathways"
      - Retiree: "Enjoy affordable, safe, family-friendly living in a beautiful country"

### Section 6: Core Services

- **Background:** Warm White
- **Layout:** `max-w-7xl mx-auto px-6 py-24`, `lg:grid-cols-2 gap-12 items-center`
- **Left column:** Contained image `oman-mosque-flowers.jpg`, `h-64 lg:h-[28rem]`, rounded-xl
- **Right column:**
  - Eyebrow + H2: "OUR SERVICES" / "How We Work"
  - 4 numbered steps, each: `flex items-start gap-4 mt-8`
    - Gold circle number badge: `w-10 h-10 rounded-full gold-gradient text-white flex items-center justify-center font-serif font-bold`
    - Step text:
      1. **Discovery Call** — "We learn about your goals, timeline, and budget in a free consultation"
      2. **Market Exploration** — "We prepare a tailored briefing on opportunities matching your profile"
      3. **On-Ground Support** — "We arrange your visit, meetings, and introductions in Oman"
      4. **Setup & Launch** — "We handle licensing, banking, visa, and everything to get you operational"
  - Scroll reveal: steps stagger in, odd from left, even from right (slideLeft/slideRight alternating)
- **Mobile:** Image above, steps below

### Section 7: Opportunities

- **Background:** White
- **Layout:** `max-w-7xl mx-auto px-6 py-24`
- **Content:**
  - Eyebrow + H2 centered: "OPPORTUNITIES" / "Invest in Oman's Future"
  - Full-width contained image: `oman-cliff-village.jpg`, `h-48 md:h-64`, rounded-xl, `mt-4 mb-12`
  - 6 cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
  - Each card: white bg, gold top border, `rounded-xl p-6`, hover translateY -4px + shadow
    1. **Real Estate** — "Investment property from OMR 50K with residency pathway"
    2. **Franchise** — "Established brands seeking Oman market entry from OMR 2,500"
    3. **Digital Banking** — "CBO digital banking licenses now available for fintech innovators"
    4. **Tourism** — "Boutique hospitality in Oman's emerging tourism sector"
    5. **F&B** — "Restaurant and food brand opportunities in a growing market"
    6. **Tech & Startups** — "Oman's tech ecosystem with government-backed incubators"
  - Each card: Heroicon (24px gold), title (`font-serif font-semibold text-navy`), description (`text-sm text-gray-600`), "Learn more →" link (`text-gold-dark text-sm font-medium hover:text-gold`)

### Section 8: Why Work With Us

- **Background:** Warm White
- **Layout:** `max-w-7xl mx-auto px-6 py-24`, `lg:grid-cols-2 gap-12 items-center`
- **Left column (text):**
  - Eyebrow + H2: "WHY US" / "Your Trusted Partner"
  - 4 trust items, each: `flex items-start gap-4 mt-6`
    - Heroicon (24px gold): `ShieldCheckIcon`, `ClockIcon`, `UserGroupIcon`, `StarIcon`
    - Bold title + description:
      1. **26+ Years on the Ground** — "Not consultants who Google. Real experience, real relationships."
      2. **End-to-End Support** — "From first call to business launch, we're with you every step."
      3. **Trusted Network** — "Direct access to Oman's business, legal, and government circles."
      4. **No Hidden Agendas** — "We succeed when you succeed. Transparent, honest advisory."
- **Right column:** Contained image `oman-archway-minaret.jpg`, `h-64 lg:h-[28rem]`, rounded-xl
- **Mobile:** Image above, text below

### Section 9: Founder Mission

- **Background:** Navy (`bg-navy`)
- **Layout:** `max-w-7xl mx-auto px-6 py-24`, `lg:grid-cols-2 gap-12 items-center`
- **Left column:** Contained image `oman-muttrah-sunset.jpg`, `h-64 lg:h-[28rem]`, rounded-xl
- **Right column:**
  - H2: "A Personal Mission" — `font-serif text-3xl md:text-4xl font-bold text-white`
  - Bio text: `text-white/80 mt-4 leading-relaxed`
  - Content: "With over 26 years navigating Oman's telecom and legal sectors, I've built the relationships and knowledge that open real doors. Gateway to Oman is my way of sharing that access with people who are serious about building something meaningful here."
  - Attribution: "— Ahmed Al-Azizi, Founder" — `text-gold font-semibold mt-4`
  - Quote block: `border-l-4 border-gold pl-4 mt-8`
    - "If you had gone to the people of Oman, they would not have insulted or beaten you." — `text-white/70 italic`
    - "— Prophet Muhammad ﷺ (Sahih Muslim 2544)" — `text-gold/60 text-sm mt-2 not-italic`
- **Mobile:** Image above, text below

### Section 10: Contact CTA

- **Background:** Relative container with background image `oman-roundabout-aerial.jpg`
- **Image:** `next/image` with `fill`, `object-cover`, `sizes="100vw"`, `loading="lazy"`
- **Overlay:** `absolute inset-0 bg-navy/75`
- **Layout:** `relative z-10 max-w-3xl mx-auto px-6 py-24 text-center`
- **Content:**
  - H2: "Ready to Explore Your Oman Opportunity?" — `font-serif text-3xl md:text-5xl font-bold text-white`
  - "Oman Opportunity" in gold gradient text
  - Subtitle: "Let's have an honest conversation about whether Oman makes sense for YOUR journey." — `text-white/70 text-lg mt-4`
  - Buttons: `flex flex-col sm:flex-row items-center justify-center gap-4 mt-8`
    - "Email Us" — gold gradient button, links to `mailto:azizi@alazizigroup.com`
    - "Book Free Consultation" — white outline button (`border-2 border-white text-white hover:bg-white hover:text-navy`)
  - **No** "No sales pitch. Just truth." — removed per client feedback

## Admin Dashboard Polish

### Changes (Brand Alignment Only)

**Sidebar:**
- Keep current navy sidebar layout
- Add logo at top: `Logo.png` white version, height 28px, within existing header area
- Title "Gateway to Oman": `font-serif`
- Active nav item: replace `bg-gold/20 text-gold` with `border-l-4 border-gold text-gold bg-transparent`

**Scorecard cards:**
- Number values: `font-serif text-3xl font-bold` (up from text-2xl)
- Padding: `p-5` (up from p-4)
- Top border: `border-t-2 border-gold` (thinner, more refined than current border-t-4)

**Chart cards:**
- Headers: `font-serif text-base font-semibold text-navy`
- Card style: `bg-white rounded-xl border border-gray-100 p-5` (add border, remove shadow-sm)

**Tables (Leads page):**
- Header: `bg-navy text-white text-xs uppercase tracking-wider`
- Row hover: `hover:bg-warm-white`

**Settings page:**
- Form sections: wrap in `border border-gray-100 rounded-xl` containers

**General:**
- All h1 page titles: `font-serif`
- Border radius: use global scale (rounded-xl for cards, rounded-lg for inputs)

## Additional Fixes

### Chat Widget — Exclude from Admin

File: `app/layout.tsx` (line 29)

Create a wrapper component `ChatWidgetWrapper` that uses `usePathname()` and only renders `ChatWidget` when pathname does not start with `/admin`. Replace `<ChatWidget />` in layout with `<ChatWidgetWrapper />`.

### Remove "No Sales Pitch" Text

File: `components/landing/ContactCTA.tsx` (line 31)

Remove the `<p className="text-sm text-gray-400 italic">No sales pitch. Just truth.</p>` element.

## Image Assets

All images must be:
- Copied into `public/images/` directory
- Served via `next/image` component with `fill` + `sizes` or explicit `width`/`height`
- Hero image: `priority` prop (above fold)
- All others: default lazy loading
- All images: descriptive `alt` text
- Background images (Track Record, Contact CTA): `next/image` with `fill` + `object-cover` inside relative container, NOT CSS `background-image`

| Source File | Target Path | Section | Alt Text |
|-------------|-------------|---------|----------|
| Logo.png | public/images/logo.png | Navbar, Footer, Admin | Gateway to Oman logo |
| Hero Image.PNG | public/images/hero.jpg | Hero (full-bleed) | Sultan Qaboos Grand Mosque panoramic view |
| katerina-kerdi-*.jpg | public/images/oman-coastline.jpg | Why Oman (contained right) | Oman coastline with boats in turquoise bay |
| IMG_7962.PNG | public/images/oman-fort-mountains.jpg | Track Record (background) | Historic Omani fort surrounded by palm groves |
| IMG_7964.PNG | public/images/oman-cliff-village.jpg | Opportunities (contained header) | Traditional village perched on cliff above teal waters |
| IMG_7965.PNG | public/images/oman-opera-house.jpg | Who We Help (contained header) | Royal Opera House Muscat white marble exterior |
| IMG_7966.JPG.jpeg | public/images/oman-mosque-flowers.jpg | Core Services (contained left) | Sultan Qaboos Grand Mosque dome with bougainvillea |
| IMG_7968.JPG.jpeg | public/images/oman-modern-arch.jpg | Sectors (contained side) | Modern highway arch with golden mosque in Muscat |
| IMG_7969.JPG.jpeg | public/images/oman-roundabout-aerial.jpg | Contact CTA (full-bleed bg) | Aerial view of Muscat clock tower roundabout |
| IMG_7970.JPG.jpeg | public/images/oman-archway-minaret.jpg | Why Work With Us (contained right) | Grand mosque minaret framed through ornate archway |
| IMG_7973.JPG.jpeg | public/images/oman-muttrah-sunset.jpg | Founder Mission (contained left) | Muttrah waterfront at golden sunset |

Unused images (available as alternates):
- `IMG_7963.PNG` (oman-bahla-fort.jpg) — alternate for Track Record or heritage context
- `IMG_7967.JPG.jpeg` (oman-royal-opera.jpg) — alternate for Who We Help
- `IMG_7972.JPG.jpeg` (oman-city-mountains.jpg) — alternate for Sectors or Opportunities

## Responsive Behavior

All sections follow this pattern unless otherwise noted:

| Breakpoint | Behavior |
|------------|----------|
| < 768px (mobile) | Single column stack. Images above text. Full-width contained images. Navbar → hamburger. Cards → 1 column. |
| 768px-1023px (tablet) | 2-column grids. Split sections side by side. Cards → 2 columns. |
| >= 1024px (desktop) | Full layout as described in each section. Cards → 3 or 4 columns. Max-width containers. |
| >= 1440px | Content stays within `max-w-7xl` (1280px), centered. |

## Pre-Delivery Checklist (UI/UX Pro Max)

- [ ] No emojis as icons — use Heroicons SVG
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Color contrast 4.5:1 minimum for all text
- [ ] Focus states visible for keyboard navigation (2-4px ring)
- [ ] `prefers-reduced-motion` respected (all animations disabled)
- [ ] Responsive: tested at 375px, 768px, 1024px, 1440px
- [ ] Touch targets minimum 44x44px
- [ ] All images have descriptive `alt` text
- [ ] No horizontal scroll on any breakpoint
- [ ] `next/image` with `fill`+`sizes` or explicit dimensions
- [ ] Lazy loading on below-fold images, `priority` on hero
- [ ] Fonts loaded via `next/font/google`
- [ ] `scroll-behavior: smooth` on `html`
- [ ] Z-index scale: navbar 40, chat 45, modals 50
- [ ] `rounded-xl` for cards, `rounded-lg` for inputs/buttons globally
- [ ] Chat widget excluded from `/admin/*` routes
