import { Vehicle, RawVehicleData } from '../types';

/**
 * Normalize and clean up scraped vehicle data
 */
export function normalizeVehicleData(vehicle: RawVehicleData): Vehicle {
  const normalized: any = { ...vehicle };
  
  // Normalize make
  if (normalized.make) {
    normalized.make = titleCase(normalized.make.trim());
  }
  
  // Normalize model
  if (normalized.model) {
    normalized.model = titleCase(normalized.model.trim());
  }
  
  // Normalize trim
  if (normalized.trim) {
    normalized.trim = titleCase(normalized.trim.trim());
  }
  
  // Normalize body style
  if (normalized.bodyStyle) {
    normalized.bodyStyle = titleCase(normalized.bodyStyle.trim());
    // Common body style mappings
    const bodyStyleMap: Record<string, string> = {
      'sport utility': 'SUV',
      'sports utility vehicle': 'SUV',
      'pickup truck': 'Truck',
      'pick-up': 'Truck',
      'station wagon': 'Wagon',
      'convertible': 'Convertible',
      'coupe': 'Coupe',
      'sedan': 'Sedan',
      'hatchback': 'Hatchback',
      'minivan': 'Minivan',
      'van': 'Van'
    };
    
    const normalized_lower = normalized.bodyStyle.toLowerCase();
    for (const [key, value] of Object.entries(bodyStyleMap)) {
      if (normalized_lower.includes(key)) {
        normalized.bodyStyle = value;
        break;
      }
    }
  }
  
  // Normalize price - remove commas, ensure it's a number
  if (normalized.price) {
    if (typeof normalized.price === 'string') {
      const priceStr = normalized.price.replace(/[$,\s]/g, '');
      const priceNum = parseInt(priceStr);
      normalized.price = isNaN(priceNum) ? undefined : priceNum;
    }
  }
  
  // Normalize mileage - remove commas, ensure it's a number
  if (normalized.mileage) {
    if (typeof normalized.mileage === 'string') {
      const mileageStr = normalized.mileage.replace(/[,\s]/g, '');
      const mileageNum = parseInt(mileageStr);
      normalized.mileage = isNaN(mileageNum) ? undefined : mileageNum;
    }
  }
  
  // Normalize year
  if (normalized.year) {
    if (typeof normalized.year === 'string') {
      const yearNum = parseInt(normalized.year);
      normalized.year = isNaN(yearNum) ? undefined : yearNum;
    }
  }
  
  // Normalize colors
  if (normalized.exteriorColor) {
    normalized.exteriorColor = titleCase(normalized.exteriorColor.trim());
  }
  
  if (normalized.interiorColor) {
    normalized.interiorColor = titleCase(normalized.interiorColor.trim());
  }
  
  // Normalize transmission
  if (normalized.transmission) {
    normalized.transmission = normalizeTransmission(normalized.transmission);
  }
  
  // Normalize drivetrain
  if (normalized.drivetrain) {
    normalized.drivetrain = normalizeDrivetrain(normalized.drivetrain);
  }
  
  // Normalize fuel type
  if (normalized.fuelType) {
    normalized.fuelType = normalizeFuelType(normalized.fuelType);
  }
  
  // Normalize engine
  if (normalized.engine) {
    normalized.engine = normalizeEngine(normalized.engine);
  }
  
  // Clean up VIN
  if (normalized.vin) {
    normalized.vin = normalized.vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    if (normalized.vin.length !== 17) {
      normalized.vin = undefined; // Invalid VIN
    }
  }
  
  // Clean up description
  if (normalized.description) {
    normalized.description = cleanDescription(normalized.description);
  }
  
  // Set default condition if not specified
  if (!normalized.condition) {
    normalized.condition = 'Used';
  }
  
  return normalized;
}

/**
 * Convert text to title case
 */
