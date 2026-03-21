
## Mutual Aid & Chat Hub ("Entraide + Messagerie")

### What's being built
A community feature spanning 4 new DB tables, 2 new pages (`/communaute`, `/messages`), 2 new hooks, and updates to the sidebar + notifications.

---

### Database Migration (3 tables)

**`community_posts`** — The social feed board:
```sql
id, user_id (poster's shop owner id), shop_id (shop_settings.id),
type (enum: 'looking_for_part' | 'surplus_stock' | 'technical_advice'),
title text, body text,
city text (from shop_settings),
is_reported boolean default false,
created_at, updated_at
```
RLS: Any authenticated user can SELECT. Only owner (user_id = auth.uid()) can INSERT/UPDATE/DELETE. Platform admin can see all.

**`conversations`** — Tracks 1-on-1 threads between two shop owners:
```sql
id, participant_a uuid (user_id), participant_b uuid (user_id),
post_id uuid (optional ref — which post started the convo), created_at
```
RLS: SELECT/INSERT only if auth.uid() = participant_a OR participant_b.

**`messages`** — Chat messages inside a conversation:
```sql
id, conversation_id uuid FK → conversations.id,
sender_id uuid, body text, is_read boolean default false, created_at
```
RLS: SELECT/INSERT only if auth.uid() is a participant in the linked conversation (via `EXISTS` subquery on conversations table).

Enable Realtime on `messages` table.

No subscription gate — these tables are completely open to all authenticated users.

---

### New Files

**`src/hooks/useCommunity.ts`**
- `useCommunityPosts(filter?)` — paginated feed (20/page), sorted by `created_at DESC`
- `useCreatePost()` mutation
- `useReportPost()` mutation (sets `is_reported = true`)
- `useConversations()` — lists all convos for current user, with latest message preview + unread count
- `useMessages(conversationId)` — fetches messages with realtime subscription on `messages` channel
- `useSendMessage()` mutation
- `useStartConversation(postId, recipientId)` — finds or creates a conversation, returns its id
- `useUnreadMessageCount()` — sum of unread messages across all conversations (for the badge)

**`src/pages/Communaute.tsx`**
- Page header: "🤝 Entraide & Communauté" with "Nouvelle demande" button
- Filter bar: 3 pill buttons (Tout / Recherche Pièce / Surplus Stock / Conseil Technique)
- Feed: Masonry-style or stacked cards — each card shows:
  - Post type badge (color-coded pill)
  - Title + truncated body
  - Shop name + City + "il y a X" relative time
  - "Contacter la boutique" button → calls `useStartConversation` → navigates to `/messages?id=<convId>`
  - "Signaler" button (small, subtle)
- Empty state with CTA to create first post
- `CreatePostDialog` — modal with type selector, title, body fields

**`src/pages/Messages.tsx`**
- Split-pane layout: left = conversation list, right = active chat
- Conversation list: avatar (initials), shop name, last message preview, unread count badge, "il y a X" timestamp
- Chat pane: scrollable message bubbles (own messages right/blue, theirs left/gray), input + send button at bottom
- Realtime: new messages appear instantly via Supabase channel subscription
- If `?id=` query param present, auto-opens that conversation

---

### Modified Files

**`src/App.tsx`**
- Add lazy routes: `/communaute` and `/messages` inside the protected `<MainLayout>` wrapper

**`src/components/layout/AppSidebar.tsx`**
- Add two new nav items to the `navigation` array:
  - `{ nameKey: "nav.community", href: "/communaute", icon: Users2 }`
  - `{ nameKey: "nav.messages", href: "/messages", icon: MessageCircle }` with unread badge overlay
- The messages icon gets a red dot if `unreadCount > 0` (from `useUnreadMessageCount`)

**`src/components/layout/MainLayout.tsx`**
- Add a chat/messages icon button in the top header bar (next to Bell), with unread badge
- Clicking it navigates to `/messages`

**`src/contexts/I18nContext.tsx`**
- Add translation keys: `"nav.community": "Entraide"` and `"nav.messages": "Messages"`

**`src/hooks/useTeam.ts` — `ALL_PAGES`**
- Add `/communaute` and `/messages` to `ALL_PAGES` so employees can be granted access

**Ultra Admin — `src/components/admin/AdminShopsView.tsx` or a new `AdminCommunityView.tsx`**
- A simple "Posts signalés" tab listing `community_posts` where `is_reported = true`, with a delete/dismiss action
- Added as a new `activeView === "community"` panel in `AdminDashboard.tsx`
- New sidebar item in Admin panel: "Communauté" under the "Engagement" group

---

### Technical Details

**Realtime**: Subscribe to the `messages` table filtered by `conversation_id` inside `useMessages`. Use `supabase.channel('messages-<convId>').on('postgres_changes', ...)`. Mark messages as read when the chat pane is open.

**Unread Count**: Query `SELECT COUNT(*) FROM messages WHERE is_read = false AND sender_id != auth.uid() AND conversation_id IN (SELECT id FROM conversations WHERE participant_a = auth.uid() OR participant_b = auth.uid())`.

**City field**: Read from `shop_settings.address` (parsed) or add a `city` column read from profile metadata. Simpler: display `shop_settings.shop_name` + country as location fallback.

**No subscription gate**: Community pages bypass `PremiumFeature` entirely. The routes are added unconditionally.

**Post identity**: Posts join with `shop_settings` on `user_id` to show shop name and city. Uses the same `effectiveUserId` pattern so employees posting on behalf of their shop show the shop's identity.

---

### Implementation Order
1. DB Migration (3 tables + RLS + realtime)
2. `useCommunity.ts` hook
3. `Communaute.tsx` page + `CreatePostDialog` component
4. `Messages.tsx` page (split-pane chat)
5. Sidebar + header updates (nav items + unread badge)
6. i18n keys
7. App.tsx routes
8. Admin moderation view
