

# Combine Verification and Shops Tabs

## Overview

Merge the separate "Boutiques" and "Vérification" sidebar items into a single unified "Boutiques" view with two sub-tabs inside.

## Approach

Use Radix Tabs inside the existing `AdminShopsView` to create two sub-tabs:
- **Boutiques** — current shops table with all existing functionality (filters, search, sort, actions, ShopDetailSheet, dialogs)
- **Vérification** — current verification table with bulk actions, status filters, verification request dialog

## Changes

### 1. `AdminShopsView.tsx`
- Import `Tabs, TabsList, TabsTrigger, TabsContent` from UI
- Import the `AdminVerificationView` component
- Wrap existing shops content in a `TabsContent value="shops"`
- Add `TabsContent value="verification"` rendering `<AdminVerificationView />`
- Add a `TabsList` with two triggers: "Boutiques" and "Vérification" at the top, styled to match the dark admin theme

### 2. `AdminSidebar.tsx`
- Remove the "verification" nav item from the "Sécurité" section
- Remove `verification` from the `AdminView` type

### 3. `AdminDashboard.tsx`
- Remove the `verification` case from `AdminView` type
- Remove the `{activeView === "verification" && <AdminVerificationView />}` render line
- Remove the `AdminVerificationView` import

### 4. `AdminVerificationView.tsx`
- No changes needed — it stays as a standalone component, just rendered inside the shops tab now

