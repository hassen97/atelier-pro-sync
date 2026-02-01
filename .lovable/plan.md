
# Fix SPA Routing 404 Error on Page Refresh

## Problem
When refreshing the page on any route (like `/settings`) or accessing it directly without being logged in, the hosting provider returns a 404 error instead of letting React Router handle the route.

This happens because:
1. SPAs use client-side routing (React Router)
2. When you refresh, the browser requests `/settings` from the server
3. The server doesn't have a `/settings` file, so it returns 404
4. The server needs to be told to serve `index.html` for ALL routes

## Solution
Add configuration files for the hosting provider to redirect all routes to `index.html`, allowing React Router to handle routing.

## Files to Create

### 1. `public/_redirects` (for Netlify-style hosting)
```text
/*    /index.html   200
```

### 2. `public/vercel.json` (for Vercel hosting)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 3. `vercel.json` (root level - primary for Vercel deployments)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Why Multiple Files?
Different hosting providers use different configuration files:
- **Lovable hosting**: Usually handles this automatically
- **Netlify**: Uses `_redirects` file in public folder
- **Vercel**: Uses `vercel.json` at root level
- **Custom hosting**: May need server configuration (nginx, Apache)

## Technical Details

| File | Location | Purpose |
|------|----------|---------|
| `_redirects` | `public/` | Netlify SPA routing |
| `vercel.json` | root | Vercel SPA routing |

The `/*` or `(.*)` pattern matches all routes and serves `index.html` with a 200 status, allowing React Router to take over client-side routing.

## After Implementation
- Refreshing on `/settings` will load the app correctly
- React Router will then either:
  - Show the login page (if not authenticated)
  - Show the settings page (if authenticated)
