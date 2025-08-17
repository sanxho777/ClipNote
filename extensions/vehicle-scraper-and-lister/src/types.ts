export interface Dealer {
  name?: string;
  phone?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface Photo {
  url: string;
  filename?: string;
}

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

  dealer?: Dealer;
  description?: string;
  photos?: Photo[];
  sourceUrl?: string;
  source?: string; // site/domain
}

export interface ScrapeResult {
  vehicle: Vehicle;
  warnings: string[];
  raw?: unknown;
}
