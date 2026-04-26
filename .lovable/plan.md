## Goal
Make the **Rappels de configuration boutique** card reflect what you actually care about: users who **have not completed setup**, even when they do not have an email attached.

## What I found
- The current onboarding card shows two numbers:
  - owners with incomplete setup
  - owners with a valid email
- In the database right now:
  - **295** owners have not completed setup
  - only **14** of them have an email attached
  - **281** do not have an email attached
- So the current UI is technically correct for email sending, but misleading for tracking incomplete setup.

## Plan
1. **Add a dedicated admin stats action** in the backend admin function for onboarding reminders.
   - Return:
     - total owners with incomplete setup
     - count with email
     - count without email
     - count still eligible for email reminders
   - Use the service-role-backed admin function so the admin UI gets consistent stats.

2. **Update `OnboardingRemindersAdminCard.tsx`** to show setup progress first.
   - Replace the current emphasis on “Avec email valide” with metrics centered on:
     - **Configuration non terminée**
     - **Sans email lié**
   - Keep the email-send button tied only to users who can actually receive reminders.
   - Add helper text explaining that many users are blocked from email reminders because no email is linked to their account.

3. **Refine the CTA and empty/edge states**.
   - Button label should make it clear it sends only to reachable users.
   - If many users lack email, show an info box instead of making the card look broken.
   - Preserve refresh + manual send behavior.

## Files to update
- `supabase/functions/admin-manage-users/index.ts`
- `src/components/admin/OnboardingRemindersAdminCard.tsx`

## Technical details
- No database schema change needed.
- No auth flow change needed.
- Email sending logic in `send-onboarding-reminder` stays intact; only the admin stats/display layer changes.
- I’ll keep the card consistent with the existing waitlist card pattern so counts come from a single admin endpoint.

## Expected result
After this change, the card will no longer look “empty” just because most accounts have no linked email. It will clearly show the real onboarding backlog and separately indicate how many can actually be reached by email.