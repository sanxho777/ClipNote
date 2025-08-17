import { Photo } from '../types';
import { Logger } from './logger';

const logger = new Logger('Photos');

/**
 * Extract photos from the current page using provided selectors
 */
export async function extractPhotos(selectors: string[]): Promise<Photo[]> {
  logger.info('Extracting photos with selectors:', selectors);
  
  const photos: Photo[] = [];
  const seenUrls = new Set<string>();
  
  // Find all image elements using the provided selectors
  const imageElements = new Set<HTMLImageElement>();
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (el instanceof HTMLImageElement) {
        imageElements.add(el);
      }
    });
  });
  
  logger.debug(`Found ${imageElements.size} image elements`);
  
  // Process each image element
  for (const img of imageElements) {
    try {
      const photoUrls = extractImageUrls(img);
      
      for (const url of photoUrls) {
        const absoluteUrl = makeAbsoluteUrl(url);
        const cleanUrl = cleanImageUrl(absoluteUrl);
        
        if (cleanUrl && !seenUrls.has(cleanUrl) && isValidImageUrl(cleanUrl)) {
          seenUrls.add(cleanUrl);
          
          const photo: Photo = {
            url: cleanUrl,
            width: img.naturalWidth || img.width || undefined,
            height: img.naturalHeight || img.height || undefined,
            isMain: isMainImage(img)
          };
          
          photos.push(photo);
        }
      }
    } catch (error) {
      logger.warn('Error processing image:', error);
    }
  }
  
  // Sort photos - main images first, then by size (larger first)
  photos.sort((a, b) => {
    if (a.isMain && !b.isMain) return -1;
    if (!a.isMain && b.isMain) return 1;
    
    const aSize = (a.width || 0) * (a.height || 0);
    const bSize = (b.width || 0) * (b.height || 0);
    return bSize - aSize;
  });
  
  logger.info(`Extracted ${photos.length} unique photos`);
  return photos;
}

/**
 * Extract all possible URLs from an image element (src, srcset, data attributes)
 */
function extractImageUrls(img: HTMLImageElement): string[] {
  const urls: string[] = [];
  
  // Get src attribute
  if (img.src) {
    urls.push(img.src);
  }
  
  // Parse srcset for different resolutions
  if (img.srcset) {
    const srcsetUrls = parseSrcset(img.srcset);
    urls.push(...srcsetUrls);
  }
  
  // Check data attributes for lazy loading
  const dataAttributes = ['data-src', 'data-original', 'data-lazy', 'data-full', 'data-large'];
  dataAttributes.forEach(attr => {
    const value = img.getAttribute(attr);
    if (value) {
      urls.push(value);
    }
  });
  
  // Check for background images on parent elements
  let parent = img.parentElement;
  while (parent && parent !== document.body) {
    const bgImage = getComputedStyle(parent).backgroundImage;
    if (bgImage && bgImage !== 'none') {
      const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match) {
        urls.push(match[1]);
      }
    }
    parent = parent.parentElement;
  }
  
  return urls;
}

/**
 * Parse srcset attribute and return URLs sorted by resolution (highest first)
 */
function parseSrcset(srcset: string): string[] {
  const sources = srcset.split(',').map(s => s.trim());
  const parsed: Array<{ url: string; width: number }> = [];
  
  sources.forEach(source => {
    const parts = source.split(/\s+/);
    if (parts.length >= 1) {
      const url = parts[0];
      let width = 0;
      
      // Try to extract width descriptor
      if (parts.length > 1) {
        const descriptor = parts[1];
        if (descriptor.endsWith('w')) {
          width = parseInt(descriptor.slice(0, -1)) || 0;
        } else if (descriptor.endsWith('x')) {
          // For pixel density descriptors, assume a base width
          const density = parseFloat(descriptor.slice(0, -1)) || 1;
          width = Math.round(1920 * density); // Assume 1920px base width
        }
      }
      
      parsed.push({ url, width });
    }
  });
  
  // Sort by width (highest first) and return URLs
  return parsed
    .sort((a, b) => b.width - a.width)
    .map(p => p.url);
}

/**
 * Convert relative URLs to absolute URLs
 */
function makeAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  if (url.startsWith('//')) {
    return window.location.protocol + url;
  }
  
  if (url.startsWith('/')) {
    return window.location.origin + url;
  }
  
  // Relative to current path
  const currentPath = window.location.pathname.replace(/\/[^\/]*$/, '/');
  return window.location.origin + currentPath + url;
}

