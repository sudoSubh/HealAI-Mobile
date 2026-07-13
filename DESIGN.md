# HealAi — Design System (AI Regeneration Spec)

> **Purpose:** Feed this file to any design/codegen AI to regenerate the **total feel and UI** of HealAi while keeping product **workflows identical**.  
> **Product:** HealAi — multilingual AI health companion (patients + caregivers).  
> **Fidelity default:** Wireframe-first — clear structure, hierarchy, and all required states; light polish only (no heavy illustration, no stock photography).  
> **Tone:** Modern minimal × luxury refined — calm confidence, never childish gamification, never clinical kiosk.

---

## 0. Non-negotiables (do not change)

1. **Workflows stay the same** — screen order, data flow, ESI logic, notify mapping, role gates. Only visual language may change.
2. **5-tab bottom bar with center CTA** is fixed navigation chrome (see §5).
3. **Two roles:** Patient and Caregiver (ASHA / family). Same design system; different density and modules.
4. **Multilingual-ready:** every string is a key; layout must survive longer locales (hi, bn, ta, te, mr, etc.) and RTL later.
5. **Adult health product:** playful progress (XP, levels, quests) is **subtle and premium** — no cartoon mascots, no confetti spam, no emoji as primary icons.
6. **No AI slop:** no purple mesh gradients as full-page washes, no generic “Feature One” copy, no left-border accent cards, no Inter/Roboto as *display* face.

---

## 1. Brand posture

| Axis | Decision |
|------|----------|
| Personality | Calm, trustworthy, quietly premium |
| Metaphor | Private clinic + personal coach — not hospital lobby, not fitness game |
| Density | Patient: airy. Caregiver: denser lists, faster scan |
| Color budget | One primary action color; one secondary health signal; ESI colors only for urgency |
| Motion | Functional only — confirm state, progress, navigation. No decorative loops |
| Fidelity | Wireframe-first: structure + states first; polish second |

**One-line system (vocalize before building):**  
Deep navy / warm-white canvas · indigo primary `#6366f1` · cyan secondary · violet tertiary · SF/system type with refined weight contrast · 16–20px radii · glass level ribbon for progress · 5-tab bar with elevated center CTA.

---

## 2. Design tokens

### 2.1 CSS `:root` (bind verbatim)

```css
:root {
  /* Light — product default for patient calm */
  --bg:           oklch(98.5% 0.008 280);
  --surface:      oklch(100% 0 0);
  --surface-2:    oklch(97.5% 0.012 280);
  --fg:           oklch(22% 0.04 285);
  --muted:        oklch(52% 0.02 270);
  --border:       oklch(91% 0.015 280);
  --accent:       oklch(55% 0.19 280);      /* indigo #6366f1-ish */
  --accent-2:     oklch(65% 0.12 210);      /* cyan health */
  --accent-3:     oklch(55% 0.18 300);      /* violet premium */

  /* Dark — showcase stage + dark mode app */
  --bg-dark:      oklch(12% 0.02 285);      /* #0a0a14 */
  --surface-dark: oklch(16% 0.025 285);     /* #12121e */
  --surface-2-dark: oklch(20% 0.03 285);    /* #1a1a2e */
  --fg-dark:      oklch(93% 0.01 285);      /* #e8e8f0 */
  --muted-dark:   oklch(62% 0.02 285);      /* #8888a0 */
  --border-dark:  oklch(28% 0.03 285);      /* #2a2a3e */
  --accent-dark:  oklch(68% 0.14 280);      /* #818cf8 */

  /* Semantic / ESI */
  --esi-1: #dc2626;
  --esi-2: #ea580c;
  --esi-3: #f59e0b;
  --esi-4: #22c55e;
  --esi-5: #10b981;
  --danger:  #ef4444;
  --success: #10b981;
  --warn:    #f59e0b;

  /* Type */
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
  --font-body:    -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
  --font-mono:    ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;

  /* Space + radius */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;
  --radius-pill: 9999px;

  /* Type scale (mobile) */
  --text-display: 32px;
  --text-headline: 24px;
  --text-title: 18px;
  --text-body: 15px;
  --text-caption: 13px;
  --text-micro: 11px;

  /* Elevation */
  --shadow-card: 0 8px 24px color-mix(in oklch, var(--fg) 6%, transparent);
  --shadow-tab:  0 -3px 12px color-mix(in oklch, var(--fg) 6%, transparent);
  --shadow-cta:  0 8px 20px color-mix(in oklch, var(--accent) 35%, transparent);
}
```

