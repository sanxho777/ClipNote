
import { byLabel } from '../core/selectors';

export function fromAutoTrader(doc)= doc.querySelector('h1, .vehicle-title')?.textContent || '';
  const yearMakeModel = title.match(/(\d{4})\s+([A-Za-z][^\s]+)\s+(.+)/);
  const priceText =
    (doc.querySelector('[data-cmp="firstPrice"], [data-test="vdp-price"]') | null)
      ?.innerText || '';
  const mileageText = (doc.querySelector('[data-cmp="mileage"]') | null)?.innerText || '';

  const vin =
    byLabel(doc, /VIN/i) ||
    (Array.from(doc.querySelectorAll('*')).find((el) => /VIN/i.test(el.textContent || ''))?.textContent ?? '');

  const dealerName =
    (doc.querySelector('[data-cmp="sellerName"]') | null)?.innerText || undefined;

  const cityStateZip =
    (doc.querySelector('[data-cmp="sellerAddress"]') | null)?.innerText || '';

  const out= {
    year: yearMakeModel ? parseInt(yearMakeModel[1], 10) ,
    make: yearMakeModel ? yearMakeModel[2] ,
    model: yearMakeModel ? yearMakeModel[3] ,
    price: parseInt((priceText.match(/[\d,]+/) || [''])[0].replace(/,/g, ''), 10) || undefined,
    mileage: parseInt((mileageText.match(/[\d,]+/) || [''])[0].replace(/,/g, ''), 10) || undefined,
    vin: (vin.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i) || [])[0],
    dealer: {
      name,
      city: (cityStateZip.match(/([A-Za-z\s]+),\s*[A-Z]{2}/) || [])[1],
      state: (cityStateZip.match(/,\s*([A-Z]{2})/) || [])[1],
      zip: (cityStateZip.match(/(\d{5})(?:-\d{4})?/) || [])[1],
    },
    description: (doc.querySelector('[data-cmp="description"]') | null)?.innerText || undefined,
  };

  // Basic details table
  const labels = Array.from(doc.querySelectorAll('li, tr')).map((el) => el.textContent || '');
  for (const txt of labels) {
    if (/Exterior Color/i.test(txt)) out.exteriorColor = txt.split(':').pop()?.trim();
    if (/Interior Color/i.test(txt)) out.interiorColor = txt.split(':').pop()?.trim();
    if (/Transmission/i.test(txt)) out.transmission = txt.split(':').pop()?.trim();
    if (/Drivetrain|Drive Type/i.test(txt)) out.drivetrain = txt.split(':').pop()?.trim();
    if (/Engine/i.test(txt)) out.engine = txt.split(':').pop()?.trim();
    if (/Fuel Type/i.test(txt)) out.fuelType = txt.split(':').pop()?.trim();
    if (/Body Style/i.test(txt)) out.bodyStyle = txt.split(':').pop()?.trim();
    if (/Stock/i.test(txt)) out.stockNumber = (txt.match(/Stock[^\w]?\s*#?\s*(\S+)/i) || [])[1];
  }

  return out;
}
