## Why your QR code prints inconsistently

I found the root cause in `src/lib/receiptPdf.ts`. The receipt currently builds the QR code as a **remote image URL**:

```
https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=...
```

Then the print window opens and triggers `window.print()` after a fixed **400 ms delay**.

This causes the "sometimes shows, sometimes doesn't" behavior, because **3 separate things have to all succeed within 400 ms**:

1. The browser must download the image from `api.qrserver.com` (third-party server)
2. The image must finish decoding
3. The print dialog must capture it before the user clicks Print

**Things that make it fail:**
- Slow shop Wi-Fi or mobile data → image isn't loaded yet when print fires → blank space on receipt
- `api.qrserver.com` being slow, rate-limited, or briefly down → no QR
- Browser print dialog opening faster than the image loads → QR missing
- Same logo/QR works the second time because the browser cached it

The barcode (REP-xxxxx) doesn't have this problem because it's already generated **locally** as a base64 data URL using `jsbarcode`. We need to do the same thing for the QR code.

## The fix

Generate the QR code **locally in the browser** as a base64 PNG data URL — exactly like the existing `generateBarcodeDataUrl()` function does for the barcode. The image will then be embedded directly in the HTML, requiring no network call, and will be ready instantly when the print dialog opens.

### Steps

1. **Add the `qrcode` library** (lightweight, ~15 KB, works offline, already a peer of many React tools).
2. **Create a helper** `generateQrDataUrl(value: string)` next to the existing `generateBarcodeDataUrl()` in `src/lib/receiptPdf.ts`. It will use dynamic import (same pattern as jsbarcode) so it doesn't bloat the main bundle.
3. **Replace the remote URL block** (lines 170–175) so `qrImgTag` uses the locally-generated data URL instead of the `api.qrserver.com` link.
4. **Bump the print delay safety net**: also wait for all `<img>` elements in the print window to finish loading before calling `window.print()`. This protects the shop logo too (which is also a remote image and can suffer the same issue on slow networks).

### Bonus reliability improvements (small, same file)

- If QR generation fails for any reason, fall back to printing the tracking URL as text so the customer can still type it.
- Use `printWindow.addEventListener("load", ...)` plus an image-readiness check instead of the blind 400 ms `setTimeout`.

## Files to change

- `src/lib/receiptPdf.ts` — add `generateQrDataUrl`, swap the QR `<img>` source, harden `printThermalHtml` to wait for images.
- `package.json` — add `qrcode` and `@types/qrcode` as dependencies.

## What you'll see after

- QR code prints **every time**, including offline or on slow shop Wi-Fi.
- Logo also prints more reliably.
- No more dependency on the third-party `api.qrserver.com` service.
- Receipts feel slightly snappier because there's no network round-trip.

No database, no edge function, no UI changes — purely a fix in the receipt generation utility.