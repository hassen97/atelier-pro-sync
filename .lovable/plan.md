
# Admin: Employee Management Page + Fix Reset Request Phone Display

## Two Problems to Solve

### Problem 1: Employee Management page missing from Admin
The admin sidebar has no "Employees" section. All employees created by shop owners are not manageable from the platform admin panel.

### Problem 2: Password reset requests don't show phone number
The `password_reset_requests` table only stores `username` and `status`. The edge function tries to join with `profiles` to get the phone, but shop owners created by the admin (like `belfortgsm`) were created without a phone number in their profile — so the join returns `null` and "Aucun contact" is displayed. The fix is to let users enter their phone number directly in the reset request form, stored in the `password_reset_requests` table itself.

---

## Changes Required

### 1. Database Migration: Add `phone` to `password_reset_requests`
```sql
ALTER TABLE public.password_reset_requests
  ADD COLUMN IF NOT EXISTS phone text;
```

### 2. Update `Auth.tsx` — Reset Request Form
Add an optional phone field to the reset request submission form so users can provide their number when asking for a password reset.

### 3. Update Edge Function `admin-manage-users/index.ts`
Add two new actions:

**`list-employees`** — returns all team members (employees) across all shops with their profile info, owner's shop name, and role:
```typescript
// Fetch all team_members, join with profiles for employee and owner info
const { data: employees } = await adminClient
  .from("team_members")
  .select("id, owner_id, member_user_id, role, created_at, allowed_pages, status");
// Then enrich with profiles and shop_settings
```

**`delete-employee`** — receives `memberId` (team_members.id), removes the team_members row and deletes the auth user:
```typescript
// Delete team_members row and auth user
await adminClient.from("team_members").delete().eq("id", body.memberId);
await adminClient.auth.admin.deleteUser(body.employeeUserId);
```

Also update `list-reset-requests` to prioritize the new `phone` column from the table itself over the profile join.

Update `ActionSchema` to add:
```typescript
action: z.enum([..., "list-employees", "delete-employee"]),
memberId: z.string().uuid().optional(),
employeeUserId: z.string().uuid().optional(),
```

### 4. Update `src/hooks/useAdmin.ts`
Add:
- `EmployeeRecord` interface
- `useAdminEmployees()` hook — calls `list-employees`
- `useDeleteEmployee()` mutation — calls `delete-employee`
- `useResetEmployeePassword()` (can reuse existing `useResetOwnerPassword`)

### 5. New file: `src/components/admin/AdminEmployeesView.tsx`
A full management page styled like the existing admin views (dark glassmorphism). Contents:

**Header:** "Gestion des Employés" title + total count badge

**Table columns:**
- Employé (name + @username)
- Boutique (owner's shop name)
- Propriétaire (@owner_username)  
- Rôle (employee/manager/admin badge)
- Pages autorisées (count badge)
- Statut (actif/inactif)
- Actions dropdown: Reset mot de passe, Supprimer

**Actions:**
- Reset password → opens `ResetPasswordDialog` (already exists, reuse it)
- Delete → confirmation AlertDialog → calls `useDeleteEmployee`

### 6. Update `AdminSidebar.tsx`
Add new nav item:
```typescript
{ id: "employees" as const, label: "Employés", icon: Users },
```
Update the `AdminView` type to include `"employees"`.

### 7. Update `AdminDashboard.tsx`
- Add `"employees"` to `AdminView` type
- Import `AdminEmployeesView`
- Add `{activeView === "employees" && <AdminEmployeesView />}` to main render

---

## Implementation Sequence

1. Database migration (add `phone` to `password_reset_requests`)
2. Update edge function (add `list-employees`, `delete-employee`, fix reset request phone)
3. Update `useAdmin.ts` hooks
4. Create `AdminEmployeesView.tsx`
5. Update `AdminSidebar.tsx` + `AdminDashboard.tsx`
6. Update `Auth.tsx` reset request form to capture phone

---

## Technical Notes

- Reuse `ResetPasswordDialog` for employee password reset — it already accepts `userId` + `userName`
- Employees are identified by `team_members.member_user_id` for auth deletion
- The `list-reset-requests` phone fix: return `req.phone || profile?.phone || null` — table phone takes priority
- No new DB tables needed — only one column addition and edge function update
