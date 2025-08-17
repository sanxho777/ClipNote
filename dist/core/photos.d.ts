import { Photo } from '../types';
/**
 * Extract photos from the current page using provided selectors
 */
export declare function extractPhotos(selectors: string[]): Promise<Photo[]>;
/**
 * Download photos to local storage (for manual upload fallback)
 */
export declare function downloadPhotos(photos: Photo[]): Promise<void>;
/**
 * Convert image URLs to File objects for programmatic upload
 */
export declare function urlsToFiles(photos: Photo[]): Promise<File[]>;
//# sourceMappingURL=photos.d.ts.map