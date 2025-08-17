import { ScrapeResult } from '../types';
export declare class ScrapingEngine {
    private logger;
    private adapters;
    private genericAdapter;
    constructor();
    /**
     * Scrape the current page using the appropriate adapter
     */
    scrapeCurrentPage(): Promise<ScrapeResult>;
    /**
     * Check if the current page is a vehicle detail page
     */
    isVehiclePage(url: string): boolean;
    /**
     * Get list of supported sites
     */
    getSupportedSites(): string[];
    /**
     * Find the appropriate adapter for a given hostname and URL
     */
    private findAdapter;
    /**
     * Check if hostname matches any of the adapter hostnames
     */
    private matchesHostname;
    /**
     * Validate scrape result and add warnings for missing data
     */
    private validateScrapeResult;
}
//# sourceMappingURL=scrape.d.ts.map