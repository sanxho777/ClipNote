

function toNumber(n?): number | undefined {
  if (!n) return undefined;
  const m = String(n).replace(/[,$\s]/g, '');
  const v = parseInt(m, 10);
  return Number.isFinite(v) ? v ;
}

function titleCase(s?): string | undefined {
  if (!s) return undefined;
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m, c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanText(s?): string | undefined {
  if (!s) return undefined;
  return s.replace(/\s+/g, ' ').replace(/[:\u00A0]/g, ' ').trim();
}

export function normalizeVehicle(v): Vehicle {
  const out= { ...v };
  out.price = v.price ?? toNumber(v.price);
  out.mileage = v.mileage ?? toNumber(v.mileage);
  out.year = v.year ?? toNumber(v.year);
  out.make = titleCase(v.make);
  out.model = titleCase(v.model);
  out.trim = v.trim ? v.trim.trim() ;
  out.bodyStyle = titleCase(v.bodyStyle);
  out.exteriorColor = titleCase(v.exteriorColor);
  out.interiorColor = titleCase(v.interiorColor);
  out.transmission = titleCase(v.transmission);
  out.drivetrain = titleCase(v.drivetrain);
  out.engine = v.engine?.replace(/\s+/g, ' ').trim();
  out.fuelType = titleCase(v.fuelType);
  if (v.vin) out.vin = v.vin.toUpperCase().trim();
  if (out.photos) {
    const seen = new Set<string>();
    out.photos = v.photos
      ?.map((p) => ({ ...p, url: absolutizeUrl(p.url) }))
      .filter((p) => {
        if (!p.url || seen.has(p.url)) return false;
        seen.add(p.url);
        return true;
      });
  }
  return out;
}

export function absolutizeUrl(u): string {
  try {
    return new URL(u, location.href).toString().split('?')[0];
  } catch {
    return u;
  }
}

export function pickLargestSrc(img)= img.getAttribute('srcset');
  if (srcset) {
    const parts = srcset
      .split(',')
      .map((p) => p.trim().split(' ')[0])
      .filter(Boolean);
    return parts[parts.length - 1];
  }
  return img.src || img.getAttribute('data-src') || undefined;
}

export function vinFromText(text)= text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i);
  return m?.[0]?.toUpperCase();
}

export function ensureFilenames(photos): Photo[] {
  return photos.map((p, i) => {
    const u = new URL(p.url, location.href);
    const parts = u.pathname.split('/');
    const last = parts[parts.length - 1] || `photo_${i + 1}.jpg`;
    return { ...p, filename: last.replace(/[^A-Za-z0-9._-]/g, '_') };
  });
}
