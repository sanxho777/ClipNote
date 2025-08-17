
import { log } from './logger';

export async function waitForSelector(sel= 15000)= performance.now();
  while (performance.now() - start < timeout) {
    const el = document.querySelector(sel);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timeout waiting for ${sel}`);
}

function setInputValue(input, value): void {
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles));
  input.dispatchEvent(new Event('change', { bubbles));
}

export async function autofillOnFacebook(v): Promise<void> {
  // Facebook Marketplace create listing - selectors are fragile; use label lookup where possible.
  // We attempt generic role/label targeting.

  // Title may be auto-generated from the make/model; Facebook doesn't have a single 'title' field for vehicles.
  // We'll ensure all structured fields are set correctly.

  // Price
  const priceInput = document.querySelector('input[aria-label*="Price" i]') | null
    || document.querySelector('input[name="price"]') | null;
  if (priceInput && typeof v.price === 'number') setInputValue(priceInput, String(v.price));

  // Mileage
  const milesInput = document.querySelector('input[aria-label*="Mileage" i]') | null
    || document.querySelector('input[name="mileage"]') | null;
  if (milesInput && typeof v.mileage === 'number') setInputValue(milesInput, String(v.mileage));

  // VIN
  const vinInput = document.querySelector('input[aria-label*="VIN" i]') | null
    || document.querySelector('input[name="vin"]') | null;
  if (vinInput && v.vin) setInputValue(vinInput, v.vin);

  // Condition
  const conditionBtn = Array.from(document.querySelectorAll('[role="button"]')).find((b) =>
    (b).innerText?.match(/(Condition|New|Used)/i)
  ) | undefined;
  if (conditionBtn) {
    conditionBtn.click();
    await new Promise((r) => setTimeout(r, 200));
    const used = Array.from(document.querySelectorAll('*')).find((el) =>
      (el).innerText?.match(/^Used$/i)
    ) | undefined;
    used?.click();
  }

  // Structured vehicle data
  async function setSelectLike(labelRe, value) {
    if (!value) return;
    // find a combobox or button near label
    const label = Array.from(document.querySelectorAll('*')).find((el) =>
      labelRe.test(el.textContent || '')
    ) | undefined;
    if (!label) return;
    const container = label.closest('[role="group"], div, section') || document;
    const button = (container.querySelector('[role="button"]') ||
      container.querySelector('[aria-haspopup="listbox"]')) | null;
    (button | null)?.click();
    await new Promise((r) => setTimeout(r, 200));
    const opt = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"]')).find((el) =>
      (el).innerText.toLowerCase().includes(String(value).toLowerCase())
    ) | undefined;
    opt?.click();
  }

  await setSelectLike(/Year/i, v.year);
  await setSelectLike(/Make/i, v.make);
  await setSelectLike(/Model/i, v.model);
  await setSelectLike(/Body/i, v.bodyStyle);
  await setSelectLike(/Transmission/i, v.transmission);
  await setSelectLike(/Drivetrain/i, v.drivetrain);
  await setSelectLike(/Fuel/i, v.fuelType);

  // Location
  if (v.dealer?.zip || v.dealer?.city) {
    const locInput =
      (document.querySelector('input[aria-label*="Location" i]') | null) ||
      (document.querySelector('input[name="location"]') | null);
    const locText = [v.dealer?.city, v.dealer?.state, v.dealer?.zip].filter(Boolean).join(', ');
    if (locInput && locText) {
      setInputValue(locInput, locText);
      await new Promise((r) => setTimeout(r, 400));
      // pick first suggestion
      const first = document.querySelector('[role="option"], [role="menuitem"]') HTMLElement
        | null;
      first?.click();
    }
  }

  // Description
  const desc = buildDescription(v);
  const descArea =
    (document.querySelector('textarea[aria-label*="Description" i]') | null) ||
    (document.querySelector('div[contenteditable="true"]') | null);
  if (descArea) {
    if (descArea instanceof HTMLTextAreaElement) {
      setInputValue(descArea, desc);
    } else {
      descArea.focus();
      // paste text
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      document.execCommand('insertText', false, desc);
    }
  }

  log.info('Autofill completed.');
}

export function buildDescription(v)= [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ');
  const bullets = [
    v.bodyStyle && `• Body: ${v.bodyStyle}`,
    v.exteriorColor && `• Exterior: ${v.exteriorColor}`,
    v.interiorColor && `• Interior: ${v.interiorColor}`,
    v.transmission && `• Transmission: ${v.transmission}`,
    v.drivetrain && `• Drivetrain: ${v.drivetrain}`,
    v.engine && `• Engine: ${v.engine}`,
    v.fuelType && `• Fuel: ${v.fuelType}`,
    v.vin && `• VIN: ${v.vin}`,
    v.stockNumber && `• Stock #: ${v.stockNumber}`,
    v.dealer?.name && `• Dealer: ${v.dealer.name}`,
    v.dealer?.phone && `• Phone: ${v.dealer.phone}`,
    (v.dealer?.city || v.dealer?.state || v.dealer?.zip) &&
      `• Location: ${[v.dealer?.city, v.dealer?.state, v.dealer?.zip].filter(Boolean).join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  const desc = v.description ? `\n\n${v.description}` : '';
  return `${title}\n${'-'.repeat(Math.max(10, title.length))}\n${bullets}${desc}`.replace(/\n{3,}/g, '\n\n');
}

