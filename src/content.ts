import { ScrapeResult } from './types';
import { ScrapingEngine } from './core/scrape';
import { Logger } from './core/logger';
import { FacebookAutofiller } from './core/facebook';

const logger = new Logger('Content');
let scrapingEngine: ScrapingEngine;
let facebookAutofiller: FacebookAutofiller | null = null;

// Initialize based on the current site
function initialize() {
  const hostname = window.location.hostname;
  logger.info('Initializing content script on:', hostname);
  
  if (hostname.includes('facebook.com')) {
    // Initialize Facebook autofiller
    facebookAutofiller = new FacebookAutofiller();
    initializeFacebookAutofill();
  } else {
    // Initialize scraping engine for vehicle sites
    scrapingEngine = new ScrapingEngine();
    initializeVehicleScraping();
  }
}

function initializeVehicleScraping() {
  // Add scraping functionality to window object for background script access
  (window as any).vehicleScraper = {
    scrape: async (): Promise<ScrapeResult | null> => {
      try {
        return await scrapingEngine.scrapeCurrentPage();
      } catch (error) {
        logger.error('Scraping failed:', error);
        return null;
      }
    }
  };
  
  // Add visual indicator that the page is scrapable
  addScrapeIndicator();
}

function initializeFacebookAutofill() {
  // Check if we have autofill data
  const autofillData = (window as any).vehicleAutofillData;
  
  if (autofillData && facebookAutofiller) {
    logger.info('Starting Facebook autofill with data:', autofillData);
    
    // Wait for the page to be ready
    setTimeout(() => {
      facebookAutofiller!.autofillForm(autofillData).catch(error => {
        logger.error('Autofill failed:', error);
      });
    }, 3000);
  }
  
  // Listen for autofill data from background script
  window.addEventListener('message', (event) => {
    if (event.data.type === 'AUTOFILL_VEHICLE_DATA' && facebookAutofiller) {
      facebookAutofiller.autofillForm(event.data.scrapeResult).catch(error => {
        logger.error('Autofill failed:', error);
      });
    }
  });
}

function addScrapeIndicator() {
  // Check if this looks like a vehicle detail page
  const isVehiclePage = scrapingEngine.isVehiclePage(window.location.href);
  
  if (!isVehiclePage) {
    return;
  }
  
  // Create a small floating indicator
  const indicator = document.createElement('div');
  indicator.id = 'vehicle-scraper-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1877f2;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  indicator.textContent = '🚗 Scrapable';
  
  indicator.addEventListener('mouseenter', () => {
    indicator.style.transform = 'scale(1.05)';
  });
  
  indicator.addEventListener('mouseleave', () => {
    indicator.style.transform = 'scale(1)';
  });
  
  indicator.addEventListener('click', () => {
    // Open the extension popup programmatically (if possible) or show a message
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
  });
  
  document.body.appendChild(indicator);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.style.opacity = '0.3';
    }
  }, 5000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  logger.debug('Content script received message:', message);
  
  switch (message.type) {
    case 'PAGE_LOADED':
      // Page finished loading, ensure initialization
      if (!scrapingEngine && !facebookAutofiller) {
        initialize();
      }
      return false;
      
    case 'SCRAPE_NOW':
      if (scrapingEngine) {
        scrapingEngine.scrapeCurrentPage()
          .then(result => sendResponse({ success: true, result }))
          .catch(error => sendResponse({ error: error.message }));
        return true; // Keep message channel open
      }
      return false;
      
    case 'AUTOFILL_FACEBOOK':
      if (facebookAutofiller) {
        facebookAutofiller.autofillForm(message.scrapeResult)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ error: error.message }));
        return true; // Keep message channel open
      }
      return false;
      
    default:
      return false;
  }
});

// Initialize when the script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Also initialize when navigation happens (SPA sites)
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    setTimeout(initialize, 1000); // Give SPA time to render
  }
}).observe(document, { subtree: true, childList: true });
