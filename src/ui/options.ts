import { ScrapeResult, StorageData } from '../types';
import { storage } from '../core/storage';
import { Logger, toastManager } from '../core/logger';
import { formatPrice, formatMileage, generateFacebookTitle } from '../core/normalize';

class OptionsManager {
  private logger = new Logger('Options');
  private currentData: StorageData | null = null;
  private filteredResults: ScrapeResult[] = [];
  private currentSection: string = 'inventory';

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.logger.info('Initializing options page');
    
    try {
      // Setup navigation
      this.setupNavigation();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadData();
      
      // Show initial section
      this.showSection('inventory');
      
      this.logger.info('Options page initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize options page:', error);
      this.showError('Failed to initialize application');
    }
  }

  private setupNavigation(): void {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = (e.currentTarget as HTMLElement).dataset.section;
        if (section) {
          this.showSection(section);
        }
      });
    });
  }

  private setupEventListeners(): void {
    // Search and filters
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const searchBtn = document.getElementById('searchBtn');
    const makeFilter = document.getElementById('makeFilter') as HTMLSelectElement;
    const yearFilter = document.getElementById('yearFilter') as HTMLSelectElement;
    const priceFilter = document.getElementById('priceFilter') as HTMLSelectElement;
    const clearFilters = document.getElementById('clearFilters');

    searchInput?.addEventListener('input', () => this.applyFilters());
    searchBtn?.addEventListener('click', () => this.applyFilters());
    makeFilter?.addEventListener('change', () => this.applyFilters());
    yearFilter?.addEventListener('change', () => this.applyFilters());
    priceFilter?.addEventListener('change', () => this.applyFilters());
    clearFilters?.addEventListener('click', () => this.clearFilters());

    // Header actions
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const clearBtn = document.getElementById('clearBtn');

    exportBtn?.addEventListener('click', () => this.exportData());
    importBtn?.addEventListener('click', () => this.importData());
    clearBtn?.addEventListener('click', () => this.clearAllData());

    // Settings
    const saveSettings = document.getElementById('saveSettings');
    const resetSettings = document.getElementById('resetSettings');

    saveSettings?.addEventListener('click', () => this.saveSettings());
    resetSettings?.addEventListener('click', () => this.resetSettings());

    // Modal
    const modalClose = document.querySelector('.modal-close');
    const vehicleModal = document.getElementById('vehicleModal');
    
    modalClose?.addEventListener('click', () => this.closeModal());
    vehicleModal?.addEventListener('click', (e) => {
      if (e.target === vehicleModal) this.closeModal();
    });

    // Import file input
    const importFileInput = document.getElementById('importFileInput') as HTMLInputElement;
    importFileInput?.addEventListener('change', (e) => this.handleFileImport(e));

    this.logger.debug('Event listeners setup complete');
  }

  private showSection(section: string): void {
    this.currentSection = section;
    this.logger.debug(`Showing section: ${this.currentSection}`);
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.add('hidden');
    });

    // Show selected section
    const sectionElement = document.getElementById(`${section}Section`);
    sectionElement?.classList.remove('hidden');

    // Update header
    this.updateSectionHeader(section);

    // Load section-specific data
    switch (section) {
      case 'inventory':
        this.updateInventoryView();
        break;
      case 'analytics':
        this.updateAnalyticsView();
        break;
      case 'settings':
        this.updateSettingsView();
        break;
    }
  }

  private updateSectionHeader(section: string): void {
    const titleElement = document.getElementById('sectionTitle');
    const subtitleElement = document.getElementById('sectionSubtitle');
    
    const headers = {
      inventory: { title: 'Inventory', subtitle: 'Manage your scraped vehicle data' },
      analytics: { title: 'Analytics', subtitle: 'View insights and statistics' },
      settings: { title: 'Settings', subtitle: 'Configure extension preferences' },
      help: { title: 'Help', subtitle: 'Documentation and troubleshooting' }
    };

    const header = headers[section as keyof typeof headers];
    if (titleElement) titleElement.textContent = header.title;
    if (subtitleElement) subtitleElement.textContent = header.subtitle;
  }

  private async loadData(): Promise<void> {
    try {
      this.currentData = await storage.getData();
      this.filteredResults = [...this.currentData.scrapeResults];
      
      this.updateStats();
      this.populateFilters();
      
      this.logger.info(`Loaded ${this.currentData.scrapeResults.length} vehicle records`);
    } catch (error) {
      this.logger.error('Failed to load data:', error);
      this.showError('Failed to load data');
    }
  }

  private updateStats(): void {
    if (!this.currentData) return;

    const results = this.currentData.scrapeResults;
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    // Total vehicles
    const totalElement = document.getElementById('totalVehicles');
    if (totalElement) totalElement.textContent = results.length.toString();

    // Average price
    const prices = results.map(r => r.vehicle.price).filter(p => p && p > 0) as number[];
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const avgElement = document.getElementById('avgPrice');
    if (avgElement) avgElement.textContent = formatPrice(avgPrice);

    // Total value
    const totalValue = prices.reduce((a, b) => a + b, 0);
    const totalValueElement = document.getElementById('totalValue');
    if (totalValueElement) totalValueElement.textContent = formatPrice(totalValue);

    // Recent count (this week)
    const recentCount = results.filter(r => now - r.scrapedAt < oneWeek).length;
    const recentElement = document.getElementById('recentCount');
    if (recentElement) recentElement.textContent = recentCount.toString();
  }

  private populateFilters(): void {
    if (!this.currentData) return;

    const results = this.currentData.scrapeResults;
    
    // Populate make filter
    const makes = new Set(results.map(r => r.vehicle.make).filter(Boolean));
    const makeFilter = document.getElementById('makeFilter') as HTMLSelectElement;
    if (makeFilter) {
      const currentValue = makeFilter.value;
      makeFilter.innerHTML = '<option value="">All Makes</option>';
      
      Array.from(makes).sort().forEach(make => {
        const option = document.createElement('option');
        option.value = make!;
        option.textContent = make!;
        makeFilter.appendChild(option);
      });
      
      makeFilter.value = currentValue;
    }

    // Populate year filter
    const years = new Set(results.map(r => r.vehicle.year).filter(Boolean));
    const yearFilter = document.getElementById('yearFilter') as HTMLSelectElement;
    if (yearFilter) {
      const currentValue = yearFilter.value;
      yearFilter.innerHTML = '<option value="">All Years</option>';
      
      Array.from(years).sort((a, b) => b! - a!).forEach(year => {
        const option = document.createElement('option');
        option.value = year!.toString();
        option.textContent = year!.toString();
        yearFilter.appendChild(option);
      });
      
      yearFilter.value = currentValue;
    }
  }

  private applyFilters(): void {
    if (!this.currentData) return;

    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const makeFilter = document.getElementById('makeFilter') as HTMLSelectElement;
    const yearFilter = document.getElementById('yearFilter') as HTMLSelectElement;
    const priceFilter = document.getElementById('priceFilter') as HTMLSelectElement;

    const searchTerm = searchInput?.value.toLowerCase() || '';
    const selectedMake = makeFilter?.value || '';
    const selectedYear = yearFilter?.value || '';
    const selectedPriceRange = priceFilter?.value || '';

    this.filteredResults = this.currentData.scrapeResults.filter(result => {
      const vehicle = result.vehicle;
      
      // Search filter
      if (searchTerm) {
        const searchableText = [
          vehicle.make,
          vehicle.model,
          vehicle.trim,
          result.dealer.name
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      
      // Make filter
      if (selectedMake && vehicle.make !== selectedMake) {
        return false;
      }
      
      // Year filter
      if (selectedYear && vehicle.year?.toString() !== selectedYear) {
        return false;
      }
      
      // Price filter
      if (selectedPriceRange && vehicle.price) {
        const price = vehicle.price;
        switch (selectedPriceRange) {
          case '0-20000':
            if (price >= 20000) return false;
            break;
          case '20000-40000':
            if (price < 20000 || price >= 40000) return false;
            break;
          case '40000-60000':
            if (price < 40000 || price >= 60000) return false;
            break;
          case '60000+':
            if (price < 60000) return false;
            break;
        }
      }
      
      return true;
    });

    this.updateInventoryView();
  }

  private clearFilters(): void {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const makeFilter = document.getElementById('makeFilter') as HTMLSelectElement;
    const yearFilter = document.getElementById('yearFilter') as HTMLSelectElement;
    const priceFilter = document.getElementById('priceFilter') as HTMLSelectElement;

    if (searchInput) searchInput.value = '';
    if (makeFilter) makeFilter.value = '';
    if (yearFilter) yearFilter.value = '';
    if (priceFilter) priceFilter.value = '';

    this.applyFilters();
  }

  private updateInventoryView(): void {
    const vehicleGrid = document.getElementById('vehicleGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!vehicleGrid || !emptyState) return;

    if (this.filteredResults.length === 0) {
      vehicleGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    vehicleGrid.innerHTML = '';

    this.filteredResults.forEach(result => {
      const card = this.createVehicleCard(result);
      vehicleGrid.appendChild(card);
    });
  }

  private createVehicleCard(result: ScrapeResult): HTMLElement {
    const card = document.createElement('div');
    card.className = 'vehicle-card';
    
    const title = generateFacebookTitle(result.vehicle) || 'Unknown Vehicle';
    const price = result.vehicle.price ? formatPrice(result.vehicle.price) : 'Price N/A';
    const mileage = result.vehicle.mileage ? formatMileage(result.vehicle.mileage) : 'Mileage N/A';
    const date = new Date(result.scrapedAt).toLocaleDateString();
    const hostname = new URL(result.sourceUrl).hostname;
    
    const mainPhoto = result.photos.find(p => p.isMain) || result.photos[0];
    const photoUrl = mainPhoto?.url || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%236b7280">No Photo</text></svg>';

    card.innerHTML = `
      <div class="vehicle-photo">
        <img src="${photoUrl}" alt="${title}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"200\\" height=\\"150\\" viewBox=\\"0 0 200 150\\"><rect width=\\"200\\" height=\\"150\\" fill=\\"%23f3f4f6\\"/><text x=\\"100\\" y=\\"75\\" text-anchor=\\"middle\\" dy=\\".3em\\" fill=\\"%236b7280\\">No Photo</text></svg>'">
        <div class="photo-count">${result.photos.length} 📷</div>
      </div>
      
      <div class="vehicle-info">
        <h3 class="vehicle-title">${title}</h3>
        
        <div class="vehicle-details">
          <div class="detail-row">
            <span class="detail-label">Price:</span>
            <span class="detail-value">${price}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Mileage:</span>
            <span class="detail-value">${mileage}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Source:</span>
            <span class="detail-value">${hostname}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Scraped:</span>
            <span class="detail-value">${date}</span>
          </div>
        </div>
        
        <div class="vehicle-actions">
          <button class="btn btn-sm btn-primary" onclick="optionsManager.openVehicleModal('${result.id}')">
            View Details
          </button>
          <button class="btn btn-sm btn-success" onclick="optionsManager.openInFacebook('${result.id}')">
            Facebook
          </button>
        </div>
      </div>
    `;

    return card;
  }

  private updateAnalyticsView(): void {
    // This would require Chart.js or similar library
    // For now, we'll show placeholder content
    this.logger.info('Analytics view updated (placeholder)');
  }

  private updateSettingsView(): void {
    if (!this.currentData) return;

    const settings = this.currentData.settings;

    // Facebook autofill settings
    const conditionSelect = document.getElementById('defaultCondition') as HTMLSelectElement;
    const uploadPhotosCheck = document.getElementById('uploadPhotos') as HTMLInputElement;
    const maxPhotosInput = document.getElementById('maxPhotos') as HTMLInputElement;

    if (conditionSelect) conditionSelect.value = settings.autofillOptions.condition || 'Used';
    if (uploadPhotosCheck) uploadPhotosCheck.checked = settings.autofillOptions.uploadPhotos !== false;
    if (maxPhotosInput) maxPhotosInput.value = (settings.autofillOptions.maxPhotos || 20).toString();

    // Enabled sites
    const siteCheckboxes = document.querySelectorAll('.site-item input[type="checkbox"]');
    siteCheckboxes.forEach(checkbox => {
      const input = checkbox as HTMLInputElement;
      input.checked = settings.enabledSites.includes(input.value);
    });

    // Storage info
    this.updateStorageInfo();
  }

  private async updateStorageInfo(): Promise<void> {
    try {
      const stats = await storage.getStorageStats();
      const progressElement = document.getElementById('storageProgress');
      const textElement = document.getElementById('storageText');

      if (progressElement) {
        progressElement.style.width = `${stats.percentage}%`;
      }

      if (textElement) {
        const usedKB = Math.round(stats.used / 1024);
        const totalMB = Math.round(stats.total / (1024 * 1024));
        textElement.textContent = `${usedKB} KB of ${totalMB} MB`;
      }
    } catch (error) {
      this.logger.error('Failed to update storage info:', error);
    }
  }

  // Public methods for global access
  public async openVehicleModal(id: string): Promise<void> {
    const result = this.currentData?.scrapeResults.find(r => r.id === id);
    if (!result) return;

    const modal = document.getElementById('vehicleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = modal?.querySelector('.modal-body');

    if (!modal || !modalBody) return;

    // Set title
    if (modalTitle) {
      modalTitle.textContent = generateFacebookTitle(result.vehicle) || 'Vehicle Details';
    }

    // Populate modal body
    modalBody.innerHTML = this.createVehicleDetailsHTML(result);

    // Setup modal buttons
    const facebookBtn = document.getElementById('modalFacebookBtn');
    const downloadBtn = document.getElementById('modalDownloadBtn');
    const deleteBtn = document.getElementById('modalDeleteBtn');

    facebookBtn?.replaceWith(facebookBtn.cloneNode(true));
    downloadBtn?.replaceWith(downloadBtn.cloneNode(true));
    deleteBtn?.replaceWith(deleteBtn.cloneNode(true));

    document.getElementById('modalFacebookBtn')?.addEventListener('click', () => {
      this.openInFacebook(id);
      this.closeModal();
    });

    document.getElementById('modalDownloadBtn')?.addEventListener('click', () => {
      this.downloadPhotos(id);
    });

    document.getElementById('modalDeleteBtn')?.addEventListener('click', () => {
      this.deleteVehicle(id);
      this.closeModal();
    });

    // Show modal
    modal.classList.remove('hidden');
  }

  public async openInFacebook(id: string): Promise<void> {
    const result = this.currentData?.scrapeResults.find(r => r.id === id);
    if (!result) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'OPEN_FACEBOOK_MARKETPLACE',
        scrapeResult: result
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toastManager.show('Facebook Marketplace opened!', 'success');
    } catch (error) {
      this.logger.error('Failed to open Facebook:', error);
      this.showError('Failed to open Facebook: ' + (error as Error).message);
    }
  }

  private createVehicleDetailsHTML(result: ScrapeResult): string {
    const { vehicle, dealer, photos } = result;
    
    return `
      <div class="vehicle-details-modal">
        <div class="details-section">
          <h4>Vehicle Information</h4>
          <div class="details-grid">
            ${vehicle.year ? `<div class="detail-item"><strong>Year:</strong> ${vehicle.year}</div>` : ''}
            ${vehicle.make ? `<div class="detail-item"><strong>Make:</strong> ${vehicle.make}</div>` : ''}
            ${vehicle.model ? `<div class="detail-item"><strong>Model:</strong> ${vehicle.model}</div>` : ''}
            ${vehicle.trim ? `<div class="detail-item"><strong>Trim:</strong> ${vehicle.trim}</div>` : ''}
            ${vehicle.price ? `<div class="detail-item"><strong>Price:</strong> ${formatPrice(vehicle.price)}</div>` : ''}
            ${vehicle.mileage ? `<div class="detail-item"><strong>Mileage:</strong> ${formatMileage(vehicle.mileage)}</div>` : ''}
            ${vehicle.vin ? `<div class="detail-item"><strong>VIN:</strong> ${vehicle.vin}</div>` : ''}
            ${vehicle.exteriorColor ? `<div class="detail-item"><strong>Exterior Color:</strong> ${vehicle.exteriorColor}</div>` : ''}
            ${vehicle.interiorColor ? `<div class="detail-item"><strong>Interior Color:</strong> ${vehicle.interiorColor}</div>` : ''}
            ${vehicle.transmission ? `<div class="detail-item"><strong>Transmission:</strong> ${vehicle.transmission}</div>` : ''}
            ${vehicle.drivetrain ? `<div class="detail-item"><strong>Drivetrain:</strong> ${vehicle.drivetrain}</div>` : ''}
            ${vehicle.engine ? `<div class="detail-item"><strong>Engine:</strong> ${vehicle.engine}</div>` : ''}
            ${vehicle.fuelType ? `<div class="detail-item"><strong>Fuel Type:</strong> ${vehicle.fuelType}</div>` : ''}
          </div>
        </div>

        ${dealer.name ? `
          <div class="details-section">
            <h4>Dealer Information</h4>
            <div class="details-grid">
              ${dealer.name ? `<div class="detail-item"><strong>Name:</strong> ${dealer.name}</div>` : ''}
              ${dealer.phone ? `<div class="detail-item"><strong>Phone:</strong> ${dealer.phone}</div>` : ''}
              ${dealer.city ? `<div class="detail-item"><strong>City:</strong> ${dealer.city}</div>` : ''}
              ${dealer.state ? `<div class="detail-item"><strong>State:</strong> ${dealer.state}</div>` : ''}
              ${dealer.zip ? `<div class="detail-item"><strong>ZIP:</strong> ${dealer.zip}</div>` : ''}
            </div>
          </div>
        ` : ''}

        ${photos.length > 0 ? `
          <div class="details-section">
            <h4>Photos (${photos.length})</h4>
            <div class="photos-grid">
              ${photos.slice(0, 6).map(photo => `
                <img src="${photo.url}" alt="Vehicle photo" class="modal-photo" 
                     onerror="this.style.display='none'">
              `).join('')}
              ${photos.length > 6 ? `<div class="photos-more">+${photos.length - 6} more</div>` : ''}
            </div>
          </div>
        ` : ''}

        ${vehicle.description ? `
          <div class="details-section">
            <h4>Description</h4>
            <p class="description-text">${vehicle.description}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  private closeModal(): void {
    const modal = document.getElementById('vehicleModal');
    modal?.classList.add('hidden');
  }

  private async downloadPhotos(id: string): Promise<void> {
    const result = this.currentData?.scrapeResults.find(r => r.id === id);
    if (!result?.photos.length) return;

    try {
      const photoUrls = result.photos.map(p => p.url);
      
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_PHOTOS',
        photos: photoUrls
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toastManager.show(`Downloaded ${response.count} photos`, 'success');
    } catch (error) {
      this.logger.error('Failed to download photos:', error);
      this.showError('Failed to download photos: ' + (error as Error).message);
    }
  }

  private async deleteVehicle(id: string): Promise<void> {
    try {
      await storage.deleteScrapeResult(id);
      await this.loadData();
      this.updateInventoryView();
      
      toastManager.show('Vehicle deleted', 'success');
    } catch (error) {
      this.logger.error('Failed to delete vehicle:', error);
      this.showError('Failed to delete vehicle');
    }
  }

  private async exportData(): Promise<void> {
    try {
      const jsonData = await storage.exportData();
      
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `vehicle-scraper-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toastManager.show('Data exported successfully', 'success');
    } catch (error) {
      this.logger.error('Failed to export data:', error);
      this.showError('Failed to export data');
    }
  }

  private importData(): void {
    const fileInput = document.getElementById('importFileInput') as HTMLInputElement;
    fileInput?.click();
  }

  private async handleFileImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      const text = await file.text();
      await storage.importData(text);
      await this.loadData();
      this.updateInventoryView();
      
      toastManager.show('Data imported successfully', 'success');
    } catch (error) {
      this.logger.error('Failed to import data:', error);
      this.showError('Failed to import data: ' + (error as Error).message);
    }

    input.value = ''; // Reset file input
  }

  private async clearAllData(): Promise<void> {
    if (!confirm('Are you sure you want to delete all scraped vehicle data? This cannot be undone.')) {
      return;
    }

    try {
      await storage.clearScrapeResults();
      await this.loadData();
      this.updateInventoryView();
      
      toastManager.show('All data cleared', 'success');
    } catch (error) {
      this.logger.error('Failed to clear data:', error);
      this.showError('Failed to clear data');
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const conditionSelect = document.getElementById('defaultCondition') as HTMLSelectElement;
      const uploadPhotosCheck = document.getElementById('uploadPhotos') as HTMLInputElement;
      const maxPhotosInput = document.getElementById('maxPhotos') as HTMLInputElement;

      const siteCheckboxes = document.querySelectorAll('.site-item input[type="checkbox"]');
      const enabledSites: string[] = [];
      
      siteCheckboxes.forEach(checkbox => {
        const input = checkbox as HTMLInputElement;
        if (input.checked) {
          enabledSites.push(input.value);
        }
      });

      const settings = {
        autofillOptions: {
          condition: conditionSelect?.value as 'New' | 'Used' | 'Certified Pre-Owned' || 'Used',
          uploadPhotos: uploadPhotosCheck?.checked !== false,
          maxPhotos: parseInt(maxPhotosInput?.value || '20')
        },
        enabledSites
      };

      await storage.saveSettings(settings);
      
      toastManager.show('Settings saved successfully', 'success');
    } catch (error) {
      this.logger.error('Failed to save settings:', error);
      this.showError('Failed to save settings');
    }
  }

  private async resetSettings(): Promise<void> {
    if (!confirm('Reset all settings to defaults?')) {
      return;
    }

    try {
      const defaultSettings = {
        autofillOptions: {
          condition: 'Used' as const,
          uploadPhotos: true,
          maxPhotos: 20
        },
        enabledSites: ['autotrader.com', 'cars.com', 'cargurus.com', 'dealer.com']
      };

      await storage.saveSettings(defaultSettings);
      this.updateSettingsView();
      
      toastManager.show('Settings reset to defaults', 'success');
    } catch (error) {
      this.logger.error('Failed to reset settings:', error);
      this.showError('Failed to reset settings');
    }
  }

  private showError(message: string): void {
    toastManager.show(message, 'error');
  }
}

// Make manager globally available for HTML onclick handlers
declare global {
  interface Window {
    optionsManager: OptionsManager;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.optionsManager = new OptionsManager();
  });
} else {
  window.optionsManager = new OptionsManager();
}
