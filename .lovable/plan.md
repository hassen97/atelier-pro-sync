

# Full-Screen Verification Blocker + Settings Pre-fill

## What Changes

### 1. Replace Banner with Full-Screen Blocking Overlay

The current `VerificationBanner` is a small amber strip at the top of the page. It will be completely rewritten into a **full-screen overlay** that blocks the entire dashboard.

**Two states:**

- **Before submission** (`verification_requested_at` is null): A bold red full-screen blocker with countdown timer, preventing any interaction with the app. The verification form is embedded directly (not in a dialog). The user cannot dismiss this overlay.

- **After submission** (`verification_requested_at` is set): The overlay disappears. Instead, a non-blocking amber/yellow top banner shows "Votre demande est en cours d'examen" with the countdown. The user can use the app normally while waiting.

### 2. Full-Screen Overlay Design

```text
┌──────────────────────────────────────────┐
│  ████████ FULL RED OVERLAY ██████████████ │
│                                          │
│     🛡️  Vérification Requise            │
│                                          │
│  Votre compte doit être vérifié avant    │
│  de pouvoir accéder à la plateforme.     │
│                                          │
│  Suspension dans: 47:32:15               │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  [Embedded Verification Form]     │  │
│  │  Shop name, owner, phone, city... │  │
│  │  [Soumettre la demande]           │  │
│  └────────────────────────────────────┘  │
│                                          │
│  WhatsApp contact link                   │
└──────────────────────────────────────────┘
```

### 3. Pre-fill Shop Settings After Submission

When the verification form is submitted, the data (shop_name, phone, address, google_maps_url) will also be saved to `shop_settings` for that user. This way their settings page is pre-populated.

In the `VerificationRequestDialog` submit handler, after inserting into `verification_requests`, update `shop_settings`:
- `shop_name` → `shop_settings.shop_name`
- `phone` → `shop_settings.phone`  
- `address` → `shop_settings.address`
- `google_maps_url` → `shop_settings.google_maps_url`

### 4. Files to Modify

| File | Change |
|------|--------|
| `src/components/verification/VerificationBanner.tsx` | Complete rewrite: full-screen red overlay (pre-submission) vs. amber banner (post-submission). Embed the form inline instead of using a dialog. |
| `src/components/verification/VerificationRequestDialog.tsx` | Update `handleSubmit` to also upsert matching fields into `shop_settings`. Keep the dialog for potential reuse but the banner will embed the form directly. |
| `src/components/layout/MainLayout.tsx` | Move `VerificationBanner` to render as a sibling overlay on top of everything (outside the flex layout), so it truly blocks the entire page. |

### 5. Technical Details

- The full-screen overlay uses `fixed inset-0 z-[100]` to cover everything including sidebar and header
- Red gradient background: `bg-gradient-to-b from-red-950 via-red-900/98 to-zinc-950`
- Countdown timer logic stays the same (server-enforced `verification_deadline`)
- After form submission: set local state + refetch profile so `verification_requested_at` is populated → overlay disappears, banner appears
- Settings pre-fill uses existing `supabase.from("shop_settings").update(...)` filtered by `user_id`
- No database schema changes needed — all fields already exist in both tables

