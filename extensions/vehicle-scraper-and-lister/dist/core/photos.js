
import { pickLargestSrc, absolutizeUrl, ensureFilenames } from './normalize';

export function collectPhotos(doc= document)= Array.from(doc.querySelectorAll('img'));
  const out= [];
  for (const img of imgs) {
    const url = pickLargestSrc(img) || (img).src;
    if (!url) continue;
    // skip tiny icons/placeholders
    const w = (img).naturalWidth || parseInt(img.getAttribute('width') || '0', 10);
    const h =
      (img).naturalHeight || parseInt(img.getAttribute('height') || '0', 10);
    if ((w && w < 200) || (h && h < 200)) continue;
    out.push({ url: absolutizeUrl(url) });
  }
  // dedupe by URL
  const seen = new Set<string>();
  const dedup = out.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
  return ensureFilenames(dedup);
}

export async function fetchAsFiles(urls): Promise<File[]> {
  const files= [];
  let idx = 1;
  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: 'omit', cache: 'reload' });
      const blob = await res.blob();
      const ext = mimeToExt(blob.type) || 'jpg';
      const name = `photo_${idx}.${ext}`;
      files.push(new File([blob], name, { type: blob.type }));
      idx++;
    } catch (e) {
      console.warn('Failed to fetch image', url, e);
    }
  }
  return files;
}

function mimeToExt(m): string | undefined {
  if (m.includes('jpeg')) return 'jpg';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  return undefined;
}
