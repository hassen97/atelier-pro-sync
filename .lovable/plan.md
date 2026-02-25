

# Fix: Products Not Visible on POS Page (Mobile Layout Issue)

## Problem
Products ARE being fetched and rendered, but the mobile layout is broken. The parent container has a fixed height `h-[calc(100vh-8rem)]` and the grid `h-[calc(100%-5rem)]`. On mobile (single column), both the products section and cart section stack vertically within this fixed height, causing the products area to collapse to nearly zero height while the cart takes most of the space.

## Root Cause
The layout was designed for desktop (`lg:grid-cols-3`) where products and cart sit side by side. On mobile, they stack, but the fixed height container can't accommodate both sections stacked vertically.

## Solution
Remove the fixed height constraints on mobile and let the page scroll naturally. Only apply the fixed viewport height on large screens where the side-by-side layout works.

## Technical Changes

**File: `src/pages/POS.tsx`**

1. Change the outer container from `h-[calc(100vh-8rem)]` to `min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)]` so mobile scrolls naturally
2. Change the grid from `h-[calc(100%-5rem)]` to `lg:h-[calc(100%-5rem)]` so it doesn't constrain height on mobile  
3. Give the products section a minimum height on mobile: add `min-h-[50vh] lg:min-h-0` to the products column
4. Same approach for the loading skeleton container

These are purely CSS class changes -- no logic or business code is modified.

