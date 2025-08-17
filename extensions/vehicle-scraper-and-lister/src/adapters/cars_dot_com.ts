import type { Vehicle } from '../types';

export function fromCarsDotCom(doc: Document): Partial<Vehicle> {
  const title =
    (doc.querySelector('h1[data-testid="structured-data-title"]') as HTMLElement | null)?.innerText ||
    (doc.querySelector('h1') as HTMLElement | null)?.innerText ||
    '';

  const match = title.match(/(\d{4})\s+([A-Za-z][^\s]+)\s+(.+)/);
  const priceText = (doc.querySelector('[data-testid="price-section"] [data-testid="price"]') as
    | HTMLElement
    | null)?.innerText;
  const mileageText = (doc.querySelector('[data-testid="mileage"]') as HTMLElement | null)?.innerText;

  const specs = Array.from(doc.querySelectorAll('[data-testid="specifications-section"], table, ul li'))
    .map((el) => el.textContent || '');
  const out: Partial<Vehicle> = {
    year: match ? parseInt(match[1], 10) : undefined,
    make: match ? match[2] : undefined,
    model: match ? match[3] : undefined,
    price: priceText ? parseInt(priceText.replace(/[^\d]/g, ''), 10) : undefined,
    mileage: mileageText ? parseInt(mileageText.replace(/[^\d]/g, ''), 10) : undefined,
    description: (doc.querySelector('[data-testid="seller-notes"]') as HTMLElement | null)?.innerText || undefined,
  };

  for (const txt of specs) {
    if (/VIN/i.test(txt)) out.vin = (txt.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i) || [])[0];
    if (/Exterior/i.test(txt)) out.exteriorColor = txt.split(':').pop()?.trim();
    if (/Interior/i.test(txt)) out.interiorColor = txt.split(':').pop()?.trim();
    if (/Transmission/i.test(txt)) out.transmission = txt.split(':').pop()?.trim();
    if (/Drivetrain|Drive Type/i.test(txt)) out.drivetrain = txt.split(':').pop()?.trim();
    if (/Engine/i.test(txt)) out.engine = txt.split(':').pop()?.trim();
    if (/Fuel/i.test(txt)) out.fuelType = txt.split(':').pop()?.trim();
    if (/Body/i.test(txt)) out.bodyStyle = txt.split(':').pop()?.trim();
    if (/Stock/i.test(txt)) out.stockNumber = (txt.match(/Stock[^\w]?\s*#?\s*(\S+)/i) || [])[1];
  }

  // Dealer block
  const dealerName = (doc.querySelector('[data-qa="dealer-name"]') as HTMLElement | null)?.innerText;
  const address = (doc.querySelector('[data-qa="dealer-address"]') as HTMLElement | null)?.innerText || '';
  out.dealer = {
    name: dealerName || undefined,
    city: (address.match(/([A-Za-z\s]+),\s*[A-Z]{2}/) || [])[1],
    state: (address.match(/,\s*([A-Z]{2})/) || [])[1],
    zip: (address.match(/(\d{5})(?:-\d{4})?/) || [])[1],
  };

  return out;
}
