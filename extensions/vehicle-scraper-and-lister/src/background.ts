import type { ScrapeResult } from './types';
import { addToInventory, lastScrape } from './core/storage';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'VSML_SCRAPE_RESULT') {
      await addToInventory(msg.payload as ScrapeResult);
      sendResponse({ ok: true });
      return;
    }
    if (msg?.type === 'VSML_OPEN_FB') {
      // open Facebook Marketplace create listing
      const url = 'https://www.facebook.com/marketplace/create/vehicle';
      const tab = await chrome.tabs.create({ url });
      // store payload temporarily in session storage using chrome.storage.session if available
      const payload = msg.payload as ScrapeResult;
      try {
        // @ts-ignore
        const ses = chrome.storage.session;
        if (ses) {
          // @ts-ignore
          await ses.set({ VSML_PENDING: payload });
        } else {
          await chrome.storage.local.set({ VSML_PENDING: payload });
        }
      } catch {
        await chrome.storage.local.set({ VSML_PENDING: payload });
      }
      sendResponse({ ok: true, tabId: tab.id });
      return;
    }
    if (msg?.type === 'VSML_DOWNLOAD_PHOTOS') {
      const urls: string[] = msg.payload.urls;
      for (const url of urls) {
        await chrome.downloads.download({ url, saveAs: false });
      }
      sendResponse({ ok: true, count: urls.length });
      return;
    }
  })();
  // async response
  return true;
});
