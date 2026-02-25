
# Fix: Edge Function "create-employee" - Non-2xx Status Code

## Root Cause Identified

The error "Edge Function returned a non-2xx status code" occurs because of a JWT verification incompatibility. Lovable Cloud signs JWT tokens using **ES256** algorithm, but the anon client (`SUPABASE_ANON_KEY`) cannot properly validate these tokens when calling `anonClient.auth.getUser(token)`.

When `getUser()` fails (returns an error), the function returns a **401 Unauthorized** response — which is the non-2xx status code the user sees.

## The Fix

In `supabase/functions/create-employee/index.ts`, change the user validation to use the **admin/service role client** to call `getUser()`. The admin client uses the service role key which can properly validate any token regardless of signing algorithm.

This is a one-line change — replace:
```typescript
const { data: userData, error: authError } = await anonClient.auth.getUser(token);
```
with:
```typescript
const { data: userData, error: authError } = await adminClient.auth.getUser(token);
```

But to do this cleanly, we need to initialize the `adminClient` **before** the auth check, so it can be reused for both token validation and later operations.

## Technical Details

### File: `supabase/functions/create-employee/index.ts`

1. Move `adminClient` creation to the top of the request handler (before auth check)
2. Use `adminClient.auth.getUser(token)` instead of `anonClient.auth.getUser(token)` for token validation
3. Keep `anonClient` only for the role check (it uses the user's own token so RLS applies correctly)

The `adminClient` uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses JWT algorithm restrictions and can always validate any valid session token.

### Why this works
- The service role client calls Supabase's internal auth service with admin privileges
- It can validate ES256 tokens that the anon client cannot
- The anon client is still used for the role check to respect RLS policies
- No other changes needed in the frontend or config

### Redeploy
After fixing the code, the edge function will be automatically redeployed.
