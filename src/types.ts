export interface Vehicle {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  price?: number;
  mileage?: number;
  exteriorColor?: string;
  interiorColor?: string;
  transmission?: string;
  drivetrain?: string;
  engine?: string;
  fuelType?: string;
  vin?: string;
  stockNumber?: string;
  description?: string;
  condition?: 'New' | 'Used' | 'Certified Pre-Owned';
}

// Raw scraped data that needs normalization
export interface RawVehicleData {
  year?: number | string;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  price?: number | string;
  mileage?: number | string;
  exteriorColor?: string;
  interiorColor?: string;
  transmission?: string;
  drivetrain?: string;
  engine?: string;
  fuelType?: string;
  vin?: string;
  stockNumber?: string;
  description?: string;
  condition?: 'New' | 'Used' | 'Certified Pre-Owned';
}

export interface Dealer {
  name?: string;
  phone?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface Photo {
  url: string;
  width?: number;
  height?: number;
  isMain?: boolean;
}

export interface ScrapeResult {
  vehicle: Vehicle;
  dealer: Dealer;
  photos: Photo[];
  sourceUrl: string;
  scrapedAt: number;
  warnings: string[];
  id: string;
}

export interface SiteAdapter {
  name: string;
  hostnames: string[];
  isVehiclePage: (url: string) => boolean;
  scrape: () => Promise<ScrapeResult>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface FacebookAutofillOptions {
  condition?: 'New' | 'Used' | 'Certified Pre-Owned';
  uploadPhotos?: boolean;
  maxPhotos?: number;
}

export interface StorageData {
  scrapeResults: ScrapeResult[];
  settings: {
    autofillOptions: FacebookAutofillOptions;
    enabledSites: string[];
  };
}
