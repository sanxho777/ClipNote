import { SiteAdapter, ScrapeResult } from '../types';
export declare class DealerDotComAdapter implements SiteAdapter {
    name: string;
    hostnames: string[];
    private logger;
    private probe;
    isVehiclePage(url: string): boolean;
    scrape(): Promise<ScrapeResult>;
    private extractTitleInfo;
    private extractPriceAndMileage;
    private extractSpecs;
    private extractSpecValue;
    private extractDealerInfo;
    private extractVIN;
    private extractDescription;
    private extractPhotos;
}
//# sourceMappingURL=dealer_dot_com.d.ts.map