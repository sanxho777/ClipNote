# Vehicle Scraper & Marketplace Lister

## Overview

A production-ready Chrome Extension (Manifest V3) that extracts vehicle data from automotive websites and automatically fills Facebook Marketplace vehicle listings. The extension scrapes comprehensive vehicle information including specifications, dealer details, and photos from major automotive sites like AutoTrader, Cars.com, CarGurus, and Dealer.com, then seamlessly transfers this data to Facebook Marketplace with automated form filling and photo uploads.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**August 17, 2025 - TypeScript Compilation Success**
- Resolved all TypeScript compilation errors (59+ reduced to 0)
- Fixed type system issues with proper separation of RawVehicleData and normalized Vehicle types
- Implemented proper type handling for raw scraped data vs normalized vehicle data
- Fixed unused parameter warnings across all adapter files
- Corrected Chrome extension message listener return types
- Successfully achieved clean TypeScript compilation with zero errors
- Build workflow now runs successfully without compilation issues

## System Architecture

### Extension Architecture
The application follows Chrome Extension Manifest V3 architecture with:
- **Service Worker Background Script** - Handles extension lifecycle, message routing, and cross-tab communication
- **Content Scripts** - Injected into automotive websites for data scraping and Facebook Marketplace for form autofill
- **Popup UI** - Compact interface showing scrape status, results preview, and primary actions
- **Options Page** - Full-featured dashboard for inventory management, analytics, and settings

### Data Extraction Layer
**Site Adapter Pattern** - Modular scraping system with dedicated adapters for each supported site:
- AutoTrader adapter for autotrader.com vehicle detail pages
- Cars.com adapter for vehicle listing pages
- CarGurus adapter for vehicle detail pages  
- Dealer.com adapter for inventory and VDP pages
- Generic adapter with fallback heuristics for unknown sites using microdata, OpenGraph tags, and VIN regex

**Selector Probe System** - Robust element detection using multiple CSS selectors with fallback strategies for dynamic content.

### Data Processing Pipeline
**Normalization Engine** - Standardizes scraped data with:
- Text cleaning and title case formatting for make/model/trim
- Price and mileage parsing from various string formats
- VIN validation and formatting
- Photo URL cleaning and deduplication
- Vehicle specification mapping and standardization

**Photo Extraction** - Comprehensive image collection system that extracts high-resolution photos from gallery interfaces, handles various image formats, and generates absolute URLs.

### Facebook Integration
**Automated Form Filling** - Content script injection on Facebook Marketplace that:
- Detects vehicle listing form elements
- Maps scraped data to appropriate form fields
- Handles dropdown selections and text inputs
- Generates formatted descriptions with bullet points
- Uploads multiple photos programmatically

### Storage Architecture
**Local Chrome Storage** - All data stored locally using Chrome's storage API:
- Up to 50 recent scrape results with full vehicle data
- User settings and preferences
- No external servers or cloud storage
- Import/export functionality for data portability

### UI/UX Design
**Dual Interface System**:
- Compact popup (380px) for quick actions and status
- Full options page for inventory management and analytics
- Modern CSS with dark mode support
- Responsive design with consistent styling

### Build System
**TypeScript/Webpack Pipeline**:
- TypeScript compilation with strict type checking
- Webpack bundling for optimized distribution
- CSS loading and processing
- Development and production configurations
- Source map generation for debugging

## External Dependencies

### Chrome Extension APIs
- **chrome.storage.local** - Local data persistence for scrape results and settings
- **chrome.scripting** - Content script injection for scraping and autofill
- **chrome.tabs** - Tab management and URL detection
- **chrome.downloads** - Photo download functionality
- **chrome.runtime** - Message passing between scripts

### Build Dependencies
- **TypeScript** - Static typing and compilation
- **Webpack** - Module bundling and build optimization
- **Jest** - Testing framework for adapter validation
- **ESLint/Prettier** - Code quality and formatting

### Web Technologies
- **DOM APIs** - Document parsing and element manipulation
- **Fetch API** - Image validation and processing
- **File API** - Photo handling and upload preparation
- **CSS Selectors** - Element detection across different sites

### Target Websites
- **AutoTrader.com** - Vehicle detail page scraping
- **Cars.com** - Listing page data extraction  
- **CarGurus.com** - Vehicle information parsing
- **Dealer.com** - Inventory page processing
- **Facebook.com** - Marketplace form autofill integration

No external services, APIs, or databases are used - the extension operates entirely locally within the browser environment.