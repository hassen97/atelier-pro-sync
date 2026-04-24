## Plan

1. Stop competing modals while verification is required
- Update the announcement modal flow so it does not open on top of a required verification gate.
- Keep the verification popup as the only focus-trapping layer for pending owners who have not yet submitted.
- This should restore typing in inputs and clicking the submit button on mobile.

2. Simplify the verification popup UI
- Reduce the popup form to only 2 fields:
  - Shop name
  - Phone number
- Remove the extra fields from the popup state, validation, labels, and submit payload.
- Keep the same floating modal style with blurred background, internal scrolling, and one clear submit action.

3. Align backend storage with the new minimal form
- Add a database migration so `verification_requests` no longer requires the removed fields (`owner_name`, `city`, `address`).
- Preserve existing records and make the removed fields optional rather than breaking past data.
- Keep RLS policies unchanged since users still only submit their own request and admins still review all requests.

4. Keep shop data prefill working
- Continue prefilling `shop_settings` from the popup submission, but only with values that still exist:
  - `shop_name`
  - `phone`
- Remove the old address/maps prefill from this flow.

5. Update admin verification views
- Adjust the admin request detail dialog so it cleanly shows the smaller dataset.
- Remove or hide empty fields that are no longer collected.
- Keep admin verification actions unchanged.

6. Verify the flow end-to-end
- Confirm a pending owner can:
  - log in
  - type into both fields
  - tap submit
  - see the waiting state after submission
- Confirm the announcement modal still works for normal users who are not blocked by verification.

## Technical details
- Files likely involved:
  - `src/components/verification/VerificationBanner.tsx`
  - `src/components/announcements/WhatsNewModal.tsx`
  - `src/hooks/useAnnouncements.ts` or the modal caller logic in layout
  - `src/components/admin/AdminVerificationView.tsx`
  - `supabase/migrations/...` for `verification_requests`
- Root cause to address first: a second dialog layer is still mounting during the verification state, which can make the visible verification popup appear unclickable because focus and pointer handling belong to the other modal.
- Database change should be non-destructive: alter existing columns to nullable instead of removing them.
- No auth or RLS redesign is needed for this change.

## Expected result
- The verification popup becomes usable on mobile.
- Users only see two required fields.
- Submission succeeds without asking for city, address, owner name, or social links.
- Admins can still review and approve requests without losing existing historical data.