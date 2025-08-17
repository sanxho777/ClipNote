# Vehicle Scraper & Marketplace Lister (MV3)

Local‑only Chrome Extension that scrapes vehicle details from common listing sites and autofills
Facebook Marketplace's vehicle form, including **photo upload**. No servers, no analytics.

## Quick Start

1. **Download the ZIP** from the link provided in chat and extract it, or clone/build locally.
2. In Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the extracted folder.
3. Open a supported listing page (AutoTrader, Cars.com, CarGurus, Dealer.com), click the extension icon, then **Scrape This Page**.
4. Click **Open FB & Autofill** → the extension opens Facebook Marketplace create-listing and autofills details + uploads photos.

> If Facebook's DOM changes, the extension uses defensive selectors & retries. You can tweak
> the selectors in `src/core/facebook.ts` if needed.

## Scripts

```bash
npm install
npm run lint
npm run build
npm run package
```

- `build` runs typecheck and a small build script (`scripts/build.mjs`) that bundles TS into `/dist` and copies static files.
- `package` zips a ready-to-install extension at `/release/vehicle-scraper-and-lister.zip`.

## Add a new site adapter

Create `src/adapters/<site>.ts` and register it in `src/core/scrape.ts`. Follow existing adapters for patterns.
Each adapter returns a `Partial<Vehicle>` and a list of photo URLs. Fallbacks (generic) will try metadata and regexes.

## Privacy

- No external network calls other than image fetching from the tab you’re on and Facebook.
- All logic runs locally. No analytics. No remote config.
