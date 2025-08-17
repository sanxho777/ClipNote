import type { ScrapeResult, Vehicle } from '../types';
import { normalizeVehicle, vinFromText, cleanText } from './normalize';
import { collectPhotos } from './photos';
import { metaContent } from './selectors';
import { log } from './logger';
import { fromAutoTrader } from '../adapters/autotrader';
import { fromCarsDotCom } from '../adapters/cars_dot_com';
import { fromCarGurus } from '../adapters/cargurus';
import { fromDealerDotCom } from '../adapters/dealer_dot_com';
import { genericFallback } from '../adapters/generic';

export async function scrapeCurrent(doc: Document = document): Promise<ScrapeResult> {
  const url = location.href;
  const host = location.host;
  let vehicle: Vehicle = { sourceUrl: url, source: host };
  let warnings: string[] = [];

  try {
    if (/autotrader\.com$/i.test(host)) {
      vehicle = { ...vehicle, ...(fromAutoTrader(doc) || {}) };
    } else if (/cars\.com$/i.test(host)) {
      vehicle = { ...vehicle, ...(fromCarsDotCom(doc) || {}) };
    } else if (/cargurus\.com$/i.test(host)) {
      vehicle = { ...vehicle, ...(fromCarGurus(doc) || {}) };
    } else if (/dealer\.com$/i.test(host)) {
      vehicle = { ...vehicle, ...(fromDealerDotCom(doc) || {}) };
    } else {
      warnings.push('Unknown site: using generic heuristics.');
      vehicle = { ...vehicle, ...(genericFallback(doc) || {}) };
    }
  } catch (e) {
    log.warn('Adapter error, continuing with generic fallback', e);
    warnings.push('Adapter failed. Used generic fallbacks.');
    vehicle = { ...vehicle, ...(genericFallback(doc) || {}) };
  }

  // photos
  const photos = collectPhotos(doc);
  if (!photos.length) warnings.push('No photos found or gallery blocked.');
  vehicle.photos = photos;

  // try VIN regex on entire text if missing
  if (!vehicle.vin) {
    const txt = doc.body.innerText || '';
    const vin = vinFromText(txt);
    if (vin) vehicle.vin = vin;
  }

  // meta description as fallback for description
  if (!vehicle.description) {
    vehicle.description = cleanText(
      metaContent('description') || metaContent('og:description') || ''
    );
  }

  vehicle = normalizeVehicle(vehicle);
  warnings = validate(vehicle, warnings);
  return { vehicle, warnings };
}

function validate(v: Vehicle, warnings: string[]): string[] {
  const out = [...warnings];
  if (!v.year || v.year < 1950 || v.year > new Date().getFullYear() + 1)
    out.push('Suspicious or missing year.');
  if (!v.make || !v.model) out.push('Missing make/model.');
  if (v.vin && v.vin.length !== 17) out.push('VIN must be 17 characters.');
  if (typeof v.price !== 'number') out.push('Missing price.');
  if (typeof v.mileage !== 'number') out.push('Missing mileage.');
  if (!v.photos?.length) out.push('Missing photos.');
  return out;
}
