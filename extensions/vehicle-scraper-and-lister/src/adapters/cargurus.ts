import type { Vehicle } from '../types';

export function fromCarGurus(doc: Document): Partial<Vehicle> {
  const title = (doc.querySelector('h1') as HTMLElement | null)?.innerText || '';
  const m = title.match(/(\d{4})\s+([A-Za-z][^\s]+)\s+(.+)/);
  const priceText =
    (doc.querySelector('[data-test="vdp-price"]') as HTMLElement | null)?.innerText ||
    (doc.querySelector('[data-test="cgst-price"]') as HTMLElement | null)?.innerText ||
    '';
  const mileageText =
    (doc.querySelector('[data-test="vdp-mileage"]') as HTMLElement | null)?.innerText || '';

  const specTexts = Array.from(doc.querySelectorAll('li, tr, div')).map((el) => el.textContent || '');
  const out: Partial<Vehicle> = {
    year: m ? parseInt(m[1], 10) : undefined,
    make: m ? m[2] : undefined,
    model: m ? m[3] : undefined,
    price: priceText ? parseInt(priceText.replace(/[^\d]/g, ''), 10) : undefined,
    mileage: mileageText ? parseInt(mileageText.replace(/[^\d]/g, ''), 10) : undefined,
    description: (doc.querySelector('[data-test="description"]') as HTMLElement | null)?.innerText || undefined,
  };

  for (const txt of specTexts) {
    if (/VIN/i.test(txt)) out.vin = (txt.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i) || [])[0];
    if (/Exterior Color/i.test(txt)) out.exteriorColor = txt.split(':').pop()?.trim();
    if (/Interior Color/i.test(txt)) out.interiorColor = txt.split(':').pop()?.trim();
    if (/Transmission/i.test(txt)) out.transmission = txt.split(':').pop()?.trim();
    if (/Drivetrain|Drive Type/i.test(txt)) out.drivetrain = txt.split(':').pop()?.trim();
    if (/Engine/i.test(txt)) out.engine = txt.split(':').pop()?.trim();
    if (/Fuel/i.test(txt)) out.fuelType = txt.split(':').pop()?.trim();
    if (/Body Style/i.test(txt)) out.bodyStyle = txt.split(':').pop()?.trim();
    if (/Stock/i.test(txt)) out.stockNumber = (txt.match(/Stock[^\w]?\s*#?\s*(\S+)/i) || [])[1];
  }

  // dealer info
  const dealerBlock = (doc.querySelector('[data-test="seller-info"]') as HTMLElement | null)?.innerText || '';
  out.dealer = {
    name: (dealerBlock.match(/Seller\s*:\s*(.+)/i) || [])[1],
    city: (dealerBlock.match(/([A-Za-z\s]+),\s*[A-Z]{2}/) || [])[1],
    state: (dealerBlock.match(/,\s*([A-Z]{2})/) || [])[1],
    zip: (dealerBlock.match(/(\d{5})(?:-\d{4})?/) || [])[1],
    phone: (dealerBlock.match(/(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4})/) || [])[1],
  };

  return out;
}
