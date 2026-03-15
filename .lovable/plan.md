

## Plan: Framer Motion Animations + Readability Fix for Landing Page

### Problems identified
1. **Readability**: Hero section uses `bg-sidebar-background` (dark navy) with `text-sidebar-foreground/70` — low contrast for body text. Badge uses `text-primary-foreground` (white) on `bg-primary/20` (very faint blue) — nearly invisible. The "Découvrir" outline button has poor contrast on the dark hero.
2. **No animations**: Page is static, no entrance animations.

### Changes (single file: `src/pages/LandingPage.tsx`)

#### 1. Install framer-motion
Add `framer-motion` dependency.

#### 2. Framer Motion animations
- **Hero**: Staggered fade-up for badge, h1, paragraph, and CTA buttons using `motion.div` with `variants` and `staggerChildren`
- **Stats bar**: Counter-style fade-in for each stat with stagger
- **Feature cards**: `whileInView` fade-up with stagger, plus `whileHover` scale effect
- **Pricing cards**: `whileInView` fade-up with stagger
- **Value props section**: `whileInView` slide-in from left
- **Final CTA**: `whileInView` fade-up

All animations use `viewport={{ once: true }}` to trigger only once on scroll.

#### 3. Readability / contrast fixes
- **Hero badge**: Change from `bg-primary/20 text-primary-foreground` to `bg-primary/90 text-white` — solid readable badge
- **Hero subtitle**: Change `text-sidebar-foreground/70` to `text-sidebar-foreground/80` for better contrast
- **Hero outline button**: Use `border-white/30 text-white hover:bg-white/10` for clear contrast on dark background
- **Hero h1 "Pros de la Reparation" span**: Keep `text-primary` in light mode but ensure it's the brighter `sidebar-primary` shade — use `text-sidebar-primary` for better pop on dark bg

### No other files touched
Only `src/pages/LandingPage.tsx` is modified (plus adding the framer-motion package).

