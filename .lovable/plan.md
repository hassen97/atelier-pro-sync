
# Fix Employee Data Sharing & Product Category Error

## Root Cause Analysis

### Issue 1: Employees See Empty Data (No Shared Database)
The `useEffectiveUserId()` hook already exists in `useTeam.ts` and correctly returns the owner's `user_id` when the current user is a team member. However, **none of the data hooks use it**. Every hook (`useProducts`, `useCustomers`, `useRepairs`, `useExpenses`, `useSales`, `useSuppliers`, etc.) queries with `.eq("user_id", user.id)` — the employee's own ID — which returns nothing because all data belongs to the owner.

The fix: update all data hooks to use `useEffectiveUserId()` instead of `user.id` directly when fetching AND inserting data.

### Issue 2: Add Product Error When No Category Selected
In `ProductSheet.tsx`, the `category_id` form field defaults to `""` (empty string). When submitted without selecting a category, the empty string `""` is sent to the database. The `products` table expects either a valid UUID or `NULL` — an empty string causes a foreign key or type violation error.

The fix: in the `onSubmit` handler, convert `category_id: ""` to `undefined` (which becomes `null` in the insert).

---

## Files to Change

### 1. `src/hooks/useProducts.ts`
Replace `user.id` with `effectiveUserId` in all queries and mutations. Use `useEffectiveUserId()` from `useTeam`:

```typescript
import { useEffectiveUserId } from "./useTeam";

export function useProducts() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  
  return useQuery({
    queryKey: ["products", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("products")
        .select(`*, category:categories(id, name)`)
        .eq("user_id", effectiveUserId)
        .order("name");
      ...
    },
    enabled: !!effectiveUserId,
  });
}
```

For `useCreateProduct`, the `user_id` inserted must also be `effectiveUserId` (the owner's ID) so the product belongs to the owner's dataset and RLS allows it via `is_team_member`.

### 2. `src/hooks/useCustomers.ts`
Same pattern: replace all `user.id` references with `effectiveUserId`.

### 3. `src/hooks/useRepairs.ts`
Same pattern.

### 4. `src/hooks/useSales.ts`
Same pattern.

### 5. `src/hooks/useExpenses.ts`
Same pattern.

### 6. `src/hooks/useSuppliers.ts`
Same pattern.

### 7. `src/hooks/useCategories.ts`
Same pattern (employees need to see the owner's categories to assign them to products/repairs).

### 8. `src/hooks/useInvoices.ts`
Same pattern.

### 9. `src/pages/Inventory.tsx` + `src/components/inventory/ProductSheet.tsx`
Fix the category bug: when `handleSubmit` is called with `category_id: ""`, convert it to `undefined`:

```typescript
// In Inventory.tsx handleCreateProduct:
const handleCreateProduct = async (data: ProductSheetFormValues) => {
  await createProduct.mutateAsync({
    ...data,
    category_id: data.category_id || undefined,  // "" → undefined → NULL
  });
};
```

This ensures no empty string is sent as a UUID to the database.

---

## How RLS Allows This

The existing RLS policies on all tables already support this pattern:
```sql
USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()))
```

This means: an employee (`auth.uid()`) can access rows where `is_team_member(owner_id, employee_id)` returns true. By using the **owner's `user_id`** in queries, employees can read and write the owner's data legally through RLS.

The `useEffectiveUserId()` hook correctly resolves:
- Owner → their own `user.id`
- Employee → their `owner_id` from `team_members` table

---

## Summary of Changes

| File | Change |
|---|---|
| `src/hooks/useProducts.ts` | Use `effectiveUserId` in all query/mutation `user_id` references |
| `src/hooks/useCustomers.ts` | Use `effectiveUserId` |
| `src/hooks/useRepairs.ts` | Use `effectiveUserId` |
| `src/hooks/useSales.ts` | Use `effectiveUserId` |
| `src/hooks/useExpenses.ts` | Use `effectiveUserId` |
| `src/hooks/useSuppliers.ts` | Use `effectiveUserId` |
| `src/hooks/useCategories.ts` | Use `effectiveUserId` |
| `src/hooks/useInvoices.ts` | Use `effectiveUserId` |
| `src/pages/Inventory.tsx` | Convert `category_id: ""` to `undefined` before insert |
| `src/components/inventory/ProductSheet.tsx` | Same safeguard in the submit handler |

No database schema changes required — the RLS policies already support shared access. Only the frontend data layer needs to be corrected.
