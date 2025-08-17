import { ScrapeResult, FacebookAutofillOptions } from '../types';
import { generateFacebookTitle, generateFacebookDescription } from './normalize';
import { urlsToFiles } from './photos';
import { Logger } from './logger';

export class FacebookAutofiller {
  private logger = new Logger('FacebookAutofiller');
  // Future use for retry logic
  // private readonly maxRetries = 5;
  // private readonly retryDelay = 2000;

  /**
   * Auto-fill Facebook Marketplace vehicle listing form
   */
  async autofillForm(scrapeResult: ScrapeResult, options: FacebookAutofillOptions = {}): Promise<void> {
    this.logger.info('Starting Facebook Marketplace autofill');
    
    const { vehicle, dealer, photos } = scrapeResult;
    const opts = {
      condition: 'Used' as const,
      uploadPhotos: true,
      maxPhotos: 20,
      ...options
    };

    try {
      // Wait for the page to be ready
      await this.waitForPageReady();

      // Fill basic vehicle information
      await this.fillVehicleDetails(vehicle, opts);
      
      // Fill location information
      await this.fillLocationInfo(dealer);
      
      // Fill description
      await this.fillDescription(vehicle, dealer, scrapeResult.vehicle.stockNumber);
      
      // Upload photos if enabled
      if (opts.uploadPhotos && photos.length > 0) {
        await this.uploadPhotos(photos, opts.maxPhotos);
      }

      this.logger.info('Facebook autofill completed successfully');
      
    } catch (error) {
      this.logger.error('Facebook autofill failed:', error);
      throw error;
    }
  }

  /**
   * Wait for Facebook Marketplace form to be ready
   */
  private async waitForPageReady(): Promise<void> {
    this.logger.debug('Waiting for Facebook page to be ready');
    
    // Wait for the main form container
    const formSelector = '[data-testid="marketplace_composer_form"], .marketplace-composer, form[data-testid*="composer"]';
    await this.waitForSelector(formSelector, 10000);
    
    // Additional wait for form fields to be rendered
    await this.sleep(2000);
    
    this.logger.debug('Facebook page is ready');
  }

  /**
   * Fill vehicle details in the form
   */
  private async fillVehicleDetails(vehicle: any, options: FacebookAutofillOptions): Promise<void> {
    this.logger.debug('Filling vehicle details');

    // Fill title
    const title = generateFacebookTitle(vehicle);
    await this.fillInput(['[data-testid="marketplace_composer_title"]', 'input[placeholder*="title" i]', 'input[name="title"]'], title);

    // Fill price
    if (vehicle.price) {
      await this.fillInput([
        '[data-testid="marketplace_composer_price"]',
        'input[placeholder*="price" i]',
        'input[name="price"]',
        'input[type="number"]'
      ], vehicle.price.toString());
    }

    // Fill year
    if (vehicle.year) {
      await this.fillSelect(['select[data-testid*="year"]', 'select[name*="year"]'], vehicle.year.toString());
    }

    // Fill make
    if (vehicle.make) {
      await this.fillSelect(['select[data-testid*="make"]', 'select[name*="make"]'], vehicle.make);
    }

    // Fill model
    if (vehicle.model) {
      await this.fillSelect(['select[data-testid*="model"]', 'select[name*="model"]'], vehicle.model);
    }

    // Fill mileage
    if (vehicle.mileage) {
      await this.fillInput([
        '[data-testid*="mileage"]',
        'input[placeholder*="mileage" i]',
        'input[name*="mileage"]'
      ], vehicle.mileage.toString());
    }

    // Fill VIN
    if (vehicle.vin) {
      await this.fillInput([
        '[data-testid*="vin"]',
        'input[placeholder*="vin" i]',
        'input[name*="vin"]'
      ], vehicle.vin);
    }

    // Fill condition
    const condition = options.condition || vehicle.condition || 'Used';
    await this.fillSelect([
      'select[data-testid*="condition"]',
      'select[name*="condition"]'
    ], condition);

    // Fill transmission
    if (vehicle.transmission) {
      await this.fillSelect([
        'select[data-testid*="transmission"]',
        'select[name*="transmission"]'
      ], vehicle.transmission);
    }

    // Fill drivetrain
    if (vehicle.drivetrain) {
      await this.fillSelect([
        'select[data-testid*="drivetrain"]',
        'select[name*="drivetrain"]',
        'select[data-testid*="drive"]'
      ], vehicle.drivetrain);
    }

    // Fill fuel type
    if (vehicle.fuelType) {
      await this.fillSelect([
        'select[data-testid*="fuel"]',
        'select[name*="fuel"]'
      ], vehicle.fuelType);
    }

    // Fill body style
    if (vehicle.bodyStyle) {
      await this.fillSelect([
        'select[data-testid*="body"]',
        'select[name*="body"]',
        'select[data-testid*="type"]'
      ], vehicle.bodyStyle);
    }

    // Fill exterior color
    if (vehicle.exteriorColor) {
      await this.fillSelect([
        'select[data-testid*="exterior"]',
        'select[data-testid*="color"]',
        'select[name*="color"]'
      ], vehicle.exteriorColor);
    }

    this.logger.debug('Vehicle details filled');
  }

