# Vehicle Scraper & Marketplace Lister

A production-ready Chrome Extension (Manifest V3) that extracts vehicle data from automotive websites and auto-fills Facebook Marketplace vehicle listings with photos.

## Features

### 🚗 Multi-Site Vehicle Scraping
- **AutoTrader.com** - Complete vehicle detail extraction
- **Cars.com** - Individual vehicle listings
- **CarGurus.com** - Vehicle detail pages  
- **Dealer.com** - Inventory and vehicle pages
- **Generic sites** - Fallback heuristics for unknown sites

### 📝 Facebook Marketplace Auto-Fill
- Opens Facebook Marketplace vehicle creation form
- Auto-fills all vehicle details (year, make, model, price, etc.)
- Automatically uploads all scraped photos
- Formats descriptions with bullet points and dealer info
- Handles VIN validation and data normalization

### 📊 Data Management
- Local storage of up to 50 recent scrapes
- Search and filter scraped vehicles
- Export/import data as JSON
- Analytics and statistics dashboard
- Dark mode support

### 🔒 Privacy & Security
- **100% local operation** - No external servers or analytics
- No data transmission to third parties
- Minimal required permissions
- All data stored locally in browser

## Installation

### Method 1: Developer Mode (Recommended)

1. **Download the extension:**
   ```bash
   git clone <repository-url>
   cd vehicle-scraper-marketplace-lister
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```

4. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked" 
   - Select the `dist` folder

### Method 2: Package Installation

1. **Create release package:**
   ```bash
   npm run package
   ```

2. **Install the ZIP:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Drag the ZIP file from `/release` folder to the extensions page

## Usage

### Basic Scraping

1. **Navigate to a vehicle page** on any supported automotive website
2. **Click the extension icon** in Chrome toolbar
3. **Press "Scrape This Page"** - The extension will extract all vehicle data
4. **Review the results** - Check extracted details and photos
5. **Click "Open FB & Autofill"** - Opens Facebook Marketplace with pre-filled form

### Advanced Features

#### Full Application Interface
- Click "Open Full App" for complete inventory management
- View analytics, search/filter vehicles, manage settings

#### Photo Management
- Photos are automatically uploaded to Facebook
- If upload fails, photos are downloaded for manual upload
- Use "Download Photos" button for manual backup

#### Settings Configuration
- Configure default vehicle condition (Used/New/Certified)
- Enable/disable automatic photo upload
- Adjust maximum photo upload limit
- Enable/disable specific automotive sites

## Supported Data Fields

### Vehicle Information
- Year, Make, Model, Trim
- Price and Mileage
- VIN (17-character validation)
- Exterior/Interior Colors
- Transmission, Drivetrain, Engine
- Fuel Type, Body Style
- Stock Number (when available)

### Dealer Information
- Dealer Name and Phone
- Location (City, State, ZIP)
- Contact Information

### Photos
- High-resolution gallery images
- Automatic deduplication
- Supports lazy-loaded images
- Extracts from srcset attributes

## Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Lint code (must pass with 0 errors)
npm run lint

# Format code
npm run format

# Create release package
npm run package

# Run tests
npm test
