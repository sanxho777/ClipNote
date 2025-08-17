import { SiteAdapter, ScrapeResult, Vehicle, Dealer, Photo } from '../types';
import { SelectorProbe } from '../core/selectors';
import { normalizeVehicleData } from '../core/normalize';
import { extractPhotos } from '../core/photos';
import { Logger } from '../core/logger';

export class CarsDotComAdapter implements SiteAdapter {
  name = 'Cars.com';
  hostnames = ['cars.com', 'www.cars.com'];
  
  private logger = new Logger('Cars.com');
  private probe = new SelectorProbe();

  isVehiclePage(url: string): boolean {
    return /\/vehicledetail\/|\/listing\/|\/vehicle\//i.test(url);
  }

  async scrape(): Promise<ScrapeResult> {
    this.logger.info('Starting Cars.com scrape');
    
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
        id: `cars_com_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      this.logger.info('Cars.com scrape completed', result);
      return result;
      
    } catch (error) {
      this.logger.error('Cars.com scrape failed:', error);
      throw new Error(`Cars.com scraping failed: ${(error as Error).message}`);
    }
  }

  private async extractTitleInfo(vehicle: Vehicle, warnings: string[]): Promise<void> {
    const titleSelectors = [
      'h1[data-testid="structured-data-title"]',
      '.vehicle-title h1',
      '.listing-title h1',
      'h1.vehicle-info-title',
      '[data-testid="vehicle-title"]'
    ];
    
    const titleElement = this.probe.findElement(titleSelectors);
    
    if (titleElement) {
      const titleText = titleElement.textContent?.trim() || '';
      this.logger.debug('Found title:', titleText);
      
      // Parse Cars.com title format
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
      '[data-testid="price"]',
      '.primary-price',
      '.vehicle-price .price',
      '.listing-price'
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
      '[data-testid="mileage"]',
      '.vehicle-mileage',
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
    // Cars.com often has a specifications section
    const specsSection = this.probe.findElement([
      '[data-testid="specifications"]',
      '.vehicle-specs',
      '.specifications-section',
      '.vehicle-features'
    ]);
    
    if (specsSection) {
      const specItems = specsSection.querySelectorAll('li, .spec-row, .feature-item, dt, dd');
      
      let currentLabel = '';
      specItems.forEach((item, _index) => {
        const text = item.textContent?.toLowerCase() || '';
        const value = item.textContent?.trim() || '';
        
        // Handle dt/dd pairs
        if (item.tagName.toLowerCase() === 'dt') {
          currentLabel = text;
        } else if (item.tagName.toLowerCase() === 'dd' && currentLabel) {
          this.parseSpecField(currentLabel, value, vehicle);
          currentLabel = '';
        } else {
          // Handle other formats
          if (text.includes('transmission')) {
            vehicle.transmission = this.extractSpecValue(value, 'transmission');
          } else if (text.includes('drivetrain') || text.includes('drive type')) {
            vehicle.drivetrain = this.extractSpecValue(value, 'drivetrain');
          } else if (text.includes('engine')) {
            vehicle.engine = this.extractSpecValue(value, 'engine');
          } else if (text.includes('fuel type')) {
            vehicle.fuelType = this.extractSpecValue(value, 'fuel type');
          } else if (text.includes('exterior color')) {
            vehicle.exteriorColor = this.extractSpecValue(value, 'exterior color');
          } else if (text.includes('interior color')) {
            vehicle.interiorColor = this.extractSpecValue(value, 'interior color');
          } else if (text.includes('body style') || text.includes('body type')) {
            vehicle.bodyStyle = this.extractSpecValue(value, 'body style');
          }
        }
      });
    }
    
    // Try data attributes that Cars.com might use
    const dataAttributes = document.querySelector('[data-make], [data-model], [data-year]');
    if (dataAttributes) {
      if (!vehicle.make && dataAttributes.getAttribute('data-make')) {
        vehicle.make = dataAttributes.getAttribute('data-make')!;
      }
      if (!vehicle.model && dataAttributes.getAttribute('data-model')) {
        vehicle.model = dataAttributes.getAttribute('data-model')!;
      }
      if (!vehicle.year && dataAttributes.getAttribute('data-year')) {
        vehicle.year = parseInt(dataAttributes.getAttribute('data-year')!);
      }
    }
  }

  private parseSpecField(label: string, value: string, vehicle: Vehicle): void {
    if (label.includes('transmission')) {
      vehicle.transmission = value;
    } else if (label.includes('drivetrain') || label.includes('drive')) {
      vehicle.drivetrain = value;
    } else if (label.includes('engine')) {
      vehicle.engine = value;
    } else if (label.includes('fuel')) {
      vehicle.fuelType = value;
    } else if (label.includes('exterior') && label.includes('color')) {
      vehicle.exteriorColor = value;
    } else if (label.includes('interior') && label.includes('color')) {
      vehicle.interiorColor = value;
    } else if (label.includes('body')) {
      vehicle.bodyStyle = value;
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
      '[data-testid="dealer-name"]',
      '.dealer-name',
      '.seller-name',
      '.dealership-name'
    ];
    
    const dealerNameElement = this.probe.findElement(dealerNameSelectors);
    if (dealerNameElement) {
      dealer.name = dealerNameElement.textContent?.trim();
    }
    
    // Extract dealer contact info
    const contactSelectors = [
      '[data-testid="dealer-contact"]',
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
    // Look for VIN in data attributes first
    const vinDataElement = document.querySelector('[data-vin]');
    if (vinDataElement) {
      vehicle.vin = vinDataElement.getAttribute('data-vin') || undefined;
    } else {
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
  }

  private async extractDescription(vehicle: Vehicle, warnings: string[]): Promise<void> {
    const descriptionSelectors = [
      '[data-testid="description"]',
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
        '[data-testid^="gallery-image"] img',
        '.vehicle-gallery img',
        '.image-gallery img',
        '.listing-photos img'
      ]);
    } catch (error) {
      warnings.push('Failed to extract photos: ' + (error as Error).message);
      return [];
    }
  }
}
