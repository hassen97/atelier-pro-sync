

# Add Search and Sorting to Shop Owners Table

## Changes to `src/components/admin/AdminShopsView.tsx`

### 1. Search Bar
- Add a search input field (with a Search icon) between the filter buttons and the table
- Search will filter by shop name, owner name, or username (case-insensitive)

### 2. Sortable Columns
- Make the "Boutique" (shop name) and "Statut" (status/last online) column headers clickable
- Clicking toggles between ascending, descending, and no sort
- Add a small arrow indicator (chevron up/down) next to the active sort column
- Sort by name: alphabetical A-Z / Z-A
- Sort by status: online first, then away, then offline (or reversed)

### Technical Details

**State additions:**
- `search` (string) for filtering
- `sortKey` ("name" | "status" | null) and `sortDir` ("asc" | "desc") for sorting

**Flow:**
1. Filter owners by the smart filter buttons (existing)
2. Then filter by search text
3. Then sort by the selected column
4. Render the final list

Only one file is modified: `src/components/admin/AdminShopsView.tsx`

