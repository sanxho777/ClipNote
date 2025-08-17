import type { ScrapeResult } from '../types';

const $ = (s: string) => document.querySelector(s) as HTMLElement;

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab.id!;
}

async function requestScrape(tabId: number): Promise<ScrapeResult | undefined> {
  await chrome.tabs.sendMessage(tabId, { type: 'VSML_DO_SCRAPE' });
  // poll page variable
  const res = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => (window as any).__VSML_LAST_SCRAPE__,
  });
  const result = res[0]?.result as ScrapeResult | undefined;
  return result;
}

function render(res?: ScrapeResult) {
  if (!res) return;
  $('#source').textContent = res.vehicle.source || '—';
  const title = [res.vehicle.year, res.vehicle.make, res.vehicle.model, res.vehicle.trim]
    .filter(Boolean)
    .join(' ');
  $('#title').textContent = title || '—';
  $('#price').textContent = res.vehicle.price ? `$${res.vehicle.price.toLocaleString()}` : '—';
  $('#mileage').textContent = res.vehicle.mileage ? res.vehicle.mileage.toLocaleString() : '—';
  $('#vin').textContent = res.vehicle.vin || '—';
  $('#photos').textContent = String(res.vehicle.photos?.length || 0);
  $('#warn').textContent = res.warnings.join('\n');
}

let lastResult: ScrapeResult | undefined;

document.getElementById('scrape')!.addEventListener('click', async () => {
  const tabId = await getActiveTabId();
  const res = await requestScrape(tabId);
  if (res) {
    lastResult = res;
    render(res);
  }
});

document.getElementById('openfb')!.addEventListener('click', async () => {
  if (!lastResult) {
    const tabId = await getActiveTabId();
    const res = await requestScrape(tabId);
    if (res) lastResult = res; else return;
  }
  await chrome.runtime.sendMessage({ type: 'VSML_OPEN_FB', payload: lastResult });
});

document.getElementById('dlphotos')!.addEventListener('click', async () => {
  if (!lastResult) return;
  const urls = (lastResult.vehicle.photos || []).map((p) => p.url);
  await chrome.runtime.sendMessage({ type: 'VSML_DOWNLOAD_PHOTOS', payload: { urls } });
});

document.getElementById('full')!.addEventListener('click', async () => {
  await chrome.runtime.openOptionsPage();
});

// Try to show existing scrape if content script already ran
(async () => {
  const tabId = await getActiveTabId();
  const res = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => (window as any).__VSML_LAST_SCRAPE__,
  });
  const result = res[0]?.result as ScrapeResult | undefined;
  if (result) {
    lastResult = result;
    render(result);
  }
})();
