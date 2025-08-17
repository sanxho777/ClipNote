import type { ScrapeResult } from '../types';
import { getInventory, clearInventory } from '../core/storage';

const $ = (s: string) => document.querySelector(s) as HTMLElement;

function rowHtml(r: ScrapeResult): string {
  const v = r.vehicle;
  const title = [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ');
  return `<tr>
    <td>${title || '—'}</td>
    <td>${v.price ? '$' + v.price.toLocaleString() : '—'}</td>
    <td>${v.mileage ? v.mileage.toLocaleString() : '—'}</td>
    <td>${v.vin || '—'}</td>
    <td>${v.photos?.length || 0}</td>
    <td><a href="${v.sourceUrl}" target="_blank" rel="noreferrer">${v.source || '—'}</a></td>
  </tr>`;
}

function renderStats(list: ScrapeResult[]) {
  const prices = list.map((x) => x.vehicle.price || 0).filter(Boolean);
  const total = prices.reduce((a, b) => a + b, 0);
  const avg = prices.length ? Math.round(total / prices.length) : 0;
  $('#stats').textContent = `Count: ${list.length} • Avg Price: $${avg.toLocaleString()} • Total: $${total.toLocaleString()}`;
}

async function refresh() {
  const list = await getInventory();
  const tbody = document.querySelector('#table tbody')! as HTMLElement;
  tbody.innerHTML = list.map(rowHtml).join('');
  renderStats(list);
}

document.getElementById('refresh')!.addEventListener('click', refresh);
document.getElementById('export')!.addEventListener('click', async () => {
  const list = await getInventory();
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vsml_inventory.json';
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('import')!.addEventListener('change', async (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files || !files.length) return;
  const text = await files[0].text();
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      await chrome.storage.local.set({ vsml_inventory: data });
      await refresh();
    }
  } catch {}
});
document.getElementById('clear')!.addEventListener('click', async () => {
  await clearInventory();
  await refresh();
});

refresh();
