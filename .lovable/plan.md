
## Move "Add Client" Button Beside the Customer Search

### Current Behavior
In `RepairDialog.tsx`, the "Ajouter un nouveau client" option is **inside** the dropdown list of the `CustomerCombobox`. The user has to open the dropdown, scroll past clients, then click it — which is slow and indirect.

### New Behavior
A small `+` icon button will sit **directly beside** the `CustomerCombobox` on the same row, always visible. Clicking it immediately toggles the quick-create form below. The option inside the dropdown will be removed since it becomes redundant.

### Changes

**`src/components/repairs/RepairDialog.tsx`**

Replace the current customer section:
```
<div className="space-y-2">
  <FormLabel>Client</FormLabel>
  <CustomerCombobox ... onAddNew={() => setShowQuickCustomer(true)} />
</div>
```

With a row layout:
```tsx
<div className="space-y-2">
  <FormLabel>Client</FormLabel>
  <div className="flex gap-2">
    <div className="flex-1">
      <CustomerCombobox value={...} onValueChange={...} />
    </div>
    <Button
      type="button"
      variant="outline"
      size="icon"
      title="Ajouter un nouveau client"
      onClick={() => setShowQuickCustomer(true)}
    >
      <UserPlus className="h-4 w-4" />
    </Button>
  </div>
</div>
```

- The `onAddNew` prop is removed from `CustomerCombobox` (the internal dropdown option disappears)
- The `UserPlus` icon button is always visible next to the search field
- The quick-create form below remains identical — only the trigger moves

**`src/components/customers/CustomerCombobox.tsx`**

Remove the `onAddNew` prop's usage (the "Ajouter un nouveau client" `CommandItem` group at the bottom of the dropdown), since the button is now external. The `onAddNew` prop stays optional for backward compatibility with POS or other usages.

### Files Modified
| File | Change |
|---|---|
| `src/components/repairs/RepairDialog.tsx` | Replace dropdown trigger with an external `UserPlus` icon button beside the combobox |
| `src/components/customers/CustomerCombobox.tsx` | No change needed — `onAddNew` is already optional; the button simply won't be passed |
