
# Change Website Favicon

## Objective
Replace the default browser tab icon with the uploaded "RepairPro TN" logo image.

## Changes Required

### 1. Copy the uploaded image to the project
- Copy the uploaded image from `user-uploads://Gemini_Generated_Image_v2pu72v2pu72v2pu.png` to `public/favicon.png`
- Using the public folder since favicons are referenced directly in HTML meta tags

### 2. Update index.html
- Add a `<link rel="icon">` tag pointing to the new favicon
- Update the document title from "Lovable App" to "RepairPro TN" to match your branding
- Update the meta description and Open Graph tags for consistency

## Files to Modify

| File | Change |
|------|--------|
| `public/favicon.png` | New file - copy uploaded image |
| `index.html` | Add favicon link + update title and meta tags |

## Technical Details

```html
<!-- Add to <head> section -->
<link rel="icon" type="image/png" href="/favicon.png" />
<title>RepairPro TN</title>
<meta name="description" content="RepairPro TN - Mobile Phone Repair Management" />
<meta property="og:title" content="RepairPro TN" />
<meta property="og:description" content="RepairPro TN - Mobile Phone Repair Management" />
```

## Result
After this change, your browser tab will display the RepairPro TN logo instead of the default icon, and the page title will reflect your brand name.
