

# Fix Admin Page: Responsive Layout + Shop Creation Error

## Two Issues

### 1. Shop Creation Error
The "create" action fails silently because of a **password validation mismatch**:
- The frontend (`CreateOwnerDialog.tsx`) allows passwords with 6+ characters
- The backend edge function (`admin-manage-users`) Zod schema requires 8+ characters (`z.string().min(8)`)
- When a password between 6-7 characters is submitted, the backend rejects it with a 400 error but the frontend shows a generic error

Additionally, the edge function catches all errors and returns "Internal server error" without logging the actual error, making debugging impossible.

**Fix:**
- Align the frontend validation to require 8+ characters (matching the backend)
- Add `console.error` in the edge function catch block to log actual errors
- Show the backend error message in the toast instead of a generic one

### 2. Admin Page Not Responsive
The sidebar has a fixed `w-64` width and the layout uses `flex` without any mobile adaptation. On mobile, the sidebar takes up most of the screen and the main content is squeezed.

**Fix:**
- On mobile: convert the sidebar to a collapsible sheet/drawer or hide it behind a hamburger menu
- Use the `useIsMobile` hook already available in the project
- On mobile, show a top bar with a menu button that opens the sidebar as an overlay
- The main content should take full width on mobile

---

## Technical Changes

### File: `src/components/admin/CreateOwnerDialog.tsx`
- Change password validation from `password.length >= 6` to `password.length >= 8`
- Update the placeholder/hint text to indicate 8 character minimum

### File: `supabase/functions/admin-manage-users/index.ts`
- Add `console.error("Admin action error:", err)` in the catch block so errors appear in logs
- Return the actual error message (when safe) instead of generic "Internal server error"

### File: `src/components/admin/AdminSidebar.tsx`
- Accept a new `onClose` prop for mobile dismiss
- Make the component render as content only (no fixed wrapper) so the parent controls presentation

### File: `src/pages/AdminDashboard.tsx`
- Import `useIsMobile` hook
- On mobile: show a top header bar with hamburger menu button and title
- Use a Sheet/Drawer component to show the sidebar as an overlay when the menu button is tapped
- On desktop: keep the current side-by-side layout unchanged

### File: `src/components/admin/AdminShopsView.tsx`
- Make the owner cards stack better on mobile (flex-col instead of flex-row on small screens)
- Wrap action buttons for smaller viewports

