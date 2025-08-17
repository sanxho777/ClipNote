import { Vehicle, RawVehicleData } from '../types';
/**
 * Normalize and clean up scraped vehicle data
 */
export declare function normalizeVehicleData(vehicle: RawVehicleData): Vehicle;
/**
 * Format price for display
 */
export declare function formatPrice(price: number): string;
/**
 * Format mileage for display
 */
export declare function formatMileage(mileage: number): string;
/**
 * Generate a title for Facebook Marketplace
 */
export declare function generateFacebookTitle(vehicle: Vehicle): string;
/**
 * Generate a formatted description for Facebook Marketplace
 */
export declare function generateFacebookDescription(vehicle: Vehicle, dealer: any, stockNumber?: string): string;
//# sourceMappingURL=normalize.d.ts.map