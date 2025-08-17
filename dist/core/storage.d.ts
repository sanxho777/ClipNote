import { StorageData, ScrapeResult } from '../types';
export declare class StorageManager {
    private logger;
    /**
     * Get all stored data
     */
    getData(): Promise<StorageData>;
    /**
     * Save scrape result
     */
    saveScrapeResult(result: ScrapeResult): Promise<void>;
    /**
     * Get all scrape results
     */
    getScrapeResults(): Promise<ScrapeResult[]>;
    /**
     * Delete a scrape result
     */
    deleteScrapeResult(id: string): Promise<void>;
    /**
     * Clear all scrape results
     */
    clearScrapeResults(): Promise<void>;
    /**
     * Save settings
     */
    saveSettings(settings: StorageData['settings']): Promise<void>;
    /**
     * Get settings
     */
    getSettings(): Promise<StorageData['settings']>;
    /**
     * Export data as JSON
     */
    exportData(): Promise<string>;
    /**
     * Import data from JSON
     */
    importData(jsonData: string): Promise<void>;
    /**
     * Get storage usage statistics
     */
    getStorageStats(): Promise<{
        used: number;
        total: number;
        percentage: number;
    }>;
}
export declare const storage: StorageManager;
//# sourceMappingURL=storage.d.ts.map