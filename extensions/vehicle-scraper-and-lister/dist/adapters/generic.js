
import { metaContent } from '../core/selectors';

export function genericFallback(doc)= (doc.querySelector('h1') | null)?.innerText || '';
  const titleMatch = h1.match(/(\d{4})\s+([A-Za-z][^\s]+)\s+(.+)/);

  const priceText =
    (doc.querySelector('[class*="price" i], [data-testid*="price"]') | null)?.innerText || '';
  const mileageText =
    (doc.querySelector('[class*="mileage" i], [data-testid*="mileage"]') | null)?.innerText ||
    '';

  return {
    year: titleMatch ? parseInt(titleMatch[1], 10) ,
    make: titleMatch ? titleMatch[2] ,
    model: titleMatch ? titleMatch[3] ,
    price: priceText ? parseInt(priceText.replace(/[^\d]/g, ''), 10) ,
    mileage: mileageText ? parseInt(mileageText.replace(/[^\d]/g, ''), 10) ,
    description: metaContent('description') || metaContent('og:description') || undefined,
  };
}
