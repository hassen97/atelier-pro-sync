

## Plan: Autocomplete Team Members in Status Assign Dialog

### What changes
**File: `src/components/repairs/StatusAssignDialog.tsx`**

Replace both plain `<Input>` fields ("Reçu par" and "Réparé par") with the existing `<Combobox>` component (already supports `allowCustomValue`).

- Import `useTeamMembers` from `@/hooks/useTeam` and `Combobox` from `@/components/ui/combobox`
- Build options from team members: `{ value: fullName || username, label: fullName || username }`
- Use `<Combobox allowCustomValue={true}>` for both fields so users can either pick a team member or type a custom name
- No other files need changes — the Combobox and team hooks already exist

