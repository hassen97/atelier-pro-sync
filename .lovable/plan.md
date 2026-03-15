

# Math Challenge Security Layer for Login & Signup

## Overview
Add a simple math equation challenge to both login and signup forms. The challenge is generated server-side, signed with HMAC to prevent tampering, and verified on both client and server.

## How It Works

```text
Client                           Server (signup-guard / new login-guard)
  │                                  │
  │  1. GET math challenge           │
  │  ─────────────────────────►      │
  │                                  │
  │  { question: "7 + 3 = ?",       │
  │    challengeId: "hmac_signed" }  │
  │  ◄─────────────────────────      │
  │                                  │
  │  2. User solves: answer=10       │
  │  POST with answer+challengeId   │
  │  ─────────────────────────►      │
  │                                  │
  │  Server recomputes HMAC,         │
  │  verifies answer matches         │
  │  ─────────────────────────►      │
```

## Math Equation Design
- Simple operations: addition (a + b), subtraction (a - b), multiplication (a × b)
- Numbers range: 1-20 for add/subtract, 2-9 for multiply
- Always positive results (for subtraction, ensure a > b)
- Challenge is encoded as: `base64(operand1:operator:operand2):hmac_signature`
- HMAC uses `SUPABASE_SERVICE_ROLE_KEY` as secret — no new secrets needed

## Changes

### 1. New Edge Function: `math-challenge`
- **GET**: Generate a random math equation, return `{ question, challengeId }` where challengeId = `base64(a:op:b):hmac`
- **POST**: Verify `{ challengeId, answer }` — recompute HMAC, solve equation, compare answer

### 2. Update `signup-guard` Edge Function
- Accept `mathChallengeId` + `mathAnswer` in the request body
- Verify the math challenge server-side before proceeding
- Block if math answer is wrong (`reason: "math_failed"`)

### 3. Update `Auth.tsx` — Both Login & Signup Forms
- On form mount / after each submission, fetch a new math challenge from `math-challenge`
- Display the equation (e.g., "7 + 3 = ?") with an input field for the answer
- Client-side pre-validation: check answer is a number
- For **signup**: send `mathChallengeId` + `mathAnswer` to `signup-guard`
- For **login**: verify via a direct call to `math-challenge` POST endpoint before calling `signIn`

### 4. Config Update: `supabase/config.toml`
- Add `[functions.math-challenge]` with `verify_jwt = false`

## Security Properties
- HMAC-signed challenge prevents forging/replaying challenges
- Server-side verification on both login and signup paths
- Challenge expires implicitly (new one fetched each time)
- No database storage needed — stateless HMAC verification

