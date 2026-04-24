# Fix: New shop owners get kicked back to login

## Root cause

I checked `fire1` in the database and the signup is now perfect:
- `profile` ✅ created
- `user_roles.role = super_admin` ✅
- `shop_settings` ✅ initialized
- `verification_status = pending_verification` (expected — this is the default for every new owner, set by the `handle_new_user()` trigger)

The flicker you saw ("Vérification Requise" page → redirect to login) is caused by **`src/pages/Auth.tsx` lines 168–173**:

```ts
} else if (profile?.is_locked || vs === "pending_verification") {
  await supabase.auth.signOut();
  setError("Votre compte est en attente de validation par l'administrateur.");
  ...
}
```

This **signs out every new shop owner immediately after login**, because every new account starts with `pending_verification`. That contradicts the intended onboarding funnel:

- `ProtectedRoute` already lets pending users into `/dashboard`
- `VerificationBanner` is designed to show a full-screen blocking overlay where the owner fills out the verification form (shop name, address, phone, etc.) and submits it to admin

So the user briefly sees the verification overlay (correct behavior), then `Auth.tsx` forcibly signs them out 200 ms later (bug).

## Fix

In `src/pages/Auth.tsx`, change the post-login check so that `pending_verification` no longer triggers a sign-out. Only `is_locked` (admin kill-switch) and `suspended` (after 48h timeout, already handled above) should sign the user out.

Replace the `else if` block (lines 168–173) with:

```ts
} else if (profile?.is_locked) {
  // Admin kill-switch only
  await supabase.auth.signOut();
  setError("Votre compte est verrouillé par l'administrateur. Veuillez le contacter.");
  setLoading(false);
  return;
}
// pending_verification users are allowed in — VerificationBanner handles the overlay
```

## Result

After this change:
1. `fire1` (and every future shop-owner signup) logs in normally
2. They land on `/dashboard` and immediately see the full-screen "Vérification Requise" form
3. They fill it out → request goes to admin → admin verifies → onboarding setup → checkout → dashboard

No DB changes, no migration — single client-side edit.
