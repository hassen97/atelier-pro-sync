

# Add Sitemap.xml and Google Search Console Verification

## What will be done

### 1. Google Search Console Verification File
The uploaded file `googlec592a1b4f388acf9.html` will be placed in the `public/` folder so it's accessible at `https://atelier-pro-sync.lovable.app/googlec592a1b4f388acf9.html`. This allows Google to verify you own the site.

### 2. Sitemap.xml
A `public/sitemap.xml` file will be created listing all the public pages of your site. Since RepairPro TN is a single-page app with authentication, only the public-facing URLs will be included:
- `https://atelier-pro-sync.lovable.app/` (homepage/login)
- `https://atelier-pro-sync.lovable.app/auth` (authentication page)

### 3. Updated robots.txt
The existing `public/robots.txt` will be updated to reference the sitemap location, helping search engines find it automatically.

---

### Technical details

**Files created:**
- `public/googlec592a1b4f388acf9.html` - Google verification file (copied from upload)
- `public/sitemap.xml` - XML sitemap with public URLs and lastmod date

**Files modified:**
- `public/robots.txt` - Add `Sitemap: https://atelier-pro-sync.lovable.app/sitemap.xml` directive

**After implementation:** You should publish the app, then go to Google Search Console to:
1. Verify site ownership using the HTML file
2. Submit the sitemap URL
3. Use the URL Removal tool to remove the old "Heaven Coin" pages from search results

