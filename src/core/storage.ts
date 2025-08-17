import { StorageData, ScrapeResult } from '../types';
import { Logger } from './logger';

export class StorageManager {
  private logger = new Logger('Storage');

  /**
   * Get all stored data
   */
  async getData(): Promise<StorageData> {
    try {
      const result = await chrome.storage.local.get(null);
      
      const defaultData: StorageData = {
        scrapeResults: [],
        settings: {
          autofillOptions: {
            condition: 'Used',
            uploadPhotos: true,
            maxPhotos: 20
          },
          enabledSites: ['autotrader.com', 'cars.com', 'cargurus.com', 'dealer.com']
        }
      };

      return {
        scrapeResults: result.scrapeResults || defaultData.scrapeResults,
        settings: {
          ...defaultData.settings,
          ...result.settings
        }
      };
    } catch (error) {
      this.logger.error('Failed to get data from storage:', error);
      throw error;
    }
  }

  /**
   * Save scrape result
   */
  async saveScrapeResult(result: ScrapeResult): Promise<void> {
    try {
      const data = await this.getData();
      
      // Add to beginning of array and limit to 50
      data.scrapeResults.unshift(result);
      if (data.scrapeResults.length > 50) {
        data.scrapeResults = data.scrapeResults.slice(0, 50);
      }

      await chrome.storage.local.set({ scrapeResults: data.scrapeResults });
      this.logger.info('Saved scrape result:', result.id);
    } catch (error) {
      this.logger.error('Failed to save scrape result:', error);
      throw error;
    }
  }

  /**
   * Get all scrape results
   */
  async getScrapeResults(): Promise<ScrapeResult[]> {
    try {
      const data = await this.getData();
      return data.scrapeResults;
    } catch (error) {
      this.logger.error('Failed to get scrape results:', error);
      return [];
    }
  }

  /**
   * Delete a scrape result
   */
  async deleteScrapeResult(id: string): Promise<void> {
    try {
      const data = await this.getData();
      data.scrapeResults = data.scrapeResults.filter(result => result.id !== id);
      
      await chrome.storage.local.set({ scrapeResults: data.scrapeResults });
      this.logger.info('Deleted scrape result:', id);
    } catch (error) {
      this.logger.error('Failed to delete scrape result:', error);
      throw error;
    }
  }

  /**
   * Clear all scrape results
   */
  async clearScrapeResults(): Promise<void> {
    try {
      await chrome.storage.local.set({ scrapeResults: [] });
      this.logger.info('Cleared all scrape results');
    } catch (error) {
      this.logger.error('Failed to clear scrape results:', error);
      throw error;
    }
  }

  /**
   * Save settings
   */
  async saveSettings(settings: StorageData['settings']): Promise<void> {
    try {
      await chrome.storage.local.set({ settings });
      this.logger.info('Saved settings');
    } catch (error) {
      this.logger.error('Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Get settings
   */
  async getSettings(): Promise<StorageData['settings']> {
    try {
      const data = await this.getData();
      return data.settings;
    } catch (error) {
      this.logger.error('Failed to get settings:', error);
      return {
        autofillOptions: {
          condition: 'Used',
          uploadPhotos: true,
          maxPhotos: 20
        },
        enabledSites: ['autotrader.com', 'cars.com', 'cargurus.com', 'dealer.com']
      };
    }
  }

  /**
   * Export data as JSON
   */
  async exportData(): Promise<string> {
    try {
      const data = await this.getData();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      this.logger.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Import data from JSON
   */
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData) as StorageData;
      
      // Validate structure
      if (!data.scrapeResults || !Array.isArray(data.scrapeResults)) {
        throw new Error('Invalid data format: scrapeResults must be an array');
      }
      
      if (!data.settings) {
        throw new Error('Invalid data format: settings is required');
      }

      await chrome.storage.local.set(data);
      this.logger.info('Imported data successfully');
    } catch (error) {
      this.logger.error('Failed to import data:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;
      
      return {
        used: usage,
        total: quota,
        percentage: Math.round((usage / quota) * 100)
      };
    } catch (error) {
      this.logger.error('Failed to get storage stats:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }
}

// Export singleton instance
export const storage = new StorageManager();
