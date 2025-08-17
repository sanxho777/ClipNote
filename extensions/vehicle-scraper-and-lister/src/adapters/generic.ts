import type { Vehicle } from '../types';
import { metaContent } from '../core/selectors';

export function genericFallback(doc: Document): Partial<Vehicle> {
  const h1 = (doc.querySelector('h1') as HTMLElement | null)?.innerText || '';
  const titleMatch = h1.match(/(\d{4})\s+([A-Za-z][^\s]+)\s+(.+)/);

  const priceText =
    (doc.querySelector('[class*="price" i], [data-testid*="price"]') as HTMLElement | null)?.innerText || '';
  const mileageText =
    (doc.querySelector('[class*="mileage" i], [data-testid*="mileage"]') as HTMLElement | null)?.innerText ||
    '';

  return {
    year: titleMatch ? parseInt(titleMatch[1], 10) : undefined,
    make: titleMatch ? titleMatch[2] : undefined,
    model: titleMatch ? titleMatch[3] : undefined,
    price: priceText ? parseInt(priceText.replace(/[^\d]/g, ''), 10) : undefined,
    mileage: mileageText ? parseInt(mileageText.replace(/[^\d]/g, ''), 10) : undefined,
    description: metaContent('description') || metaContent('og:description') || undefined,
  };
}
