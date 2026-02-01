
# Fix Duplicate Notifications on Page Refresh

## Problem
Notifications reappear after being marked as read or deleted because:
- The tracking sets (`notifiedLowStock`, `notifiedCompletedRepairs`) use `useRef` which resets on page refresh
- On each page load, the system thinks it hasn't notified about low stock/completed repairs yet
- Result: Same notifications are created again and again

## Solution
Persist the "already notified" tracking in localStorage alongside the notifications, so the system remembers which items have already triggered notifications even after page refresh.

## Files to Modify

### 1. `src/hooks/useNotifications.ts`
Add tracking for notified items:
- Store `notifiedProductIds` and `notifiedRepairIds` in localStorage
- Export functions to add/check/clear notified items
- Load notified items on mount

### 2. `src/contexts/NotificationsContext.tsx`
Use persisted tracking instead of useRef:
- Replace `useRef<Set>` with persisted state from the hook
- Check against persisted notified IDs before creating notifications
- Clear notified IDs when appropriate (e.g., when stock is replenished)

## Technical Details

### Updated useNotifications Hook
```typescript
const NOTIFIED_PRODUCTS_KEY = "notified_low_stock_products";
const NOTIFIED_REPAIRS_KEY = "notified_completed_repairs";

// Add to hook:
const [notifiedProductIds, setNotifiedProductIds] = useState<Set<string>>(() => {
  const stored = localStorage.getItem(NOTIFIED_PRODUCTS_KEY);
  return stored ? new Set(JSON.parse(stored)) : new Set();
});

// Persist on change
useEffect(() => {
  localStorage.setItem(NOTIFIED_PRODUCTS_KEY, JSON.stringify([...notifiedProductIds]));
}, [notifiedProductIds]);
```

### Updated NotificationsContext Logic
- Check `notifiedProductIds.has(product.id)` before adding notification
- Add ID to set after notification is created
- Remove ID when stock is replenished above threshold

## Expected Behavior After Fix
| Action | Before Fix | After Fix |
|--------|------------|-----------|
| Refresh page | Duplicate notifications appear | No new duplicates |
| Mark as read | Reappears on refresh | Stays read |
| Delete notification | Reappears on refresh | Stays deleted |
| Stock replenished then drops | May duplicate | Only notifies once |
