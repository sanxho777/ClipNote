import { SiteAdapter, ScrapeResult, Vehicle, Dealer, Photo } from '../types';
import { SelectorProbe } from '../core/selectors';
import { normalizeVehicleData } from '../core/normalize';
import { extractPhotos } from '../core/photos';
import { Logger } from '../core/logger';

export class DealerDotComAdapter implements SiteAdapter {
  name = 'Dealer.com';
  hostnames = ['dealer.com', 'www.dealer.com'];
  
  private logger = new Logger('Dealer.com');
  private probe = new SelectorProbe();

  isVehiclePage(url: string): boolean {
    return /\/inventory\/|\/vehicle\/|\/vdp\//i.test(url);
  }

  async scrape(): Promise<ScrapeResult> {
    this.logger.info('Starting Dealer.com scrape');
    
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
        id: `dealer_com_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      this.logger.info('Dealer.com scrape completed', result);
      return result;
      
    } catch (error) {
      this.logger.error('Dealer.com scrape failed:', error);
      throw new Error(`Dealer.com scraping failed: ${(error as Error).message}`);
    }
  }

  private async extractTitleInfo(vehicle: Vehicle, warnings: string[]): Promise<void> {
    const titleSelectors = [
      '.vdp-header h1',
      '.vehicle-title h1',
      '.inventory-title',
      '.model-year-make',
      'h1.vehicle-name'
    ];
    
    const titleElement = this.probe.findElement(titleSelectors);
    
    if (titleElement) {
      const titleText = titleElement.textContent?.trim() || '';
      this.logger.debug('Found title:', titleText);
      
      // Parse Dealer.com title format
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
      '.vehicle-price .price',
      '.price-value',
      '.listing-price',
      '.vdp-price',
      '.msrp-price'
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
      '.vehicle-mileage',
      '.mileage-value',
      '.odometer',
      '.vdp-mileage'
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
    // Dealer.com specifications section
    const specsSection = this.probe.findElement([
      '.vehicle-specs',
      '.specifications',
      '.vehicle-features',
      '.vdp-specs'
    ]);
    
    if (specsSection) {
      const specItems = specsSection.querySelectorAll('li, .spec-item, .feature-item, tr');
      
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
    
    // Try table format common on dealer sites
    const specTable = this.probe.findElement(['.specs-table', '.vehicle-details-table']);
    if (specTable) {
      const rows = specTable.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const label = cells[0].textContent?.toLowerCase() || '';
          const value = cells[1].textContent?.trim() || '';
          
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
      });
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
      '.dealer-name',
      '.dealership-name',
      '.seller-name',
      '.vdp-dealer-name'
    ];
    
    const dealerNameElement = this.probe.findElement(dealerNameSelectors);
    if (dealerNameElement) {
      dealer.name = dealerNameElement.textContent?.trim();
    }
    
    // Extract dealer contact info
    const contactSelectors = [
      '.dealer-contact',
      '.contact-info',
      '.dealer-info',
      '.dealership-contact'
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
      '.description-content',
      '.vehicle-comments',
      '.vdp-description'
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
        '.photo-gallery img',
        '.image-gallery img',
        '.vdp-photos img'
      ]);
    } catch (error) {
      warnings.push('Failed to extract photos: ' + (error as Error).message);
      return [];
    }
  }
}
