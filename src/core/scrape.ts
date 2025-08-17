import { ScrapeResult, SiteAdapter } from '../types';
import { AutoTraderAdapter } from '../adapters/autotrader';
import { CarsDotComAdapter } from '../adapters/cars_dot_com';
import { CarGurusAdapter } from '../adapters/cargurus';
import { DealerDotComAdapter } from '../adapters/dealer_dot_com';
import { GenericAdapter } from '../adapters/generic';
import { Logger } from './logger';

export class ScrapingEngine {
  private logger = new Logger('ScrapingEngine');
  private adapters: SiteAdapter[] = [];
  private genericAdapter: GenericAdapter;

  constructor() {
    // Initialize all site adapters
    this.adapters = [
      new AutoTraderAdapter(),
      new CarsDotComAdapter(),
      new CarGurusAdapter(),
      new DealerDotComAdapter()
    ];
    
    this.genericAdapter = new GenericAdapter();
    
    this.logger.info('ScrapingEngine initialized with adapters:', 
      this.adapters.map(a => a.name));
  }

  /**
   * Scrape the current page using the appropriate adapter
   */
  async scrapeCurrentPage(): Promise<ScrapeResult> {
    const currentUrl = window.location.href;
    const hostname = window.location.hostname;
    
    this.logger.info('Starting scrape for:', currentUrl);
    
    // Find the appropriate adapter for this site
    const adapter = this.findAdapter(hostname, currentUrl);
    
    if (!adapter) {
      throw new Error('No suitable adapter found for this site');
    }
    
    this.logger.info('Using adapter:', adapter.name);
    
    try {
      const result = await adapter.scrape();
      
      // Validate the result
      this.validateScrapeResult(result);
      
      this.logger.info('Scrape completed successfully');
      return result;
      
    } catch (error) {
      this.logger.error('Scrape failed:', error);
      throw error;
    }
  }

  /**
   * Check if the current page is a vehicle detail page
   */
  isVehiclePage(url: string): boolean {
    const hostname = new URL(url).hostname;
    const adapter = this.findAdapter(hostname, url);
    
    if (adapter) {
      return adapter.isVehiclePage(url);
    }
    
    // Use generic heuristics
    return this.genericAdapter.isVehiclePage(url);
  }

  /**
   * Get list of supported sites
   */
  getSupportedSites(): string[] {
    return this.adapters.flatMap(adapter => adapter.hostnames);
  }

  /**
   * Find the appropriate adapter for a given hostname and URL
   */
  private findAdapter(hostname: string, url: string): SiteAdapter | null {
    // Try to find a specific adapter first
    for (const adapter of this.adapters) {
      if (this.matchesHostname(hostname, adapter.hostnames)) {
        if (adapter.isVehiclePage(url)) {
          return adapter;
        }
      }
    }
    
    // Fall back to generic adapter if it looks like a vehicle page
    if (this.genericAdapter.isVehiclePage(url)) {
      return this.genericAdapter;
    }
    
    return null;
  }

  /**
   * Check if hostname matches any of the adapter hostnames
   */
  private matchesHostname(hostname: string, adapterHostnames: string[]): boolean {
    return adapterHostnames.some(adapterHostname => {
      if (adapterHostname === '*') return true;
      
      // Remove www. prefix for comparison
      const cleanHostname = hostname.replace(/^www\./, '');
      const cleanAdapterHostname = adapterHostname.replace(/^www\./, '');
      
      return cleanHostname === cleanAdapterHostname || 
             cleanHostname.endsWith('.' + cleanAdapterHostname);
    });
  }

  /**
   * Validate scrape result and add warnings for missing data
   */
  private validateScrapeResult(result: ScrapeResult): void {
    const { vehicle } = result;
    
    // Required vehicle fields
    const requiredFields = ['year', 'make', 'model', 'price'];
    const missingFields: string[] = [];
    
    requiredFields.forEach(field => {
      if (!vehicle[field as keyof typeof vehicle]) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      result.warnings.push(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Validate VIN format if present
    if (vehicle.vin) {
      const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
      if (!vinRegex.test(vehicle.vin)) {
        result.warnings.push('VIN format appears invalid');
      }
    }
    
    // Validate year range
    if (vehicle.year) {
      const currentYear = new Date().getFullYear();
      if (vehicle.year < 1950 || vehicle.year > currentYear + 1) {
        result.warnings.push('Vehicle year appears out of range');
      }
    }
    
    // Validate price range
    if (vehicle.price) {
      if (vehicle.price < 100 || vehicle.price > 1000000) {
        result.warnings.push('Price appears out of normal range');
      }
    }
    
    // Validate mileage
    if (vehicle.mileage) {
      if (vehicle.mileage < 0 || vehicle.mileage > 1000000) {
        result.warnings.push('Mileage appears out of normal range');
      }
    }
    
    // Check for photos
    if (result.photos.length === 0) {
      result.warnings.push('No photos found');
    }
    
    this.logger.debug('Validation completed. Warnings:', result.warnings);
  }
}
