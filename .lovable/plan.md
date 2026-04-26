## Goal

Replace the Lovable preview URL (`atelier-pro-sync.lovable.app`) used in the waitlist invitation email with the production custom domain `getheavencoin.com`, so both the "Créer mon compte maintenant" button and the plain-text fallback link below it point to the branded domain.

## Change

**File:** `supabase/functions/notify-waitlist/index.ts`

- Update the hardcoded constant:
  ```ts
  const PUBLIC_BASE_URL = "https://getheavencoin.com";
  ```

That single constant is already used to build the signup URL (`${PUBLIC_BASE_URL}/auth?tab=register&email=...`) and the unsubscribe URL passed to the email template, so updating it fixes:
- The CTA button "Créer mon compte maintenant"
- The visible link shown under "Ou copiez ce lien dans votre navigateur"
- The "Se désabonner" link

No template changes needed — the email template (`waitlist-invitation.tsx`) receives the URLs as props.

## Deploy

Redeploy the `notify-waitlist` edge function so the new URL takes effect immediately for the next batch of waitlist invitations.

## Notes

- This assumes `getheavencoin.com` is configured as a custom domain for this project and serves the same app (so `/auth?tab=register&email=...` works there). If the custom domain is not yet pointed at the project, the link will not resolve until DNS is configured.
- Already-sent emails cannot be updated; only future waitlist notifications will use the new domain.
