

# Auth Email Templates — Brand Styling + Deploy

The scaffold created default English templates with black/white styling. This project is a French-language repair shop platform ("RepairPro Tunisie") with a Professional Blue theme (`hsl(217, 91%, 40%)`).

## Changes Required

### 1. Brand-style all 6 email templates
Apply the project's existing brand identity to every template:
- **Language**: French (matching the app's locale)
- **Primary color** (buttons, logo text): `hsl(217, 91%, 40%)` (Professional Blue)
- **Primary foreground** (button text): `hsl(0, 0%, 100%)` (White)
- **Foreground** (headings): `hsl(215, 25%, 15%)`
- **Muted foreground** (body text): `hsl(215, 16%, 47%)`
- **Background**: `hsl(210, 20%, 98%)` for outer body, white for card container
- **Border radius**: `0.625rem` (10px)
- **Font stack**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`
- **Card layout**: Centered card with subtle border (`hsl(214, 32%, 91%)`) and padding
- **Site name**: Display "RepairPro" as branded logo text at top of each email
- Add `Hr` dividers between sections

This matches the previous custom templates the user had before the scaffold overwrote them.

### 2. Update subject lines to French
```
signup: "Bienvenue — confirmez votre compte"
invite: "Vous êtes invité à rejoindre RepairPro"
magiclink: "Votre lien de connexion"
recovery: "Réinitialisez votre mot de passe"
email_change: "Confirmez le changement d'email"
reauthentication: "Votre code de vérification"
```

### 3. Deploy the edge function
Call `deploy_edge_functions` with `auth-email-hook` to activate the templates.

### Files to modify
- `supabase/functions/_shared/email-templates/signup.tsx`
- `supabase/functions/_shared/email-templates/recovery.tsx`
- `supabase/functions/_shared/email-templates/magic-link.tsx`
- `supabase/functions/_shared/email-templates/invite.tsx`
- `supabase/functions/_shared/email-templates/email-change.tsx`
- `supabase/functions/_shared/email-templates/reauthentication.tsx`
- `supabase/functions/auth-email-hook/index.ts` (update `EMAIL_SUBJECTS` to French)

