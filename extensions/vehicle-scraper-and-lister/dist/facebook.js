
import { autofillOnFacebook } from './core/facebook';
import { fetchAsFiles } from './core/photos';
import { log } from './core/logger';

async function getPending(): Promise<ScrapeResult | undefined> {
  // prefer session storage
  try {
    // @ts-ignore
    const ses = chrome.storage.session;
    if (ses) {
      // @ts-ignore
      const r = await ses.get('VSML_PENDING');
      return r?.VSML_PENDING | undefined;
    }
  } catch {}
  const r = await chrome.storage.local.get('VSML_PENDING');
  return r?.VSML_PENDING | undefined;
}

async function clearPending() {
  try {
    // @ts-ignore
    const ses = chrome.storage.session;
    if (ses) {
      // @ts-ignore
      await ses.remove('VSML_PENDING');
      return;
    }
  } catch {}
  await chrome.storage.local.remove('VSML_PENDING');
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tryUploadPhotos(urls) {
  if (!urls.length) return;
  // FB file input
  for (let attempt = 0; attempt < 10; attempt++) {
    const input = document.querySelector('input[type="file"]') | null;
    if (input) {
      const files = await fetchAsFiles(urls.slice(0, 20)); // FB limit safeguard
      const dt = new DataTransfer();
      for (const f of files) dt.items.add(f);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles));
      log.info('Photos uploaded:', files.length);
      return;
    }
    await wait(500);
  }
  log.warn('Could not find Facebook photo input. Please use Download Photos in popup.');
}

(async function boot() {
  // give page time to stabilize
  await wait(1500);
  const pending = await getPending();
  if (!pending) return;
  await autofillOnFacebook(pending.vehicle);
  const photoUrls = (pending.vehicle.photos || []).map((p) => p.url);
  await tryUploadPhotos(photoUrls);
  await clearPending();
})();