  /**
   * Fill location information
   */
  private async fillLocationInfo(dealer: any): Promise<void> {
    if (!dealer.city && !dealer.state && !dealer.zip) {
      return;
    }

    this.logger.debug('Filling location info');

    // Try to fill location fields
    const locationText = [dealer.city, dealer.state, dealer.zip].filter(Boolean).join(', ');
    
    await this.fillInput([
      '[data-testid*="location"]',
      'input[placeholder*="location" i]',
      'input[placeholder*="city" i]',
      'input[name*="location"]',
      'input[name*="city"]'
    ], locationText);

    this.logger.debug('Location info filled');
  }

  /**
   * Fill description field
   */
  private async fillDescription(vehicle: any, dealer: any, stockNumber?: string): Promise<void> {
    this.logger.debug('Filling description');

    const description = generateFacebookDescription(vehicle, dealer, stockNumber);

    await this.fillTextarea([
      '[data-testid*="description"]',
      'textarea[placeholder*="description" i]',
      'textarea[name*="description"]',
      'textarea'
    ], description);

    this.logger.debug('Description filled');
  }

  /**
   * Upload photos to Facebook Marketplace
   */
  private async uploadPhotos(photos: any[], maxPhotos: number): Promise<void> {
    this.logger.info(`Starting photo upload (${Math.min(photos.length, maxPhotos)} photos)`);

    try {
      // Convert URLs to File objects
      const photosToUpload = photos.slice(0, maxPhotos);
      const files = await urlsToFiles(photosToUpload);

      if (files.length === 0) {
        this.logger.warn('No files could be converted for upload');
        return;
      }

      // Find file input
      const fileInput = await this.waitForSelector([
        'input[type="file"]',
        '[data-testid*="photo"] input[type="file"]',
        '[data-testid*="image"] input[type="file"]'
      ]) as HTMLInputElement;

      if (!fileInput) {
        throw new Error('Could not find file input for photo upload');
      }

      // Create DataTransfer object with files
      const dataTransfer = new DataTransfer();
      files.forEach(file => {
        dataTransfer.items.add(file);
      });

      // Set files to input
      fileInput.files = dataTransfer.files;

      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      // Also trigger input event for React forms
      const inputEvent = new Event('input', { bubbles: true });
      fileInput.dispatchEvent(inputEvent);

      this.logger.info(`Uploaded ${files.length} photos successfully`);

    } catch (error) {
      this.logger.error('Photo upload failed:', error);
      
      // Fallback: Show instruction to user
      this.showPhotoUploadInstructions(photos.length);
    }
  }

  /**
   * Show instructions for manual photo upload
   */
  private showPhotoUploadInstructions(photoCount: number): void {
    const message = `Automatic photo upload failed. Please manually upload the ${photoCount} vehicle photos that have been downloaded to your Downloads folder.`;
    
    // Try to show a native notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Photo Upload Required', {
        body: message,
        icon: chrome.runtime.getURL('public/icons/icon48.png')
      });
    } else {
      // Fallback to alert
      alert(message);
    }
  }

  /**
   * Fill an input field using multiple selectors
   */
  private async fillInput(selectors: string[], value: string): Promise<void> {
    const input = await this.waitForSelector(selectors, 5000) as HTMLInputElement;
    
    if (input) {
      // Clear existing value
      input.value = '';
      input.focus();
      
      // Set new value
      input.value = value;
      
      // Trigger events
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      
      this.logger.debug(`Filled input with value: ${value}`);
    } else {
      this.logger.warn(`Could not find input with selectors: ${selectors.join(', ')}`);
    }
  }

  /**
   * Fill a textarea field using multiple selectors
   */
  private async fillTextarea(selectors: string[], value: string): Promise<void> {
    const textarea = await this.waitForSelector(selectors, 5000) as HTMLTextAreaElement;
    
    if (textarea) {
      textarea.value = '';
      textarea.focus();
      textarea.value = value;
      
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      textarea.dispatchEvent(new Event('blur', { bubbles: true }));
      
      this.logger.debug(`Filled textarea with ${value.length} characters`);
    } else {
      this.logger.warn(`Could not find textarea with selectors: ${selectors.join(', ')}`);
    }
  }

  /**
   * Fill a select field using multiple selectors
   */
  private async fillSelect(selectors: string[], value: string): Promise<void> {
    const select = await this.waitForSelector(selectors, 5000) as HTMLSelectElement;
    
    if (select) {
      // Try exact match first
      const exactOption = Array.from(select.options).find(option => 
        option.value === value || option.textContent?.trim() === value
      );

      if (exactOption) {
        select.value = exactOption.value;
      } else {
        // Try partial match
        const partialOption = Array.from(select.options).find(option => 
          option.textContent?.toLowerCase().includes(value.toLowerCase()) ||
          option.value.toLowerCase().includes(value.toLowerCase())
        );

        if (partialOption) {
          select.value = partialOption.value;
        } else {
          this.logger.warn(`Could not find option "${value}" in select`);
          return;
        }
      }

      select.dispatchEvent(new Event('change', { bubbles: true }));
      this.logger.debug(`Selected option: ${value}`);
    } else {
      this.logger.warn(`Could not find select with selectors: ${selectors.join(', ')}`);
    }
  }

  /**
   * Wait for an element to appear using multiple selectors
   */
  private async waitForSelector(selectors: string | string[], timeout = 10000): Promise<Element | null> {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      for (const selector of selectorArray) {
        const element = document.querySelector(selector);
        if (element) {
          return element;
        }
      }
      
      await this.sleep(100);
    }

    this.logger.warn(`Timeout waiting for selectors: ${selectorArray.join(', ')}`);
    return null;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
