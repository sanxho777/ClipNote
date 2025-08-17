import { SiteAdapter, ScrapeResult, Vehicle, Dealer, Photo } from '../types';
import { SelectorProbe } from '../core/selectors';
import { normalizeVehicleData } from '../core/normalize';
import { extractPhotos } from '../core/photos';
import { Logger } from '../core/logger';

export class AutoTraderAdapter implements SiteAdapter {
  name = 'AutoTrader';
  hostnames = ['autotrader.com', 'www.autotrader.com'];
  
  private logger = new Logger('AutoTrader');
  private probe = new SelectorProbe();

  isVehiclePage(url: string): boolean {
    return /\/cars-for-sale\/vehicledetails\.xhtml|\/vehicle\/\d+/i.test(url);
  }

  async scrape(): Promise<ScrapeResult> {
    this.logger.info('Starting AutoTrader scrape');
    
    const warnings: string[] = [];
    const vehicle: Vehicle = {};
    const dealer: Dealer = {};
    
    try {
      // Extract title information (year, make, model, trim)
      await this.extractTitleInfo(vehicle, warnings);
      
      // Extract price and mileage
      await this.extractPriceAndMileage(vehicle, warnings);
      
      // Extract vehicle specifications
      await this.extractSpecs(vehicle, warnings);
      
      // Extract dealer information
      await this.extractDealerInfo(dealer, warnings);
      
      // Extract VIN
      await this.extractVIN(vehicle, warnings);
      
      // Extract description
      await this.extractDescription(vehicle, warnings);
      
      // Extract photos
      const photos = await this.extractPhotos(warnings);
      
      // Normalize the data
      const normalizedVehicle = normalizeVehicleData(vehicle);
      
      const result: ScrapeResult = {
        vehicle: normalizedVehicle,
        dealer,
        photos,
        sourceUrl: window.location.href,
        scrapedAt: Date.now(),
        warnings,
        id: `autotrader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      this.logger.info('AutoTrader scrape completed', result);
      return result;
      
    } catch (error) {
      this.logger.error('AutoTrader scrape failed:', error);
      throw new Error(`AutoTrader scraping failed: ${(error as Error).message}`);
    }
  }

  private async extractTitleInfo(vehicle: Vehicle, warnings: string[]): Promise<void> {
    // Try multiple selectors for the vehicle title
    const titleSelectors = [
      '.vehicle-title h1',
      '[data-cmp="vehicleTitle"]',
      '.vehicle-header h1',
      'h1[data-cmp="vehicleTitle"]',
      '.vdp-header h1'
    ];
    
    const titleElement = this.probe.findElement(titleSelectors);
    
    if (titleElement) {
      const titleText = titleElement.textContent?.trim() || '';
      this.logger.debug('Found title:', titleText);
      
      // Parse title like "2023 Honda Civic LX"
      const titleMatch = titleText.match(/(\d{4})\s+([A-Za-z]+)\s+([A-Za-z0-9\s]+?)(?:\s+([A-Za-z0-9\s]+))?$/);
      
      if (titleMatch) {
        vehicle.year = parseInt(titleMatch[1]);
        vehicle.make = titleMatch[2];
        
        // Split model and trim
        const remaining = titleMatch[3].trim();
        const parts = remaining.split(/\s+/);
        vehicle.model = parts[0];
        
        if (parts.length > 1) {
          vehicle.trim = parts.slice(1).join(' ');
        }
        
        if (titleMatch[4]) {
          vehicle.trim = (vehicle.trim ? vehicle.trim + ' ' : '') + titleMatch[4];
        }
      } else {
        warnings.push('Could not parse vehicle title format');
      }
    } else {
      warnings.push('Vehicle title not found');
    }
  }

  private async extractPriceAndMileage(vehicle: Vehicle, warnings: string[]): Promise<void> {
    // Extract price
    const priceSelectors = [
      '[data-cmp="firstPrice"]',
      '.first-price',
      '.vehicle-price .price-value',
      '.price-section .price',
      '[data-testid="price"]'
    ];
    
    const priceElement = this.probe.findElement(priceSelectors);
    if (priceElement) {
      const priceText = priceElement.textContent?.replace(/[$,]/g, '') || '';
      const priceMatch = priceText.match(/(\d+)/);
      if (priceMatch) {
        vehicle.price = parseInt(priceMatch[1]);
      }
    } else {
      warnings.push('Price not found');
    }
    
    // Extract mileage
    const mileageSelectors = [
      '[data-cmp="mileage"]',
      '.vehicle-mileage',
      '.mileage-value',
      '.specs-section .mileage'
    ];
    
    const mileageElement = this.probe.findElement(mileageSelectors);
    if (mileageElement) {
      const mileageText = mileageElement.textContent?.replace(/[,\s]/g, '') || '';
      const mileageMatch = mileageText.match(/(\d+)/);
      if (mileageMatch) {
        vehicle.mileage = parseInt(mileageMatch[1]);
      }
    } else {
      // Try regex search on page text
      const mileageRegex = /(\d{1,3}(?:,\d{3})*)\s*miles?/i;
      const pageText = document.body.textContent || '';
      const mileageMatch = pageText.match(mileageRegex);
      if (mileageMatch) {
        vehicle.mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
      } else {
        warnings.push('Mileage not found');
      }
    }
  }

  private async extractSpecs(vehicle: Vehicle, _warnings: string[]): Promise<void> {
    // Look for specs section
    const specsSection = this.probe.findElement([
      '.vehicle-specs',
      '.specifications',
      '.specs-section',
      '[data-cmp="vehicleSpecs"]'
    ]);
    
    if (specsSection) {
      const specItems = specsSection.querySelectorAll('li, .spec-item, .specification-item');
      
      specItems.forEach(item => {
        const text = item.textContent?.toLowerCase() || '';
        const value = item.textContent?.trim() || '';
        
        if (text.includes('transmission')) {
          vehicle.transmission = this.extractSpecValue(value, 'transmission');
        } else if (text.includes('drivetrain') || text.includes('drive')) {
          vehicle.drivetrain = this.extractSpecValue(value, 'drivetrain');
        } else if (text.includes('engine')) {
          vehicle.engine = this.extractSpecValue(value, 'engine');
        } else if (text.includes('fuel')) {
          vehicle.fuelType = this.extractSpecValue(value, 'fuel');
        } else if (text.includes('exterior') && text.includes('color')) {
          vehicle.exteriorColor = this.extractSpecValue(value, 'exterior color');
        } else if (text.includes('interior') && text.includes('color')) {
          vehicle.interiorColor = this.extractSpecValue(value, 'interior color');
        } else if (text.includes('body') && text.includes('style')) {
          vehicle.bodyStyle = this.extractSpecValue(value, 'body style');
        }
      });
    }
    
    // Try alternative selectors for specific fields
    if (!vehicle.transmission) {
      const transmissionEl = this.probe.findByLabel(['transmission', 'trans']);
      if (transmissionEl) {
        vehicle.transmission = transmissionEl.textContent?.trim();
      }
    }
    
    if (!vehicle.exteriorColor) {
      const colorEl = this.probe.findByLabel(['exterior color', 'color', 'ext color']);
      if (colorEl) {
        vehicle.exteriorColor = colorEl.textContent?.trim();
      }
    }
  }

  private extractSpecValue(fullText: string, specType: string): string {
    // Remove the spec label and return the value
    const parts = fullText.split(':');
    if (parts.length > 1) {
      return parts[1].trim();
    }
    
    // Try to extract after the spec type
    const regex = new RegExp(specType + '\\s*:?\\s*([^\\n\\r]+)', 'i');
    const match = fullText.match(regex);
    return match ? match[1].trim() : fullText.trim();
  }

  private async extractDealerInfo(dealer: Dealer, _warnings: string[]): Promise<void> {
    // Extract dealer name
    const dealerNameSelectors = [
      '.dealer-name',
      '[data-cmp="dealerName"]',
      '.dealer-info .name',
      '.seller-name'
    ];
    
    const dealerNameElement = this.probe.findElement(dealerNameSelectors);
    if (dealerNameElement) {
      dealer.name = dealerNameElement.textContent?.trim();
    }
    
    // Extract dealer contact info
    const contactSelectors = [
      '.dealer-contact',
      '.contact-info',
      '[data-cmp="dealerContact"]'
    ];
    
    const contactElement = this.probe.findElement(contactSelectors);
    if (contactElement) {
      const contactText = contactElement.textContent || '';
      
      // Extract phone
      const phoneMatch = contactText.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
      if (phoneMatch) {
        dealer.phone = phoneMatch[1];
      }
      
      // Extract address components
      const addressMatch = contactText.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})/);
      if (addressMatch) {
        dealer.city = addressMatch[1].trim();
        dealer.state = addressMatch[2];
        dealer.zip = addressMatch[3];
      }
    }
  }

  private async extractVIN(vehicle: Vehicle, warnings: string[]): Promise<void> {
    // Look for VIN in labeled fields
    const vinElement = this.probe.findByLabel(['vin', 'vehicle identification number']);
    
    if (vinElement) {
      vehicle.vin = vinElement.textContent?.trim();
    } else {
      // Use regex on page text
      const vinRegex = /\b[A-HJ-NPR-Z0-9]{17}\b/;
      const pageText = document.body.textContent || '';
      const vinMatch = pageText.match(vinRegex);
      if (vinMatch) {
        vehicle.vin = vinMatch[0];
      } else {
        warnings.push('VIN not found');
      }
    }
  }

  private async extractDescription(vehicle: Vehicle, warnings: string[]): Promise<void> {
    const descriptionSelectors = [
      '.vehicle-description',
      '[data-cmp="vehicleDescription"]',
      '.description-content',
      '.vehicle-comments'
    ];
    
    const descriptionElement = this.probe.findElement(descriptionSelectors);
    if (descriptionElement) {
      vehicle.description = descriptionElement.textContent?.trim();
    } else {
      warnings.push('Description not found');
    }
  }

  private async extractPhotos(warnings: string[]): Promise<Photo[]> {
    try {
      return await extractPhotos([
        '.vehicle-gallery img',
        '[data-cmp="vehicleGallery"] img',
        '.gallery-thumbnail img',
        '.hero-image img'
      ]);
    } catch (error) {
      warnings.push('Failed to extract photos: ' + (error as Error).message);
      return [];
    }
  }
}
