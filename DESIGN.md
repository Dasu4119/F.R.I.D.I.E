---
version: alpha
name: "F.R.I.D.I.E."
description: "An operational AI command center shaped like a calm engineering trace desk."
colors:
  primary: "#E66C3A"
  ink: "#101923"
  canvas: "#F3F6F3"
  paper: "#FFFFFF"
  signal: "#E66C3A"
  intelligence: "#216B74"
  success: "#237A57"
  warning: "#A65D19"
  danger: "#B93838"
  border: "#CBD5D2"
  muted: "#60706E"
typography:
  display:
    fontFamily: "Bahnschrift, Aptos Display, Segoe UI Variable Display, sans-serif"
  sans:
    fontFamily: "Aptos, Segoe UI Variable Text, Segoe UI, sans-serif"
  mono:
    fontFamily: "Cascadia Code, SFMono-Regular, Consolas, monospace"
rounded:
  DEFAULT: "0.75rem"
  sm: "0.375rem"
  md: "0.75rem"
  lg: "1.125rem"
spacing:
  control: "0.75rem"
  panel: "1.25rem"
  section: "2rem"
  page-max: "92rem"
components:
  button: { }
  card: { }
  textarea: { }
  progress: { }
  badge: { }
---

# F.R.I.D.I.E. Design System

## Overview

### Creative North Star

The interface should feel like an aerospace systems desk where every instruction is traceable: quiet drafting-paper surfaces, strong ink typography, precise status marks, and one continuous reasoning spine connecting a goal to its agents.

### Product context and register

- **Audience and primary job:** builders, researchers, and nontechnical operators who need to turn an ambiguous goal into controlled work.
- **Target market(s) and evidence:** global, English-first; the supplied product specifications require Windows, Linux, and macOS support.
- **Locale(s) and language policy:** English in v0.1; copy is plain, direct, and avoids unexplained internal jargon.
- **Usage scene:** desktop-first command work with responsive access on tablets and phones; medium-high information density.
- **Register:** product.
- **Memorable signature:** the reasoning spine, a signal-colored line that visually connects intent, specialist assignments, and verification.
- **Restraint:** forms, error recovery, status, and audit information stay conventional and quiet.
- **Anti-references:** neon cyberpunk consoles, generic purple AI gradients, marketing hero dashboards, and glassmorphism; all weaken trust and scanability.
- **Token ownership/runtime mapping:** the hand-maintained CSS variables in `app/globals.css` are canonical. This file mirrors their accepted values. `npm run verify:design` and the premium audit are drift gates.

## Colors

Ink and canvas carry the product; signal orange is reserved for the active reasoning trace and primary commit action. Intelligence teal identifies agents and model-related states. Success, warning, and danger are semantic and always paired with text or icons. Dark mode remaps surfaces while retaining semantic hierarchy.

## Typography

Display copy uses a compact engineering grotesk stack. Body copy uses a highly legible system stack; trace IDs, timings, and system labels use the mono stack. Sentence case is standard. Uppercase is restricted to short system labels with expanded tracking.

## Layout

The command center uses an asymmetric 7/5 desktop grid and becomes a single reading column below 900px. Content is capped at the `page-max` token. The page owns document scrolling; panels use internal overflow only for genuinely bounded lists. Controls never shift when busy.

## Elevation & Depth

Hierarchy comes from tonal surfaces, borders, and small offset shadows that resemble stacked technical sheets. Blur and translucent glass are forbidden. The active composer receives the strongest border, not the largest shadow.

## Shapes

Controls use the medium radius; major work surfaces use the large radius. Status chips may be pill-shaped because their compact label-and-state structure warrants it. The reasoning spine remains linear and crisp.

## Components

### Foundational visual states

All controls define default, hover, focus-visible, active, disabled, and busy states. Focus uses a two-color outline visible on light and dark surfaces. Loading uses the shared spinner in reserved geometry; no skeleton treatment is selected for v0.1.

### Buttons and actions

Primary actions use signal orange with ink text; neutral actions use bordered paper. Danger is reserved for irreversible actions, none of which ship in v0.1. Busy labels retain the same button width.

### Navigation and data display

Navigation is a small set of real in-page landmarks. Agent and task records use lists rather than faux tables. Status badges include visible text. Technical identifiers remain copyable and untruncated.

### Forms and overlays

The goal textarea has a persistent label, help text, app-owned validation, `resize: none`, and an adequate default height. Server failures remain inline with Retry. v0.1 has no destructive dialogs.

### Iconography

Lucide is the canonical family at 16-20px with 1.75-2px strokes. Icons support labels; they do not replace unfamiliar action names.

### Motion

One 220ms reasoning-spine reveal marks a completed plan. Other transitions are 120-180ms state fades. Reduced motion removes transforms and delays.

### Content and data visualization

Copy names the user-controlled outcome. Confidence is shown as a percentage and a plain-language qualifier. Evidence, assumptions, and limitations are separate; the interface never presents a deterministic plan as model reasoning.

## Do's and Don'ts

- **Do:** connect every status to a task, owner, and acceptance check.
- **Do:** keep engineering metadata visible but secondary.
- **Don't:** imply that local models, Docker execution, plugins, or vector retrieval are connected before they are configured.
- **Don't:** use decoration, motion, or color as the only explanation of state.
