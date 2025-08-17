

const INVENTORY_KEY = 'vsml_inventory';

export async function addToInventory(item)= await chrome.storage.local.get(INVENTORY_KEY);
  const list= Array.isArray(cur[INVENTORY_KEY]) ? cur[INVENTORY_KEY] ;
  const newList = [item, ...list].slice(0, 50);
  await chrome.storage.local.set({ [INVENTORY_KEY]);
}

export async function getInventory()= await chrome.storage.local.get(INVENTORY_KEY);
  return (cur[INVENTORY_KEY]) || [];
}

export async function clearInventory(): Promise<void> {
  await chrome.storage.local.remove(INVENTORY_KEY);
}

export async function lastScrape()= await getInventory();
  return inv[0];
}
