import { SiteAdapter, ScrapeResult, Vehicle, Dealer, Photo } from '../types';
import { SelectorProbe } from '../core/selectors';
import { normalizeVehicleData } from '../core/normalize';
import { extractPhotos } from '../core/photos';
import { Logger } from '../core/logger';

export class CarGurusAdapter implements SiteAdapter {
  name = 'CarGurus';
  hostnames = ['cargurus.com', 'www.cargurus.com'];
  
  private logger = new Logger('CarGurus');
  private probe = new SelectorProbe();

  isVehiclePage(url: string): boolean {
    return /\/cars\/l-|\/vehicle\/\d+/i.test(url);
  }

  async scrape(): Promise<ScrapeResult> {
    this.logger.info('Starting CarGurus scrape');
    
    const warnings: string[] = [];
    const vehicle: Vehicle = {};
    const dealer: Dealer = {};
    
    try {
      // Extract title information
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
        id: `cargurus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      this.logger.info('CarGurus scrape completed', result);
      return result;
      
    } catch (error) {
      this.logger.error('CarGurus scrape failed:', error);
      throw new Error(`CarGurus scraping failed: ${(error as Error).message}`);
    }
  }

  private async extractTitleInfo(vehicle: Vehicle, warnings: string[]): Promise<void> {
    const titleSelectors = [
      '.cg-listingDetail-model',
      'h1[data-cg-ft="listing-title"]',
      '.listing-title h1',
      '.vehicle-title',
      '.vdp-header h1'
    ];
    
    const titleElement = this.probe.findElement(titleSelectors);
    
    if (titleElement) {
      const titleText = titleElement.textContent?.trim() || '';
      this.logger.debug('Found title:', titleText);
      
      // CarGurus title format parsing
      const titleMatch = titleText.match(/(\d{4})\s+([A-Za-z]+)\s+([A-Za-z0-9\s]+?)(?:\s+([A-Za-z0-9\s]+))?$/);
      
      if (titleMatch) {
        vehicle.year = parseInt(titleMatch[1]);
        vehicle.make = titleMatch[2];
        
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
      '.cg-listingDetail-price',
      '[data-cg-ft="listing-price"]',
      '.listing-price',
      '.price-section .price'
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
      '.cg-listingDetail-mileage',
      '[data-cg-ft="listing-mileage"]',
      '.listing-mileage',
      '.mileage-display'
    ];
    
    const mileageElement = this.probe.findElement(mileageSelectors);
    if (mileageElement) {
      const mileageText = mileageElement.textContent?.replace(/[,\s]/g, '') || '';
      const mileageMatch = mileageText.match(/(\d+)/);
      if (mileageMatch) {
        vehicle.mileage = parseInt(mileageMatch[1]);
      }
    } else {
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
    // CarGurus specifications section
    const specsSection = this.probe.findElement([
      '.cg-listingDetail-specs',
      '.vehicle-specs',
      '.specifications',
      '.listing-specs'
    ]);
    
    if (specsSection) {
      const specItems = specsSection.querySelectorAll('li, .spec-item, .detail-item');
      
      specItems.forEach(item => {
        const text = item.textContent?.toLowerCase() || '';
        const value = item.textContent?.trim() || '';
        
        if (text.includes('transmission')) {
          vehicle.transmission = this.extractSpecValue(value, 'transmission');
        } else if (text.includes('drivetrain') || text.includes('drive type')) {
          vehicle.drivetrain = this.extractSpecValue(value, 'drivetrain');
        } else if (text.includes('engine')) {
          vehicle.engine = this.extractSpecValue(value, 'engine');
        } else if (text.includes('fuel')) {
          vehicle.fuelType = this.extractSpecValue(value, 'fuel');
        } else if (text.includes('exterior') && text.includes('color')) {
          vehicle.exteriorColor = this.extractSpecValue(value, 'exterior color');
        } else if (text.includes('interior') && text.includes('color')) {
          vehicle.interiorColor = this.extractSpecValue(value, 'interior color');
        } else if (text.includes('body') && (text.includes('style') || text.includes('type'))) {
          vehicle.bodyStyle = this.extractSpecValue(value, 'body style');
        }
      });
    }
    
    // Try alternative approaches for CarGurus specific layout
    if (!vehicle.transmission) {
      const transmissionEl = this.probe.findByLabel(['transmission', 'trans'], specsSection || undefined);
      if (transmissionEl) {
        vehicle.transmission = transmissionEl.textContent?.trim();
      }
    }
    
    if (!vehicle.exteriorColor) {
      const colorEl = this.probe.findByLabel(['exterior color', 'color'], specsSection || undefined);
      if (colorEl) {
        vehicle.exteriorColor = colorEl.textContent?.trim();
      }
    }
  }

  private extractSpecValue(fullText: string, specType: string): string {
    const parts = fullText.split(':');
    if (parts.length > 1) {
      return parts[1].trim();
    }
    
    const regex = new RegExp(specType + '\\s*:?\\s*([^\\n\\r]+)', 'i');
    const match = fullText.match(regex);
    return match ? match[1].trim() : fullText.trim();
  }

  private async extractDealerInfo(dealer: Dealer, _warnings: string[]): Promise<void> {
    // Extract dealer name
    const dealerNameSelectors = [
      '.cg-listingDetail-dealerName',
      '[data-cg-ft="dealer-name"]',
      '.dealer-name',
      '.seller-name'
    ];
    
    const dealerNameElement = this.probe.findElement(dealerNameSelectors);
    if (dealerNameElement) {
      dealer.name = dealerNameElement.textContent?.trim();
    }
    
    // Extract dealer contact info
    const contactSelectors = [
      '.cg-listingDetail-dealerContact',
      '.dealer-contact',
      '.contact-info',
      '.dealer-info'
    ];
    
    const contactElement = this.probe.findElement(contactSelectors);
    if (contactElement) {
      const contactText = contactElement.textContent || '';
      
      // Extract phone
      const phoneMatch = contactText.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
      if (phoneMatch) {
        dealer.phone = phoneMatch[1];
      }
      
      // Extract address
      const addressMatch = contactText.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})/);
      if (addressMatch) {
        dealer.city = addressMatch[1].trim();
        dealer.state = addressMatch[2];
        dealer.zip = addressMatch[3];
      }
    }
  }

  private async extractVIN(vehicle: Vehicle, warnings: string[]): Promise<void> {
    // Look for VIN in CarGurus specific selectors
    const vinElement = this.probe.findElement([
      '.cg-listingDetail-vin',
      '[data-cg-ft="vin"]'
    ]);
    
    if (vinElement) {
      vehicle.vin = vinElement.textContent?.trim();
    } else {
      // Look for VIN in labeled fields
      const vinLabelElement = this.probe.findByLabel(['vin', 'vehicle identification number']);
      
      if (vinLabelElement) {
        vehicle.vin = vinLabelElement.textContent?.trim();
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
  }

  private async extractDescription(vehicle: Vehicle, warnings: string[]): Promise<void> {
    const descriptionSelectors = [
      '.cg-listingDetail-description',
      '.vehicle-description',
      '.listing-description',
      '.description-content'
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
        '.cg-listingDetail-photoViewer img',
        '.vehicle-photos img',
        '.image-gallery img',
        '.listing-gallery img'
      ]);
    } catch (error) {
      warnings.push('Failed to extract photos: ' + (error as Error).message);
      return [];
    }
  }
}