### 2.2 Hex source map (from HealAI codebase — authoritative)

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#6366f1` | `#818cf8` |
| Secondary | `#06b6d4` | `#22d3ee` |
| Tertiary | `#8b5cf6` | `#a78bfa` |
| Background | `#fafaff` | `#0a0a14` |
| Surface | `#ffffff` | `#12121e` |
| Surface elevated | `#f8f9ff` | `#1a1a2e` |
| Border | `#e2e4f0` | `#2a2a3e` |
| Text primary | `#1e1b4b` | `#e8e8f0` |
| Text secondary | `#64748b` | `#8888a0` |
| Primary gradient (CTAs only) | `#6366f1 → #8b5cf6` | same, softer |

### 2.3 Posture rules

- **Hairline borders** + soft shadow — not heavy Material cards.
- **Radii 16–20px** on cards; pills for CTAs and XP chips.
- **Accent used at most twice per screen** (primary CTA + one highlight).
- **ESI colors never used for decoration** — only urgency, badges, notify severity.
- **Quest tiles** (if used): pastel tints on neutral surface, not neon full fills.
- **Wireframe-first polish:** grey blocks OK for missing media; labels must be real product copy.

---

## 3. Typography rules

| Role | Size | Weight | Use |
|------|------|--------|-----|
| Display | 32px | 800–900 | Hero value prop, ESI number |
| Headline | 24px | 700–800 | Screen titles, priority sentence |
| Title | 18px | 700 | Card titles, quest titles |
| Body | 15px | 400–500 | Descriptions (never < 15 for primary body) |
| Caption | 13px | 500 | Meta, timestamps |
| Micro | 11px | 600 | Badges, tab labels, XP pills only |
| Mono | 11–13px | 500 | Eyebrows, “HI-FI · IPHONE”, language codes |

- Display letter-spacing: `-0.02em` on large headlines.
- Numerics (XP, ESI, %): `font-variant-numeric: tabular-nums`.
- Multilingual: avoid fixed-height text boxes; allow 1.4–1.6 line-height; never truncate critical medical copy.

---

## 4. Gamified layer (health-safe)

Gamification supports **adherence and clarity**, not arcade play.

| Concept | Product meaning | UI treatment |
|---------|-----------------|--------------|
| Level / LV | Health engagement level | Glass ribbon: `LV n · current/max XP` + thin progress bar |
| XP | Points for completing checks, meds, education, caregiver tasks | `+NN XP` pill on tiles; mono/tabular |
| Daily quests | Today’s health actions | 2×3 or 3×2 tile grid — specific titles |
| Quest detail | Single action with steps | Hero tint block + checklist + primary CTA |
| Streak | Optional; only if data exists | Caption under greeting — never invent |

### Real quest naming (examples — generate domain-true names)

**Patient**
- Body — Log symptoms (chest / head / …)
- Mind — 5-min breathing before meds
- Meds — Evening dose · reminder set
- Learn — “When is fever an emergency?”
- Report — Share last check with caregiver
- Chat — Ask HealAi about dizziness

**Caregiver**
- Review — 3 pending patient cases
- Follow-up — Call Rampur ESI-2 case
- Outbreak — Check Sector 7 fever cluster
- Educate — Send hydration card (HI/EN)
- Log — Field visit notes for ASHA route

### Anti-patterns

- ❌ Fake stats (“10M consultations”)
- ❌ Childish badges, stars, cartoon organs
- ❌ Confetti on every action (ESI-5 calm success only, one-shot)
- ❌ XP louder than medical content on Priority / Report screens

---

## 5. Navigation (FIXED)

### 5.1 Five-tab bar + center CTA

```
[ Home ]  [ Symptoms ]  [  ⊕  ]  [ Chat ]  [ More ]
   1            2         center     4        5
```

| Slot | Label | Icon (MCI or SVG) | Role |
|------|-------|-------------------|------|
| 1 | Home | home | Patient home / Caregiver home variant |
| 2 | Symptoms | stethoscope | Symptom intake (patient); optional hidden for pure caregiver |
| 3 | **Center CTA** | plus / heart-pulse / sparkles | **Elevated circle 56px**, indigo→violet gradient, shadow; opens Quick Check or New Case |
| 4 | Chat | robot / message | AI Chat |
| 5 | More / Profile | dots-horizontal or account | Settings, language, role switch, history |

**Rules**
- Active tab: `--accent` (light) / `--accent-dark` (dark).
- Inactive: muted gray.
- Tab bar height: iOS ~88 (safe area), Android ~64.
- Center button sits **above** the bar baseline by ~12–16px; never a flat 5th equal icon.
- Hit targets ≥ 44px (iOS) / 48dp (Android).
- Caregiver mode may relabel: Home → Cases, Symptoms → Map/Queue, Chat stays, More stays; **center CTA remains**.

### 5.2 Route map (workflows — DO NOT REORDER)

