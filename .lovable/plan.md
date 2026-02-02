
# Fix: Client Debt Payment Not Updating

## Root Cause Analysis

The bug is in `src/pages/CustomerDebts.tsx` in the `submitPayment` function (lines 147-181).

**Current behavior:**
- When a payment is recorded, only `customer.balance` is updated
- But the debt list is computed from:
  - `repairs`: `remaining = repair.total_cost - repair.amount_paid`
  - `sales`: `remaining = sale.total_amount - sale.amount_paid`
- Since `amount_paid` on repairs/sales is never updated, the debt value stays the same

**Expected behavior:**
- When recording a payment, update the `amount_paid` field on the corresponding repair or sale
- The UI should immediately reflect the new payment

---

## Solution

### Step 1: Add `useUpdateSale` mutation to `useSales.ts`

Currently there's no function to update sales. Add one similar to `useUpdateRepair`.

```typescript
export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; amount_paid?: number }) => {
      const { data, error } = await supabase
        .from("sales")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
```

### Step 2: Fix `submitPayment` in `CustomerDebts.tsx`

Update the function to:
1. Import `useUpdateRepair` and the new `useUpdateSale`
2. Check the debt type (repair or sale)
3. Update the `amount_paid` field on the correct record
4. Also update customer balance

```typescript
const submitPayment = async () => {
  if (!selectedDebt || !paymentAmount) return;

  const amount = parseFloat(paymentAmount);
  // ... validation ...

  try {
    // Update the source record (repair or sale)
    if (selectedDebt.type === "Réparation") {
      const repair = repairs.find(r => r.id === selectedDebt.id);
      if (repair) {
        await updateRepair.mutateAsync({
          id: repair.id,
          amount_paid: Number(repair.amount_paid) + amount,
        });
      }
    } else if (selectedDebt.type === "Vente") {
      const sale = sales.find(s => s.id === selectedDebt.id);
      if (sale) {
        await updateSale.mutateAsync({
          id: sale.id,
          amount_paid: Number(sale.amount_paid) + amount,
        });
      }
    }

    // Also update customer balance
    const customer = customers.find(c => c.id === selectedDebt.customerId);
    if (customer) {
      await updateCustomer.mutateAsync({
        id: customer.id,
        balance: Math.max(0, Number(customer.balance) - amount),
      });
    }

    toast.success("Paiement enregistré");
    setPaymentDialogOpen(false);
  } catch (error) {
    toast.error("Erreur lors de l'enregistrement");
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useSales.ts` | Add `useUpdateSale` mutation |
| `src/pages/CustomerDebts.tsx` | Import and use `useUpdateRepair` + `useUpdateSale`, fix `submitPayment` logic |

## Result

After this fix:
- Payments will update the `amount_paid` field on the repair/sale
- The debt list will immediately reflect the new value
- Customer balance will also be updated for consistency
