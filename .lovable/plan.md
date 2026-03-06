

# Shop Detail Sheet — Admin Shops View

## What
When clicking on a shop row in the admin shops table, open a right-side Sheet showing full details about that shop: owner info, shop settings, statistics (sales, repairs, products, expenses, customers), team members, and recent activity.

## Backend Change
Add a new action `get-shop-details` to the `admin-manage-users` edge function that fetches all data for a specific owner:
- Profile info (full_name, username, phone, whatsapp, email, last_online_at, created_at)
- Shop settings (shop_name, country, currency, tax_rate, address, phone, email, logo_url, brand_color)
- Counts: products, customers, sales (+ total revenue), repairs (+ total revenue), expenses (+ total), suppliers, team members
- Team members list (name, role, status, last_online_at)
- Recent activity: last 5 sales + last 5 repairs

## Frontend Changes

### New component: `src/components/admin/ShopDetailSheet.tsx`
A Sheet (right-side drawer) with sections:
1. **Header**: Shop name, logo, country flag, currency, owner name/username, online status
2. **Contact Info**: Phone, WhatsApp, email, address
3. **Statistics Grid**: Cards showing product count, customer count, total sales, total repairs, total expenses, team size
4. **Team Members**: Compact list with name, role, online status
5. **Recent Activity**: Last few sales and repairs with amounts

### New hook in `useAdmin.ts`
- `useShopDetails(userId)` — calls the new `get-shop-details` action, enabled when a userId is selected

### Modified: `AdminShopsView.tsx`
- Add state for `selectedShop` (userId)
- Make table rows clickable → sets `selectedShop`
- Render `ShopDetailSheet` when a shop is selected

All UI in French, dark glassmorphism theme matching the existing admin panel.

