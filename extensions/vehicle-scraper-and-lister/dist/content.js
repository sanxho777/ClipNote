import { scrapeCurrent } from './core/scrape';

import { toast } from './core/logger';

async function runScrape() {
  const result= await scrapeCurrent(document);
  chrome.runtime.sendMessage({ type: 'VSML_SCRAPE_RESULT', payload, () => {});
  // Also stash it on the page for immediate popup retrieval
  (window).__VSML_LAST_SCRAPE__ = result;
  toast('Vehicle scraped ✓');
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'VSML_DO_SCRAPE') runScrape();
});

// Optional: expose a quick overlay button on supported pages
(function injectOverlay() {
  const btn = document.createElement('button');
  btn.textContent = 'Scrape with VSML';
  Object.assign(btn.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '2147483647',
    padding: '8px 12px',
    borderRadius: '10px',
    background: '#111827',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '12px',
    border: '1px solid #4b5563',
    boxShadow: '0 10px 30px rgba(0,0,0,.25)',
    cursor: 'pointer',
  });
  btn.addEventListener('click', runScrape);
  document.documentElement.appendChild(btn);
})();
