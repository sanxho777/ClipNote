import { SiteAdapter, ScrapeResult, Vehicle, Dealer, Photo } from '../types';
import { SelectorProbe } from '../core/selectors';
import { normalizeVehicleData } from '../core/normalize';
import { extractPhotos } from '../core/photos';
import { Logger } from '../core/logger';

export class GenericAdapter implements SiteAdapter {
  name = 'Generic';
  hostnames = ['*']; // Matches any hostname
  
  private logger = new Logger('Generic');
  private probe = new SelectorProbe();

  isVehiclePage(url: string): boolean {
    // Generic heuristics for vehicle pages
    const vehicleKeywords = [
      'vehicle', 'car', 'auto', 'inventory', 'details',
      'listing', 'vdp', 'used-car', 'new-car'
    ];
    
    return vehicleKeywords.some(keyword => 
      url.toLowerCase().includes(keyword)
    );
  }

  async scrape(): Promise<ScrapeResult> {
    this.logger.info('Starting generic scrape');
    
    const warnings: string[] = [];
    const vehicle: Vehicle = {};
    const dealer: Dealer = {};
    
    try {
      // Try to extract data using generic approaches
      await this.extractFromMicrodata(vehicle, warnings);
      await this.extractFromOpenGraph(vehicle, warnings);
      await this.extractFromStructuredData(vehicle, warnings);
      await this.extractFromHeuristics(vehicle, dealer, warnings);
      
      // Extract photos using generic selectors
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
        id: `generic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      this.logger.info('Generic scrape completed', result);
      return result;
      
    } catch (error) {
      this.logger.error('Generic scrape failed:', error);
      throw new Error(`Generic scraping failed: ${(error as Error).message}`);
    }
  }

  private async extractFromMicrodata(vehicle: Vehicle, _warnings: string[]): Promise<void> {
    // Look for microdata attributes
    const microdataElements = document.querySelectorAll('[itemtype*="Vehicle"], [itemtype*="Car"], [itemtype*="Auto"]');
    
    microdataElements.forEach(element => {
      const properties = element.querySelectorAll('[itemprop]');
      
      properties.forEach(prop => {
        const propName = prop.getAttribute('itemprop');
        const content = prop.getAttribute('content') || prop.textContent?.trim();
        
        if (!content) return;
        
        switch (propName) {
          case 'name':
          case 'model':
            this.parseVehicleName(content, vehicle);
            break;
          case 'brand':
          case 'manufacturer':
            vehicle.make = content;
            break;
          case 'productionDate':
          case 'modelYear':
            vehicle.year = parseInt(content);
            break;
          case 'price':
          case 'offers':
            const priceMatch = content.match(/(\d+)/);
            if (priceMatch) {
              vehicle.price = parseInt(priceMatch[1]);
            }
            break;
          case 'mileageFromOdometer':
          case 'mileage':
            const mileageMatch = content.match(/(\d+)/);
            if (mileageMatch) {
              vehicle.mileage = parseInt(mileageMatch[1]);
            }
            break;
          case 'vehicleIdentificationNumber':
          case 'vin':
            vehicle.vin = content;
            break;
          case 'color':
            if (!vehicle.exteriorColor) {
              vehicle.exteriorColor = content;
            }
            break;
          case 'description':
            vehicle.description = content;
            break;
        }
      });
    });
  }

  private async extractFromOpenGraph(vehicle: Vehicle, _warnings: string[]): Promise<void> {
    // Extract from Open Graph meta tags
    const ogTags = document.querySelectorAll('meta[property^="og:"]');
    
    ogTags.forEach(tag => {
      const property = tag.getAttribute('property');
      const content = tag.getAttribute('content');
      
      if (!content) return;
      
      switch (property) {
        case 'og:title':
          if (!vehicle.year || !vehicle.make || !vehicle.model) {
            this.parseVehicleName(content, vehicle);
          }
          break;
        case 'og:description':
          if (!vehicle.description) {
            vehicle.description = content;
          }
          break;
      }
    });
    
    // Also check Twitter cards
    const twitterTags = document.querySelectorAll('meta[name^="twitter:"]');
    twitterTags.forEach(tag => {
      const name = tag.getAttribute('name');
      const content = tag.getAttribute('content');
      
      if (!content) return;
      
      if (name === 'twitter:title' && (!vehicle.year || !vehicle.make || !vehicle.model)) {
        this.parseVehicleName(content, vehicle);
      }
    });
  }

  private async extractFromStructuredData(vehicle: Vehicle, _warnings: string[]): Promise<void> {
    // Look for JSON-LD structured data
    const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
    
    jsonLdElements.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        
        if (data['@type'] === 'Vehicle' || data['@type'] === 'Car') {
          if (data.name) this.parseVehicleName(data.name, vehicle);
          if (data.brand) vehicle.make = data.brand;
          if (data.model) vehicle.model = data.model;
          if (data.productionDate) vehicle.year = parseInt(data.productionDate);
          if (data.offers && data.offers.price) {
            const priceMatch = data.offers.price.toString().match(/(\d+)/);
            if (priceMatch) vehicle.price = parseInt(priceMatch[1]);
          }
          if (data.mileageFromOdometer) vehicle.mileage = parseInt(data.mileageFromOdometer);
          if (data.vehicleIdentificationNumber) vehicle.vin = data.vehicleIdentificationNumber;
          if (data.color) vehicle.exteriorColor = data.color;
          if (data.description) vehicle.description = data.description;
        }
      } catch (error) {
        // Ignore JSON parsing errors
      }
    });
  }

  private async extractFromHeuristics(vehicle: Vehicle, dealer: Dealer, warnings: string[]): Promise<void> {
    // Extract using common patterns and proximity-based selection
    
    // Try to find title/heading with vehicle info
    if (!vehicle.year || !vehicle.make || !vehicle.model) {
      const headings = document.querySelectorAll('h1, h2, .title, .vehicle-title, .listing-title');
      for (const heading of headings) {
        const text = heading.textContent?.trim() || '';
        if (this.looksLikeVehicleTitle(text)) {
          this.parseVehicleName(text, vehicle);
          break;
        }
      }
    }
    
    // Extract price using common patterns
    if (!vehicle.price) {
      const priceElements = document.querySelectorAll('.price, .cost, .amount, [class*="price"], [id*="price"]');
      for (const element of priceElements) {
        const text = element.textContent || '';
        const priceMatch = text.match(/\$[\d,]+/);
        if (priceMatch) {
          const price = parseInt(priceMatch[0].replace(/[$,]/g, ''));
          if (price > 1000 && price < 1000000) { // Reasonable car price range
            vehicle.price = price;
            break;
          }
        }
      }
    }
    
    // Extract mileage using regex on page text
    if (!vehicle.mileage) {
      const pageText = document.body.textContent || '';
      const mileageMatch = pageText.match(/(\d{1,3}(?:,\d{3})*)\s*miles?/i);
      if (mileageMatch) {
        vehicle.mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
      }
    }
    
    // Extract VIN using regex
    if (!vehicle.vin) {
      const pageText = document.body.textContent || '';
      const vinMatch = pageText.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
      if (vinMatch) {
        vehicle.vin = vinMatch[0];
      }
    }
    
    // Extract dealer name from common selectors
    if (!dealer.name) {
      const dealerElements = document.querySelectorAll('.dealer, .dealership, .seller, [class*="dealer"], [id*="dealer"]');
      for (const element of dealerElements) {
        const text = element.textContent?.trim();
        if (text && text.length > 3 && text.length < 100) {
          dealer.name = text;
          break;
        }
      }
    }
    
    // Try to find contact info
    const contactText = document.body.textContent || '';
    const phoneMatch = contactText.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch) {
      dealer.phone = phoneMatch[1];
    }
    
    // Extract specs using proximity-based selection
    this.extractSpecsByProximity(vehicle, warnings);
  }

  private looksLikeVehicleTitle(text: string): boolean {
    // Check if text looks like a vehicle title
    const vehiclePattern = /\d{4}\s+[A-Za-z]+\s+[A-Za-z0-9\s]+/;
    return vehiclePattern.test(text);
  }

  private parseVehicleName(text: string, vehicle: Vehicle): void {
    // Parse vehicle name in format "2023 Honda Civic LX"
    const match = text.match(/(\d{4})\s+([A-Za-z]+)\s+([A-Za-z0-9\s]+?)(?:\s+([A-Za-z0-9\s]+))?$/);
    
    if (match) {
      if (!vehicle.year) vehicle.year = parseInt(match[1]);
      if (!vehicle.make) vehicle.make = match[2];
      
      if (!vehicle.model) {
        const remaining = match[3].trim();
        const parts = remaining.split(/\s+/);
        vehicle.model = parts[0];
        
        if (parts.length > 1 && !vehicle.trim) {
          vehicle.trim = parts.slice(1).join(' ');
        }
      }
      
      if (match[4] && !vehicle.trim) {
        vehicle.trim = match[4];
      }
    }
  }

  private extractSpecsByProximity(vehicle: Vehicle, _warnings: string[]): void {
    // Use proximity-based extraction for vehicle specs
    const specKeywords = {
      transmission: ['transmission', 'trans', 'automatic', 'manual', 'cvt'],
      drivetrain: ['drivetrain', 'drive', 'awd', 'fwd', 'rwd', '4wd'],
      engine: ['engine', 'motor', 'cylinder', 'liter', 'turbo'],
      fuelType: ['fuel', 'gas', 'gasoline', 'diesel', 'electric', 'hybrid'],
      exteriorColor: ['exterior color', 'color', 'paint'],
      interiorColor: ['interior color', 'interior'],
      bodyStyle: ['body style', 'body type', 'sedan', 'suv', 'truck', 'coupe', 'hatchback']
    };
    
    Object.entries(specKeywords).forEach(([field, keywords]) => {
      if (vehicle[field as keyof Vehicle]) return; // Already found
      
      for (const keyword of keywords) {
        const element = this.probe.findByLabel([keyword]);
        if (element) {
          const value = element.textContent?.trim();
          if (value && value.length > 1 && value.length < 100) {
            (vehicle as any)[field] = value;
            break;
          }
        }
      }
    });
  }

  private async extractPhotos(warnings: string[]): Promise<Photo[]> {
    try {
      // Use generic photo selectors
      return await extractPhotos([
        '.gallery img',
        '.photos img',
        '.images img',
        '[class*="gallery"] img',
        '[class*="photo"] img',
        '[id*="gallery"] img',
        '[id*="photo"] img'
      ]);
    } catch (error) {
      warnings.push('Failed to extract photos: ' + (error as Error).message);
      return [];
    }
  }
}
