import { ScrapeResult } from '../types';
import { storage } from '../core/storage';
import { Logger, toastManager } from '../core/logger';
import { formatPrice, formatMileage, generateFacebookTitle } from '../core/normalize';

class PopupManager {
  private logger = new Logger('Popup');
  private currentTab: chrome.tabs.Tab | null = null;
  private currentScrapeResult: ScrapeResult | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.logger.info('Initializing popup');
    
    try {
      // Get current tab
      await this.getCurrentTab();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Check page status
      await this.checkPageStatus();
      
      // Load recent scrapes
      await this.loadRecentScrapes();
      
      this.logger.info('Popup initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize popup:', error);
      this.showError('Failed to initialize extension');
    }
  }

  private async getCurrentTab(): Promise<void> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0] || null;
    
    if (!this.currentTab) {
      throw new Error('No active tab found');
    }
    
    this.logger.debug('Current tab:', this.currentTab.url);
  }

  private setupEventListeners(): void {
    // Scrape button
    const scrapeBtn = document.getElementById('scrapeBtn');
    scrapeBtn?.addEventListener('click', () => this.handleScrape());

    // Facebook button
    const facebookBtn = document.getElementById('facebookBtn');
    facebookBtn?.addEventListener('click', () => this.handleFacebookAutofill());

    // Download button
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn?.addEventListener('click', () => this.handleDownloadPhotos());

    // Full app button
    const fullAppBtn = document.getElementById('fullAppBtn');
    fullAppBtn?.addEventListener('click', () => this.openFullApp());

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    settingsBtn?.addEventListener('click', () => this.openSettings());

    this.logger.debug('Event listeners setup complete');
  }

  private async checkPageStatus(): Promise<void> {
    
    if (!this.currentTab?.url) {
      this.updateStatus('❌', 'No page loaded', 'Please navigate to a vehicle page');
      return;
    }

    try {
      // Check if this is a supported site
      const supportedSites = ['autotrader.com', 'cars.com', 'cargurus.com', 'dealer.com'];
      const hostname = new URL(this.currentTab.url).hostname;
      const isSupported = supportedSites.some(site => hostname.includes(site));

      if (isSupported) {
        // Send message to content script to check if it's a vehicle page
        const response = await chrome.tabs.sendMessage(this.currentTab.id!, {
          type: 'CHECK_VEHICLE_PAGE'
        });

        if (response?.isVehiclePage) {
          this.updateStatus('✅', 'Vehicle page detected', 'Ready to scrape');
          this.enableScraping();
        } else {
          this.updateStatus('⚠️', 'Not a vehicle page', 'Navigate to a vehicle detail page');
        }
      } else {
        this.updateStatus('🔍', 'Unknown site', 'Will use generic scraping');
        this.enableScraping();
      }
    } catch (error) {
      this.logger.warn('Could not check page status:', error);
      this.updateStatus('🔍', 'Page check failed', 'Generic scraping available');
      this.enableScraping();
    }
  }

  private updateStatus(icon: string, title: string, subtitle: string): void {
    const statusElement = document.getElementById('pageStatus');
    const iconElement = statusElement?.querySelector('.status-icon');
    const titleElement = statusElement?.querySelector('.status-title');
    const subtitleElement = statusElement?.querySelector('.status-subtitle');

    if (iconElement) iconElement.textContent = icon;
    if (titleElement) titleElement.textContent = title;
    if (subtitleElement) subtitleElement.textContent = subtitle;
  }

  private enableScraping(): void {
    const scrapeBtn = document.getElementById('scrapeBtn') as HTMLButtonElement;
    if (scrapeBtn) {
      scrapeBtn.disabled = false;
    }
  }

  private async handleScrape(): Promise<void> {
    if (!this.currentTab?.id) {
      this.showError('No active tab');
      return;
    }

    this.showLoading(true);
    this.logger.info('Starting scrape operation');

    try {
      // Send scrape message to background script
      const response = await chrome.runtime.sendMessage({
        type: 'SCRAPE_PAGE'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      this.currentScrapeResult = response.result;
      if (this.currentScrapeResult) {
        this.displayScrapeResults(this.currentScrapeResult);
      }
      this.showPostScrapeActions();
      
      toastManager.show('Vehicle data scraped successfully!', 'success');
      this.logger.info('Scrape completed successfully');

    } catch (error) {
      this.logger.error('Scrape failed:', error);
      this.showError('Failed to scrape page: ' + (error as Error).message);
    } finally {
      this.showLoading(false);
    }
  }

  private displayScrapeResults(result: ScrapeResult): void {
    const resultsSection = document.getElementById('scrapeResults');
    const titleElement = document.getElementById('vehicleTitle');
    const priceElement = document.getElementById('vehiclePrice');
    const mileageElement = document.getElementById('vehicleMileage');
    const photoCountElement = document.getElementById('photoCount');
    const photoPreviewElement = document.getElementById('photoPreview');

    if (!resultsSection) return;

    // Show results section
    resultsSection.classList.remove('hidden');

    // Update vehicle info
    if (titleElement) {
      titleElement.textContent = generateFacebookTitle(result.vehicle) || 'Unknown Vehicle';
    }

    if (priceElement) {
      priceElement.textContent = result.vehicle.price ? formatPrice(result.vehicle.price) : 'Price N/A';
    }

    if (mileageElement) {
      mileageElement.textContent = result.vehicle.mileage ? formatMileage(result.vehicle.mileage) : 'Mileage N/A';
    }

    // Update photo info
    if (photoCountElement) {
      const count = result.photos.length;
      photoCountElement.textContent = `${count} photo${count !== 1 ? 's' : ''}`;
    }

    // Show photo preview
    if (photoPreviewElement) {
      photoPreviewElement.innerHTML = '';
      
      if (result.photos.length > 0) {
        const previewCount = Math.min(3, result.photos.length);
        for (let i = 0; i < previewCount; i++) {
          const img = document.createElement('img');
          img.src = result.photos[i].url;
          img.className = 'photo-thumb';
          img.onerror = () => {
            img.style.display = 'none';
          };
          photoPreviewElement.appendChild(img);
        }

        if (result.photos.length > 3) {
          const more = document.createElement('div');
          more.className = 'photo-more';
          more.textContent = `+${result.photos.length - 3}`;
          photoPreviewElement.appendChild(more);
        }
      }
    }

    // Show warnings if any
    this.displayWarnings(result.warnings);
  }

  private displayWarnings(warnings: string[]): void {
    const warningsSection = document.getElementById('warnings');
    const warningsList = document.getElementById('warningsList');

    if (!warningsSection || !warningsList) return;

    if (warnings.length > 0) {
      warningsSection.classList.remove('hidden');
      warningsList.innerHTML = '';
      
      warnings.forEach(warning => {
        const li = document.createElement('li');
        li.textContent = warning;
        warningsList.appendChild(li);
      });
    } else {
      warningsSection.classList.add('hidden');
    }
  }

  private showPostScrapeActions(): void {
    const actionsElement = document.getElementById('postScrapeActions');
    if (actionsElement) {
      actionsElement.classList.remove('hidden');
    }
  }

  private async handleFacebookAutofill(): Promise<void> {
    if (!this.currentScrapeResult) {
      this.showError('No scrape data available');
      return;
    }

    this.showLoading(true);
    this.logger.info('Starting Facebook autofill');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'OPEN_FACEBOOK_MARKETPLACE',
        scrapeResult: this.currentScrapeResult
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toastManager.show('Facebook Marketplace opened! Autofill starting...', 'info');
      this.logger.info('Facebook autofill initiated');

      // Close popup after successful initiation
      setTimeout(() => window.close(), 1000);

    } catch (error) {
      this.logger.error('Facebook autofill failed:', error);
      this.showError('Failed to open Facebook: ' + (error as Error).message);
    } finally {
      this.showLoading(false);
    }
  }

  private async handleDownloadPhotos(): Promise<void> {
    if (!this.currentScrapeResult?.photos.length) {
      this.showError('No photos to download');
      return;
    }

    this.showLoading(true);
    this.logger.info('Starting photo download');

    try {
      const photoUrls = this.currentScrapeResult.photos.map(p => p.url);
      
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_PHOTOS',
        photos: photoUrls
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toastManager.show(`Downloaded ${response.count} photos`, 'success');
      this.logger.info(`Downloaded ${response.count} photos`);

    } catch (error) {
      this.logger.error('Photo download failed:', error);
      this.showError('Failed to download photos: ' + (error as Error).message);
    } finally {
      this.showLoading(false);
    }
  }

  private openFullApp(): void {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/options.html') });
    window.close();
  }

  private openSettings(): void {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/options.html#settings') });
    window.close();
  }

  private async loadRecentScrapes(): Promise<void> {
    try {
      const results = await storage.getScrapeResults();
      const recentResults = results.slice(0, 5); // Show only 5 most recent

      const recentList = document.getElementById('recentList');
      if (!recentList) return;

      if (recentResults.length === 0) {
        recentList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-text">No recent scrapes</div>
          </div>
        `;
        return;
      }

      recentList.innerHTML = '';
      
      recentResults.forEach(result => {
        const item = this.createRecentItem(result);
        recentList.appendChild(item);
      });

    } catch (error) {
      this.logger.error('Failed to load recent scrapes:', error);
    }
  }

  private createRecentItem(result: ScrapeResult): HTMLElement {
    const item = document.createElement('div');
    item.className = 'recent-item';
    
    const title = generateFacebookTitle(result.vehicle) || 'Unknown Vehicle';
    const price = result.vehicle.price ? formatPrice(result.vehicle.price) : 'N/A';
    const date = new Date(result.scrapedAt).toLocaleDateString();
    const hostname = new URL(result.sourceUrl).hostname;

    item.innerHTML = `
      <div class="recent-info">
        <div class="recent-title">${title}</div>
        <div class="recent-details">
          <span class="recent-price">${price}</span>
          <span class="recent-site">${hostname}</span>
          <span class="recent-date">${date}</span>
        </div>
      </div>
      <button class="recent-action" data-id="${result.id}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4"></path>
          <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
          <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
        </svg>
      </button>
    `;

    // Add click handler for action button
    const actionBtn = item.querySelector('.recent-action') as HTMLButtonElement;
    actionBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleRecentItemAction(result);
    });

    return item;
  }

  private async handleRecentItemAction(result: ScrapeResult): Promise<void> {
    this.currentScrapeResult = result;
    this.displayScrapeResults(result);
    this.showPostScrapeActions();
    
    toastManager.show('Previous scrape data loaded', 'info');
  }

  private showLoading(show: boolean): void {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      if (show) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
  }

  private showError(message: string): void {
    toastManager.show(message, 'error');
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PopupManager());
} else {
  new PopupManager();
}