```
(tabs)/index          → Home
(tabs)/symptoms       → Symptom steps only (no inline results dump)
(tabs)/chat           → AI Chat
(tabs)/reports        → Reports list (or merge into More later; keep route)
(tabs)/more           → More / settings / language / role

diagnosis-result      → Conditions + confidence (calm)
priority              → ESI emotional center (no scroll)
doc-report            → Clinical handoff document
notify-screen         → Recipient + send + receipt
history               → Case timeline
chw-dashboard         → Caregiver / ASHA dense dashboard
skin-scanner          → Optional module (keep if present)
education / resources → Content modules
login                 → Auth
```

### 5.3 Data flow (locked)

```
symptoms (analysis complete)
  → save current_case + case_history
  → /diagnosis-result
    → /priority
      → /doc-report
        → /notify-screen
          → replace /(tabs)
```

ESI notify targets (locked):
- ESI 1–2 → Hospital / Emergency (auto-call true)
- ESI 3 → ASHA / Clinic
- ESI 4–5 → Caregiver / Family

---

## 6. Dual views

### 6.1 Patient view

- Airy home: greeting, daily insight, one dominant CTA, recent case, optional quest grid.
- Symptom flow: full-step pages, large chips (≥44px), calm progress.
- Priority: badge + one sentence + one button.
- Language switch always visible (EN / HI / …) as mono chip.

### 6.2 Caregiver view

- Dense case list sorted by ESI then recency.
- Compact rows (~72px): mini ESI pill + complaint + location + time + audit snippet.
- Outbreak banner when cluster rule fires (≥3 similar cases / area / 48h).
- Same tab chrome; different home content and center CTA (“New field case”).

### 6.3 Role switch

- Toggle in More: Patient | Caregiver (ASHA).
- Switching swaps home modules only; tokens and tab structure stay.

---

## 7. Screen contracts (structure for regeneration)

### 7.1 Showcase stage (multi-frame prototype only)

When building the **Gamified App three-phone showcase** (not the RN app itself):

- Full-bleed dark stage: `--bg-dark` + soft top spotlight.
- Caption row mono: `WIREFRAME · IPHONE` left · `HealAi` right.
- Three phones **360×780**, 12px black bezel, 44px radius, Dynamic Island.
- Frame 1 Cover · Frame 2 Today quests · Frame 3 Quest detail.
- Each phone includes status bar + **5-tab bar with center CTA**.
- iOS and Android variants as separate files when platform targets require.

### 7.2 Phone 1 — Cover / value prop

```
Status bar
Eyebrow: WIREFRAME · HEALAI
Display: "Daily health quests for [patients & caregivers]."
         accent underline or color on "patients & caregivers"
Body: 1–2 sentences — multilingual AI checks, clear urgency, caregiver handoff.
Tip mono: "Tap a quest · switch language in More."
Bottom: teaser of Home quests peeking
Tab bar (center CTA elevated)
```

### 7.3 Phone 2 — Today (hero)

```
Greeting: "Good morning, [Name]" + optional XP bell
Level ribbon (glass): LV n · xp/max · progress bar
Sub: "n quests waiting · +XP available today"
Grid: 6 quest tiles (pastel chip + title + meta + +XP)
Tab bar active = Home
```

### 7.4 Phone 3 — Quest detail

```
Back + "Quest"
Hero block (soft accent tint) + serif/display title + narrative + REWARD +XP stamp
Checklist 3–4 steps (1 done)
Primary pill CTA "Start quest" / "Begin check"
Tab bar
```

### 7.5 Priority (emotional center — product)

- No scroll. Badge (large) + plain-language ESI sentence + single CTA.
- ESI 1–2: subtle pulse + heavy haptic; no competing modules.
- ESI 4–5: calm green; optional one-shot success motion.

### 7.6 Doc report

- Document tone: section rules, generous spacing, export/notify CTAs.
- Not a game screen — suppress XP chrome.

### 7.7 CHW dashboard

- Density first; 72px rows; outbreak banner; filters.
- No large hero illustrations.

---

## 8. Components (implementation-ready)

| Component | Spec |
|-----------|------|
| `TabBar5` | 5 slots; center elevated CTA; active accent |
| `LevelRibbon` | Glass/blur surface, LV label, XP fraction, progress |
| `QuestTile` | radius-md, glyph chip, title, meta, +XP pill; pastel bg per category |
| `EsiBadge` | Small pill + large hero; number + label + color (never color alone) |
| `GradientButton` | Primary fill indigo→violet; min height 48; pill |
| `GlassCard` | Surface + border + light blur; used for insight / ribbon |
| `LanguageChip` | Mono uppercase locale code |
| `StateShell` | Loading / Empty / Error / Populated / Edge wrappers |
| `ChecklistStep` | Circle done/pending + label |
| `CaseRow` | Caregiver compact row |

### State coverage (every list/form/panel)

Must support: **Loading** (skeleton + 15s timeout copy), **Empty** (headline + explain + CTA), **Error** (cause + recovery + preserve input), **Populated**, **Edge** (long strings, missing avatar, RTL-ready).

