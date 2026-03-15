

## Plan: Fix Signup Repeater Attack Vulnerability

### Vulnerabilities Found

1. **No client-side rate limiting**: The signup form has no cooldown — an attacker can submit hundreds of requests by replaying the form submit or using tools like Burp Suite repeater.

2. **No pre-submission username/phone check**: The `check-username` edge function exists but is never called during signup. Duplicate accounts rely solely on Supabase's "already registered" error — which still creates a round-trip per attempt.

3. **REST fallback amplifies the problem**: `authFetch` in `AuthContext.tsx` retries up to 3 times on network errors, meaning one form submit can trigger up to 6 auth API calls (3 via SDK + 3 via REST fallback).

4. **No server-side throttle beyond Supabase defaults**: Supabase has built-in auth rate limits, but these are generous (30 signups/hour) and the attacker already created accounts before hitting it.

### Fixes

#### 1. Client-side rate limiting in `Auth.tsx`
- Add a cooldown timer (30 seconds) after each signup attempt
- Track `lastSignupAttempt` timestamp in state
- Disable the submit button during cooldown with a countdown display
- This blocks casual repeater attacks from the UI

#### 2. Pre-check username + phone uniqueness before signup
- Call the existing `check-username` edge function before calling `signUp()`
- If username or phone already exists, show error immediately without hitting auth API
- This reduces unnecessary auth API calls

#### 3. Add server-side rate limiting via edge function
- Create a new `signup-guard` edge function that:
  - Checks IP-based rate limiting using a `signup_attempts` table (max 5 signups per IP per hour)
  - Validates username format server-side (Zod)
  - Returns 429 if rate limit exceeded
- Call this guard before `supabase.auth.signUp()`

#### 4. Reduce REST fallback retries
- In `AuthContext.tsx`, reduce `authFetch` retry count from 3 to 1 for signup specifically
- Add a flag to prevent double-submission (mutex)

### Files Modified

| File | Change |
|---|---|
| `src/pages/Auth.tsx` | Add cooldown timer, pre-check username/phone, disable button during cooldown |
| `src/contexts/AuthContext.tsx` | Add signup mutex to prevent concurrent calls, reduce retry for signup |
| `supabase/functions/signup-guard/index.ts` | New edge function for IP-based rate limiting |
| `supabase/config.toml` | Register new edge function |
| Migration SQL | Create `signup_attempts` table for tracking IP-based rate limits |

### Technical Details

**Cooldown mechanism** (Auth.tsx):
```tsx
const [signupCooldown, setSignupCooldown] = useState(0);

const handleRegister = async (e) => {
  if (signupCooldown > 0) return;
  // ... existing validation
  // Pre-check username
  const { exists } = await checkUsername(registerUsername);
  if (exists) { setError("Ce nom d'utilisateur est déjà pris"); return; }
  // ... signup logic
  setSignupCooldown(30); // 30s cooldown
};
```

**signup_attempts table**:
```sql
CREATE TABLE public.signup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_signup_attempts_ip ON signup_attempts(ip_address, created_at);
-- Auto-cleanup old records
```

**Edge function rate check**:
- Count attempts from same IP in last hour
- If > 5, return 429
- Otherwise insert new attempt and return 200

