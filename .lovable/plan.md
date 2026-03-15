

# Modernize Login Page with Role Selection

## Overview

Redesign the login/registration page with a futuristic repair shop aesthetic and add a role selector so shop owners and employees use the same login screen but with a clear identity choice.

## Visual Design

The new design will feature:
- **Dark gradient background** with subtle animated grid/circuit pattern using CSS
- **Glassmorphism card** with backdrop-blur and glowing border accents
- **Animated wrench/gear icon** with a neon glow effect
- **Role selector** as two large clickable cards before the login form (Shop Owner / Employee)
- **Sleek input fields** with glass styling and subtle focus glow
- **Gradient accent button** with hover glow effect

```text
  ┌──────────────────────────────────────┐
  │     (background: dark gradient       │
  │      with subtle grid pattern)       │
  │                                      │
  │         [Wrench Icon + Glow]         │
  │        RepairPro Tunisie             │
  │     "Gestion d'atelier moderne"      │
  │                                      │
  │   ┌──────────┐  ┌──────────────┐     │
  │   │  Owner   │  │   Employee   │     │
  │   │ (Store)  │  │  (UserCog)   │     │
  │   │ selected │  │              │     │
  │   └──────────┘  └──────────────┘     │
  │                                      │
  │  ┌────────────────────────────────┐  │
  │  │  [Connexion] [Inscription]    │  │
  │  │                                │  │
  │  │  @ Username ________________  │  │
  │  │  * Password ________________  │  │
  │  │                                │  │
  │  │  [====  Se connecter  ====]   │  │
  │  │  Mot de passe oublie?         │  │
  │  └────────────────────────────────┘  │
  │                                      │
  │   WhatsApp contact button            │
  │   (c) 2024 RepairPro Tunisie         │
  └──────────────────────────────────────┘
```

## How the Role Selector Works

- **Shop Owner** ("Proprietaire"): Shows both Connexion and Inscription tabs (current behavior)
- **Employee** ("Employe"): Shows only the Connexion tab (employees cannot self-register -- they are created by the owner)
- The selected role is purely visual/UX -- both roles use the same `signIn()` function. The backend already determines the user's actual role after login
- Default selection: Shop Owner

## Changes

### File: `src/pages/Auth.tsx`
- Add `loginRole` state: `"owner" | "employee"` (default `"owner"`)
- Add role selector UI: two styled cards with icons (`Store` and `UserCog` from lucide)
- When "Employee" is selected, hide the "Inscription" tab and show login only
- Restyle the entire page:
  - Background: dark gradient (`from-slate-950 via-slate-900 to-slate-950`) with a CSS grid overlay
  - Card: glassmorphism (`backdrop-blur-xl bg-white/5 border border-white/10`)
  - Inputs: dark glass style with glow on focus
  - Button: gradient with subtle glow shadow
  - Wrench icon: animated pulse glow

### File: `src/index.css`
- Add CSS classes for the login page effects:
  - `.auth-grid-bg`: subtle animated grid background pattern
  - `.auth-glow`: neon glow effect for the icon
  - `.auth-card`: glassmorphism card specific to auth page

## What Stays the Same
- All form logic, validation, signUp/signIn calls remain identical
- The admin WhatsApp contact link stays
- The forgot password link stays
- Registration form fields unchanged
- No backend changes needed

