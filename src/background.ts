import { ScrapeResult, StorageData } from './types';
import { Logger } from './core/logger';

const logger = new Logger('Background');

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  logger.info('Extension installed');
  
  // Initialize storage with default settings
  const defaultData: StorageData = {
    scrapeResults: [],
    settings: {
      autofillOptions: {
        condition: 'Used',
        uploadPhotos: true,
        maxPhotos: 20
      },
      enabledSites: ['autotrader.com', 'cars.com', 'cargurus.com', 'dealer.com']
    }
  };
  
  chrome.storage.local.set(defaultData).catch(err => {
    logger.error('Failed to initialize storage:', err);
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('Received message:', message);
  
  switch (message.type) {
    case 'SCRAPE_PAGE':
      handleScrapeRequest(sender.tab?.id, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'DOWNLOAD_PHOTOS':
      handlePhotoDownload(message.photos, sendResponse);
      return true;
      
    case 'OPEN_FACEBOOK_MARKETPLACE':
      handleFacebookOpen(message.scrapeResult, sendResponse);
      return true;
      
    default:
      logger.warn('Unknown message type:', message.type);
      return false;
  }
});

async function handleScrapeRequest(tabId: number | undefined, sendResponse: (response: any) => void) {
  if (!tabId) {
    sendResponse({ error: 'No active tab' });
    return;
  }
  
  try {
    // Inject scraping script into the current tab
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // This will be replaced by the actual scraping logic
        return (window as any).vehicleScraper?.scrape();
      }
    });
    
    const scrapeResult = results[0]?.result;
    
    if (scrapeResult) {
      // Store the result
      await saveScrapeResult(scrapeResult);
      sendResponse({ success: true, result: scrapeResult });
    } else {
      sendResponse({ error: 'No data scraped from this page' });
    }
  } catch (error) {
    logger.error('Scrape request failed:', error);
    sendResponse({ error: 'Failed to scrape page: ' + (error as Error).message });
  }
}

async function handlePhotoDownload(photos: string[], sendResponse: (response: any) => void) {
  try {
    const downloadPromises = photos.map((url, index) => {
      const filename = `vehicle_photo_${index + 1}.jpg`;
      return chrome.downloads.download({
        url,
        filename: `vehicle_photos/${filename}`,
        saveAs: false
      });
    });
    
    await Promise.all(downloadPromises);
    sendResponse({ success: true, count: photos.length });
  } catch (error) {
    logger.error('Photo download failed:', error);
    sendResponse({ error: 'Failed to download photos: ' + (error as Error).message });
  }
}

async function handleFacebookOpen(scrapeResult: ScrapeResult, sendResponse: (response: any) => void) {
  try {
    // Open Facebook Marketplace create listing page
    const fbUrl = 'https://www.facebook.com/marketplace/create/vehicle';
    
    const tab = await chrome.tabs.create({ url: fbUrl });
    
    // Wait a moment for the page to load, then inject autofill script
    setTimeout(async () => {
      if (tab.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (data) => {
              // Store the scrape result for the Facebook content script to use
              (window as any).vehicleAutofillData = data;
            },
            args: [scrapeResult]
          });
          
          sendResponse({ success: true, tabId: tab.id });
        } catch (error) {
          logger.error('Failed to inject autofill data:', error);
          sendResponse({ error: 'Failed to prepare autofill data' });
        }
      }
    }, 2000);
    
  } catch (error) {
    logger.error('Facebook open failed:', error);
    sendResponse({ error: 'Failed to open Facebook Marketplace: ' + (error as Error).message });
  }
}

async function saveScrapeResult(result: ScrapeResult): Promise<void> {
  try {
    const data = await chrome.storage.local.get('scrapeResults');
    const scrapeResults: ScrapeResult[] = data.scrapeResults || [];
    
    // Add new result to the beginning and limit to 50
    scrapeResults.unshift(result);
    if (scrapeResults.length > 50) {
      scrapeResults.splice(50);
    }
    
    await chrome.storage.local.set({ scrapeResults });
    logger.info('Saved scrape result:', result.id);
  } catch (error) {
    logger.error('Failed to save scrape result:', error);
  }
}

// Handle tab updates to inject content scripts on supported sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const supportedSites = [
      'autotrader.com',
      'cars.com',
      'cargurus.com',
      'dealer.com'
    ];
    
    const isSupported = supportedSites.some(site => tab.url!.includes(site));
    
    if (isSupported) {
      // Content script should already be injected via manifest, but we can notify it
      chrome.tabs.sendMessage(tabId, { type: 'PAGE_LOADED' }).catch(() => {
        // Ignore errors if content script isn't ready yet
      });
    }
  }
});
