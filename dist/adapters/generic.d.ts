import { SiteAdapter, ScrapeResult } from '../types';
export declare class GenericAdapter implements SiteAdapter {
    name: string;
    hostnames: string[];
    private logger;
    private probe;
    isVehiclePage(url: string): boolean;
    scrape(): Promise<ScrapeResult>;
    private extractFromMicrodata;
    private extractFromOpenGraph;
    private extractFromStructuredData;
    private extractFromHeuristics;
    private looksLikeVehicleTitle;
    private parseVehicleName;
    private extractSpecsByProximity;
    private extractPhotos;
}
//# sourceMappingURL=generic.d.ts.map