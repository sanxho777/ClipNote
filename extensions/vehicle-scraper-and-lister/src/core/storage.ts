import type { ScrapeResult, Vehicle } from '../types';

const INVENTORY_KEY = 'vsml_inventory';

export async function addToInventory(item: ScrapeResult): Promise<void> {
  const cur = await chrome.storage.local.get(INVENTORY_KEY);
  const list: ScrapeResult[] = Array.isArray(cur[INVENTORY_KEY]) ? cur[INVENTORY_KEY] : [];
  const newList = [item, ...list].slice(0, 50);
  await chrome.storage.local.set({ [INVENTORY_KEY]: newList });
}

export async function getInventory(): Promise<ScrapeResult[]> {
  const cur = await chrome.storage.local.get(INVENTORY_KEY);
  return (cur[INVENTORY_KEY] as ScrapeResult[]) || [];
}

export async function clearInventory(): Promise<void> {
  await chrome.storage.local.remove(INVENTORY_KEY);
}

export async function lastScrape(): Promise<ScrapeResult | undefined> {
  const inv = await getInventory();
  return inv[0];
}