function titleCase(text: string): string {
  return text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Normalize transmission values
 */
function normalizeTransmission(transmission: string): string {
  const cleaned = transmission.toLowerCase().trim();
  
  if (cleaned.includes('automatic') || cleaned.includes('auto')) {
    return 'Automatic';
  } else if (cleaned.includes('manual') || cleaned.includes('stick')) {
    return 'Manual';
  } else if (cleaned.includes('cvt')) {
    return 'CVT';
  } else {
    return titleCase(transmission);
  }
}

/**
 * Normalize drivetrain values
 */
function normalizeDrivetrain(drivetrain: string): string {
  const cleaned = drivetrain.toLowerCase().trim();
  
  if (cleaned.includes('front') || cleaned.includes('fwd')) {
    return 'FWD';
  } else if (cleaned.includes('rear') || cleaned.includes('rwd')) {
    return 'RWD';
  } else if (cleaned.includes('all') || cleaned.includes('awd')) {
    return 'AWD';
  } else if (cleaned.includes('4wd') || cleaned.includes('4x4')) {
    return '4WD';
  } else {
    return titleCase(drivetrain);
  }
}

/**
 * Normalize fuel type values
 */
function normalizeFuelType(fuelType: string): string {
  const cleaned = fuelType.toLowerCase().trim();
  
  if (cleaned.includes('gasoline') || cleaned.includes('gas') || cleaned.includes('petrol')) {
    return 'Gasoline';
  } else if (cleaned.includes('diesel')) {
    return 'Diesel';
  } else if (cleaned.includes('electric') || cleaned.includes('ev')) {
    return 'Electric';
  } else if (cleaned.includes('hybrid')) {
    return 'Hybrid';
  } else if (cleaned.includes('plug')) {
    return 'Plug-in Hybrid';
  } else {
    return titleCase(fuelType);
  }
}

/**
 * Normalize engine descriptions
 */
function normalizeEngine(engine: string): string {
  // Remove extra whitespace and normalize common terms
  let normalized = engine.trim().replace(/\s+/g, ' ');
  
  // Common replacements
  normalized = normalized.replace(/\bL\b/g, 'Liter');
  normalized = normalized.replace(/\bcyl\b/gi, 'Cylinder');
  normalized = normalized.replace(/\bturbo\b/gi, 'Turbo');
  normalized = normalized.replace(/\bsupercharged\b/gi, 'Supercharged');
  
  return normalized;
}

/**
 * Clean up description text
 */
function cleanDescription(description: string): string {
  // Remove extra whitespace
  let cleaned = description.trim().replace(/\s+/g, ' ');
  
  // Remove common dealer boilerplate
  const boilerplatePatterns = [
    /call \d{3}[-.\s]?\d{3}[-.\s]?\d{4}/gi,
    /visit us at .+/gi,
    /financing available/gi,
    /trade-ins welcome/gi,
    /extended warranty/gi
  ];
  
  boilerplatePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Clean up punctuation
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Ensure it ends with proper punctuation
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned += '.';
  }
  
  return cleaned;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

/**
 * Format mileage for display
 */
export function formatMileage(mileage: number): string {
  return new Intl.NumberFormat('en-US').format(mileage) + ' miles';
}

/**
 * Generate a title for Facebook Marketplace
 */
export function generateFacebookTitle(vehicle: Vehicle): string {
  const parts: string[] = [];
  
  if (vehicle.year) parts.push(vehicle.year.toString());
  if (vehicle.make) parts.push(vehicle.make);
  if (vehicle.model) parts.push(vehicle.model);
  if (vehicle.trim) parts.push(vehicle.trim);
  
  return parts.join(' ');
}

/**
 * Generate a formatted description for Facebook Marketplace
 */
export function generateFacebookDescription(vehicle: Vehicle, dealer: any, stockNumber?: string): string {
  const lines: string[] = [];
  
  // Vehicle details
  const details: string[] = [];
  if (vehicle.year) details.push(`Year: ${vehicle.year}`);
  if (vehicle.make) details.push(`Make: ${vehicle.make}`);
  if (vehicle.model) details.push(`Model: ${vehicle.model}`);
  if (vehicle.trim) details.push(`Trim: ${vehicle.trim}`);
  if (vehicle.mileage) details.push(`Mileage: ${formatMileage(vehicle.mileage)}`);
  if (vehicle.exteriorColor) details.push(`Exterior: ${vehicle.exteriorColor}`);
  if (vehicle.interiorColor) details.push(`Interior: ${vehicle.interiorColor}`);
  if (vehicle.transmission) details.push(`Transmission: ${vehicle.transmission}`);
  if (vehicle.drivetrain) details.push(`Drivetrain: ${vehicle.drivetrain}`);
  if (vehicle.engine) details.push(`Engine: ${vehicle.engine}`);
  if (vehicle.fuelType) details.push(`Fuel: ${vehicle.fuelType}`);
  if (vehicle.vin) details.push(`VIN: ${vehicle.vin}`);
  if (stockNumber) details.push(`Stock #: ${stockNumber}`);
  
  if (details.length > 0) {
    lines.push('VEHICLE DETAILS:');
    details.forEach(detail => lines.push(`• ${detail}`));
    lines.push('');
  }
  
  // Original description
  if (vehicle.description) {
    lines.push('DESCRIPTION:');
    lines.push(vehicle.description);
    lines.push('');
  }
  
  // Dealer info
  if (dealer.name) {
    lines.push(`Offered by: ${dealer.name}`);
    if (dealer.phone) {
      lines.push(`Contact: ${dealer.phone}`);
    }
  }
  
  return lines.join('\n');
}