/**
 * Clean image URL by removing tracking parameters and fragments
 */
function cleanImageUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
      'gclid', 'fbclid', '_ga', 'ref', 'referrer'
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Remove fragment
    urlObj.hash = '';
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Check if URL points to a valid image
 */
function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check file extension
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    
    if (hasImageExtension) {
      return true;
    }
    
    // Some sites serve images without extensions but with image content-type
    // We'll assume it's valid if it's from a known image domain or path
    const imageIndicators = [
      '/image/', '/img/', '/photo/', '/picture/', '/gallery/',
      'images.', 'photos.', 'media.', 'cdn.'
    ];
    
    const hasImageIndicator = imageIndicators.some(indicator => 
      url.toLowerCase().includes(indicator)
    );
    
    return hasImageIndicator;
  } catch (error) {
    return false;
  }
}

/**
 * Determine if an image appears to be the main/hero image
 */
function isMainImage(img: HTMLImageElement): boolean {
  // Check class names and IDs for main image indicators
  const mainImageIndicators = [
    'hero', 'main', 'primary', 'featured', 'highlight',
    'large', 'big', 'banner'
  ];
  
  const className = img.className.toLowerCase();
  const id = img.id.toLowerCase();
  
  const hasMainIndicator = mainImageIndicators.some(indicator =>
    className.includes(indicator) || id.includes(indicator)
  );
  
  if (hasMainIndicator) {
    return true;
  }
  
  // Check parent elements for main image indicators
  let parent = img.parentElement;
  let depth = 0;
  while (parent && depth < 3) {
    const parentClass = parent.className.toLowerCase();
    const parentId = parent.id.toLowerCase();
    
    const hasParentMainIndicator = mainImageIndicators.some(indicator =>
      parentClass.includes(indicator) || parentId.includes(indicator)
    );
    
    if (hasParentMainIndicator) {
      return true;
    }
    
    parent = parent.parentElement;
    depth++;
  }
  
  // Check if it's the largest image (by dimensions)
  const imageSize = (img.naturalWidth || img.width || 0) * (img.naturalHeight || img.height || 0);
  if (imageSize > 500000) { // Roughly 800x600 or larger
    return true;
  }
  
  return false;
}

/**
 * Download photos to local storage (for manual upload fallback)
 */
export async function downloadPhotos(photos: Photo[]): Promise<void> {
  logger.info(`Starting download of ${photos.length} photos`);
  
  const downloadPromises = photos.map(async (photo, index) => {
    try {
      const filename = `vehicle_photo_${index + 1}.jpg`;
      
      // Use Chrome downloads API
      await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_PHOTO',
        url: photo.url,
        filename
      });
      
      logger.debug(`Downloaded photo ${index + 1}: ${filename}`);
    } catch (error) {
      logger.error(`Failed to download photo ${index + 1}:`, error);
    }
  });
  
  await Promise.allSettled(downloadPromises);
  logger.info('Photo download process completed');
}

/**
 * Convert image URLs to File objects for programmatic upload
 */
export async function urlsToFiles(photos: Photo[]): Promise<File[]> {
  logger.info(`Converting ${photos.length} URLs to File objects`);
  
  const files: File[] = [];
  
  for (let i = 0; i < photos.length; i++) {
    try {
      const photo = photos[i];
      const response = await fetch(photo.url);
      
      if (!response.ok) {
        logger.warn(`Failed to fetch photo ${i + 1}: ${response.status}`);
        continue;
      }
      
      const blob = await response.blob();
      
      // Determine file extension from content type or URL
      let extension = 'jpg';
      const contentType = response.headers.get('content-type');
      if (contentType) {
        if (contentType.includes('png')) extension = 'png';
        else if (contentType.includes('gif')) extension = 'gif';
        else if (contentType.includes('webp')) extension = 'webp';
      }
      
      const filename = `vehicle_photo_${i + 1}.${extension}`;
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      
      files.push(file);
      logger.debug(`Converted photo ${i + 1} to File: ${filename}`);
      
    } catch (error) {
      logger.error(`Failed to convert photo ${i + 1} to File:`, error);
    }
  }
  
  logger.info(`Successfully converted ${files.length} photos to File objects`);
  return files;
}