Forms: untouched / dirty-valid / submitted-pending; validate on blur.

---

## 9. Motion discipline

| Event | Duration | Notes |
|-------|----------|-------|
| Tab / press | 50–100ms | opacity/scale 0.96 |
| State confirm | 150ms | default |
| Sheet / modal enter | 200–300ms | |
| ESI badge enter | spring ~300–500ms | damping ~12 |
| ESI 1–2 pulse | subtle scale loop | respect reduced motion |
| XP gain | 150–200ms | number tick only |

- `prefers-reduced-motion: reduce` → opacity only, no transform loops.
- No infinite spinners past 60s.
- Reward motion one-shot only.

---

## 10. Copy & content rules

- Plain language for ESI (use locked `ESI_ACTION_TEXT` from theme).
- Real quest/symptom names — no lorem.
- Language: UI chrome short; medical sentences complete.
- Disclaimer footer on reports: not a substitute for diagnosis.
- Caregiver copy is operational (“Pending”, “Called · No answer”), not marketing.

---

## 11. Platform notes

| Target | Frame / chrome | Hit target |
|--------|----------------|------------|
| iOS | Dynamic Island, home indicator, SF symbols feel | ≥44px |
| Android | Punch-hole/status + nav bar, Material icons OK | ≥48dp |
| Cross-platform | Separate files per target when generating multi-file prototypes | Shared tokens |

Do **not** put platform selectors inside product UI.

---

## 12. Wireframe-first rendering guide

When fidelity is wireframe-first:

1. Correct hierarchy, spacing, tabs, states — first.
2. Use token colors at 60–80% intensity; reduce gradients to flat primary.
3. Replace Lottie with labelled grey blocks: `[scan animation]`, `[empty doctor]`.
4. Keep ESI colors full-strength (safety critical).
5. Keep center CTA visually dominant even in wireframe.

---

## 13. AI regeneration prompt (paste with this file)

```
You are redesigning HealAi UI from DESIGN.md.
- Keep all workflows, routes, ESI logic, and notify mapping unchanged.
- Keep 5-tab bottom bar with elevated center CTA.
- Support Patient and Caregiver views.
- Tone: modern minimal × luxury refined; adult health; subtle XP/quests only.
- Fidelity: wireframe-first unless told otherwise.
- Bind tokens from §2; use components from §8.
- Cover loading/empty/error/populated/edge states.
- Output product-realistic screens — no designer chrome, no fake metrics.
- Multilingual-ready layout (no clipped critical copy).
```

---

## 14. Checklist before shipping any regenerated UI

### P0

- [ ] 5 tabs + elevated center CTA present and tappable
- [ ] Patient and caregiver differences clear on Home
- [ ] Workflow order symptoms → diagnosis → priority → report → notify intact
- [ ] ESI 1–5 colors + plain-language actions correct
- [ ] Tokens match §2 (no random purple mesh backgrounds)
- [ ] Body text ≥15px; targets ≥44px
- [ ] All five states exist on data surfaces
- [ ] No invented medical claims or fake stats

### P1

- [ ] Level ribbon + quest tiles only on engagement surfaces
- [ ] Report screen feels document-like
- [ ] Language chip accessible from Home/More
- [ ] Reduced-motion respected
- [ ] Dark mode uses navy surfaces not pure black

### P2

- [ ] Tabular nums on XP/ESI/%
- [ ] Caregiver rows ≤72px density
- [ ] Showcase stage (if any) uses three distinct frames

---

## 15. Critique targets (score ≥4 / 5)

| Axis | Pass means |
|------|------------|
| Philosophy | Calm premium health — not arcade, not hospital form |
| Hierarchy | One primary action per screen |
| Execution | Spacing rhythm 4–8–12–16–24; alignment consistent |
| Specificity | HealAi domain copy; dual roles; multilingual |
| Restraint | Accent twice max; one flourish per screen |

---

## 16. Source alignment

Derived from HealAI-Mobile:

- `src/theme/index.ts` — colors, ESI, notify targets
- `src/app/(tabs)/_layout.tsx` — five tabs
- Product routes: symptoms, diagnosis-result, priority, doc-report, notify, history, chw-dashboard

This DESIGN.md is the **single source of visual truth** for regenerating feel/UI. Workflows in code remain authoritative for behavior.

### Related: React Native fix playbook

For the **already complete** Expo app (UI-only modernization), follow:

- **`UI-REDESIGN-PLAYBOOK.md`** — phased steps A→H, file checklist, primitives, elevated tab CTA, per-screen polish, QA matrix.

Use DESIGN.md for *what it should look like*; use the playbook for *how to change the RN codebase without touching logic*.

---

*HealAi Design System · wireframe-first · modern minimal × luxury · patients + caregivers*
