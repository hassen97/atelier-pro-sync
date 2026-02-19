

# Add Country & Currency Selection

## Overview
Add country and currency fields to the system: during account registration, in the shop settings page for owners to change later, and in the admin dashboard for platform admins to view and edit per shop.

## Database Changes

**Migration: Add `country` and `currency` columns to `shop_settings`**
- Add `country TEXT NOT NULL DEFAULT 'TN'` to `shop_settings`
- The `currency` column already exists (default `'TND'`), so no change needed there
- Update existing rows: all current users get `country = 'TN'` (already handled by default)

**Migration: Update `handle_new_user` trigger** to accept country from user metadata and set it on the new `shop_settings` row.

## Predefined Country/Currency List

Create a new file `src/data/countries.ts` with a curated list of countries and their default currencies:
- Tunisia (TN) - TND / DT
- Algeria (DZ) - DZD / DA
- Morocco (MA) - MAD / MAD
- Libya (LY) - LYD / LD
- Egypt (EG) - EGP / LE
- France (FR) - EUR / EUR
- Saudi Arabia (SA) - SAR / SAR
- UAE (AE) - AED / AED
- USA (US) - USD / $
- (and a few more common ones)

Each entry includes: `code`, `name` (French), `defaultCurrency`, `currencySymbol`, `currencyDecimals`.

## File Changes

### 1. `src/data/countries.ts` (NEW)
- Export the countries/currencies list
- Export helper functions: `getCountryByCode()`, `getCurrencyByCode()`, `getCurrencyForCountry()`

### 2. `src/pages/Auth.tsx`
- Add country and currency selects in the registration form (between full name and password fields)
- When country is selected, auto-fill currency with that country's default (user can override)
- Pass `country` and `currency` to `signUp()`

### 3. `src/contexts/AuthContext.tsx`
- Update `signUp` signature to accept optional `country` and `currency` parameters
- Pass them in user_metadata so the trigger can pick them up

### 4. DB trigger `handle_new_user`
- Read `country` from `raw_user_meta_data` and set it on the `shop_settings` insert
- Read `currency` from `raw_user_meta_data` (if provided) and override the default

### 5. `src/hooks/useShopSettings.ts`
- Add `country` to the `ShopSettings` interface
- Include `country` in fetch and save operations

### 6. `src/pages/Settings.tsx`
- Replace the disabled currency input with a working Select dropdown for currency
- Add a country Select dropdown next to it
- Both are editable and saved via `saveSettings()`

### 7. `src/lib/currency.ts`
- Make `formatCurrency` dynamic: accept an optional currency code parameter
- When no code is provided, keep current TND behavior for backward compatibility
- Add a lookup function that returns symbol and decimals for any supported currency

### 8. `src/hooks/useAdmin.ts`
- Add `country` and `currency` to the `ShopOwner` interface

### 9. `supabase/functions/admin-manage-users/index.ts`
- **"list" action**: Include `country` and `currency` from `shop_settings` in the response
- **New "update-settings" action**: Allow platform admin to update `country` and `currency` for any shop owner's `shop_settings` row
- Add validation schema for the new action

### 10. `src/components/admin/AdminShopsView.tsx`
- Display country flag emoji and currency code for each owner in the info line
- Add an edit button (pencil icon) that opens a dialog to change country/currency for that owner

### 11. `src/components/admin/EditOwnerSettingsDialog.tsx` (NEW)
- Dialog with country and currency selects
- Calls the new "update-settings" admin action
- Pre-filled with the owner's current values

### 12. `src/components/admin/CreateOwnerDialog.tsx`
- Add country and currency selects to the create owner form
- Pass them to the "create" action so the new user's shop_settings gets the right values

## Technical Notes

- Country codes use ISO 3166-1 alpha-2 (TN, DZ, MA, etc.)
- Currency codes use ISO 4217 (TND, DZD, MAD, etc.)
- The `formatCurrency` function throughout the app currently hardcodes TND. After this change, components that use it will need to pass the shop's currency from settings context. This will be done by updating `formatCurrency` to optionally accept a currency code, and updating the `ShopSettingsContext` consumers.
- Existing users all default to TN/TND so no data migration beyond the column default is needed.

