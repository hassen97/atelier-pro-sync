

## Plan: Landing Page on `/landing`

### What's created
**1 new file**: `src/pages/LandingPage.tsx`  
**1 edit**: `src/App.tsx` — add one public route line

### Zero impact on existing app
- No routes changed, no redirects modified, no components touched
- Landing page is a standalone public route at `/landing`

### LandingPage.tsx Structure
- **Navbar**: Brand name "RepairPro", links (Fonctionnalités, Tarifs, Connexion → `/auth`), CTA "Essayer Gratuitement" → `/auth`. Mobile burger menu.
- **Hero**: Dark gradient section, headline "Le Logiciel Tout-en-Un pour les Pros de la Réparation Mobile", sub-headline, large CTA button
- **Features grid**: 4 cards — Inventaire, Réparations, Comptabilité Fournisseur, Retours & RMA (with Lucide icons)
- **Pricing**: 3 tiers (Débutant free, Pro, Entreprise) with "Prochainement" badge on paid tiers
- **Footer**: Simple branding
- **Auth-aware**: If user is logged in, show "Accéder au Dashboard" button linking to `/` instead of signup CTA
- **Fully responsive**: Stacked layout on mobile, burger nav

### App.tsx edit
Add one line in the public routes block:
```tsx
<Route path="/landing" element={<LandingPage />} />
```

Uses existing Shadcn components (Button, Card, Badge) and app CSS variables for consistency.

