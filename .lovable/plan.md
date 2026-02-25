

# Plan: Add Quick Customer Creation to POS Checkout

## What Changes

Add a "+" button next to the customer dropdown in the POS cart section. Clicking it opens the existing `CustomerDialog` to create a new customer without leaving the checkout flow. Once created, the new customer is automatically selected.

## Technical Details

### Modified File: `src/pages/POS.tsx`

1. Import `CustomerDialog` from `@/components/customers/CustomerDialog` and `useCreateCustomer` from `@/hooks/useCustomers`
2. Import `UserPlus` icon from `lucide-react`
3. Add state: `customerDialogOpen` (boolean)
4. Add the `useCreateCustomer` hook
5. Add a `handleCreateCustomer` function that calls `createCustomer.mutateAsync`, then sets the new customer's ID as `selectedCustomerId`
6. Next to the customer `Select` dropdown, add a small "+" `Button` that opens the `CustomerDialog`
7. Wrap the Select + Button in a `flex` row so they sit side by side
8. Render `<CustomerDialog>` at the bottom of the component

No database changes needed -- uses the existing `customers` table and `useCreateCustomer` hook.
