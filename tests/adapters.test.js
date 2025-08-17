/**
 * Test suite for site adapters
 * Tests the scraping functionality for each supported automotive site
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');

// Mock Chrome extension APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    getURL: jest.fn(path => `chrome-extension://test/${path}`)
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.Element = dom.window.Element;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
global.HTMLImageElement = dom.window.HTMLImageElement;
global.Text = dom.window.Text;
global.Node = dom.window.Node;
global.NodeFilter = dom.window.NodeFilter;

// Mock fetch for photo testing
global.fetch = jest.fn();

describe('Site Adapters', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock window.location
    delete window.location;
    window.location = {
      href: 'https://example.com/vehicle/123',
      hostname: 'example.com',
      origin: 'https://example.com',
      pathname: '/vehicle/123'
    };
  });

  describe('AutoTrader Adapter', () => {
    let adapter;

    beforeEach(() => {
      const { AutoTraderAdapter } = require('../src/adapters/autotrader');
      adapter = new AutoTraderAdapter();
      window.location.hostname = 'www.autotrader.com';
    });

    test('should identify AutoTrader vehicle pages correctly', () => {
      expect(adapter.isVehiclePage('https://autotrader.com/cars-for-sale/vehicledetails.xhtml?listingId=123')).toBe(true);
      expect(adapter.isVehiclePage('https://autotrader.com/vehicle/123')).toBe(true);
      expect(adapter.isVehiclePage('https://autotrader.com/search')).toBe(false);
    });

    test('should extract vehicle title information', async () => {
      // Mock AutoTrader vehicle page
      document.body.innerHTML = `
        <div class="vehicle-title">
          <h1>2023 Honda Civic LX</h1>
        </div>
        <div data-cmp="firstPrice">$25,999</div>
        <div data-cmp="mileage">15,234 miles</div>
      `;

      const result = await adapter.scrape();

      expect(result.vehicle.year).toBe(2023);
      expect(result.vehicle.make).toBe('Honda');
      expect(result.vehicle.model).toBe('Civic');
      expect(result.vehicle.trim).toBe('LX');
      expect(result.vehicle.price).toBe(25999);
      expect(result.vehicle.mileage).toBe(15234);
    });

    test('should extract VIN using regex fallback', async () => {
      document.body.innerHTML = `
        <div class="vehicle-title">
          <h1>2023 Honda Civic LX</h1>
        </div>
        <p>Vehicle Identification Number: 1HGBH41JXMN109186</p>
      `;

      const result = await adapter.scrape();

      expect(result.vehicle.vin).toBe('1HGBH41JXMN109186');
    });

    test('should handle missing data gracefully', async () => {
      document.body.innerHTML = `
        <div>No vehicle data here</div>
      `;

      const result = await adapter.scrape();

      expect(result.warnings).toContain('Vehicle title not found');
      expect(result.warnings).toContain('Price not found');
      expect(result.warnings).toContain('VIN not found');
    });
  });

  describe('Cars.com Adapter', () => {
    let adapter;

    beforeEach(() => {
      const { CarsDotComAdapter } = require('../src/adapters/cars_dot_com');
      adapter = new CarsDotComAdapter();
      window.location.hostname = 'www.cars.com';
    });

    test('should identify Cars.com vehicle pages correctly', () => {
      expect(adapter.isVehiclePage('https://cars.com/vehicledetail/detail/123')).toBe(true);
      expect(adapter.isVehiclePage('https://cars.com/listing/456')).toBe(true);
      expect(adapter.isVehiclePage('https://cars.com/search')).toBe(false);
    });

    test('should extract vehicle data from structured elements', async () => {
      document.body.innerHTML = `
        <h1 data-testid="structured-data-title">2022 Toyota Camry LE</h1>
        <div data-testid="price">$28,500</div>
        <div data-testid="mileage">22,100 miles</div>
        <div data-vin="JT2BF28K4X0123456"></div>
      `;

      const result = await adapter.scrape();

      expect(result.vehicle.year).toBe(2022);
      expect(result.vehicle.make).toBe('Toyota');
      expect(result.vehicle.model).toBe('Camry');
      expect(result.vehicle.trim).toBe('LE');
      expect(result.vehicle.price).toBe(28500);
      expect(result.vehicle.mileage).toBe(22100);
      expect(result.vehicle.vin).toBe('JT2BF28K4X0123456');
    });

    test('should extract specifications from dt/dd pairs', async () => {
      document.body.innerHTML = `
        <h1 data-testid="structured-data-title">2022 Toyota Camry LE</h1>
        <div data-testid="specifications">
          <dl>
            <dt>Transmission</dt>
            <dd>Automatic CVT</dd>
            <dt>Drivetrain</dt>
            <dd>Front-wheel Drive</dd>
            <dt>Exterior Color</dt>
            <dd>Midnight Black</dd>
          </dl>
        </div>
      `;

      const result = await adapter.scrape();

      expect(result.vehicle.transmission).toBe('Automatic CVT');
      expect(result.vehicle.drivetrain).toBe('Front-wheel Drive');
      expect(result.vehicle.exteriorColor).toBe('Midnight Black');
    });
  });

  describe('CarGurus Adapter', () => {
    let adapter;

    beforeEach(() => {
      const { CarGurusAdapter } = require('../src/adapters/cargurus');
      adapter = new CarGurusAdapter();
      window.location.hostname = 'www.cargurus.com';
    });

    test('should identify CarGurus vehicle pages correctly', () => {
      expect(adapter.isVehiclePage('https://cargurus.com/cars/l-Used-Honda-Civic-123')).toBe(true);
      expect(adapter.isVehiclePage('https://cargurus.com/vehicle/456')).toBe(true);
      expect(adapter.isVehiclePage('https://cargurus.com/cars/research')).toBe(false);
    });

    test('should extract vehicle data from CarGurus elements', async () => {
      document.body.innerHTML = `
        <div class="cg-listingDetail-model">2021 Ford F-150 XLT</div>
        <div class="cg-listingDetail-price">$35,999</div>
        <div class="cg-listingDetail-mileage">18,500 miles</div>
        <div class="cg-listingDetail-vin">1FTFW1ET5MFA12345</div>
      `;

      const result = await adapter.scrape();

      expect(result.vehicle.year).toBe(2021);
      expect(result.vehicle.make).toBe('Ford');
      expect(result.vehicle.model).toBe('F-150');
      expect(result.vehicle.trim).toBe('XLT');
      expect(result.vehicle.price).toBe(35999);
      expect(result.vehicle.mileage).toBe(18500);
      expect(result.vehicle.vin).toBe('1FTFW1ET5MFA12345');
    });
  });

  describe('Dealer.com Adapter', () => {
    let adapter;

    beforeEach(() => {
      const { DealerDotComAdapter } = require('../src/adapters/dealer_dot_com');
      adapter = new DealerDotComAdapter();
      window.location.hostname = 'dealer.com';
    });

    test('should identify Dealer.com vehicle pages correctly', () => {
      expect(adapter.isVehiclePage('https://dealer.com/inventory/vehicle-123')).toBe(true);
      expect(adapter.isVehiclePage('https://dealer.com/vdp/456')).toBe(true);
      expect(adapter.isVehiclePage('https://dealer.com/about')).toBe(false);
    });

    test('should extract data from dealer inventory pages', async () => {
      document.body.innerHTML = `
        <div class="vdp-header">
          <h1>2020 Chevrolet Silverado 1500 LT</h1>
        </div>
        <div class="vehicle-price">
          <span class="price">$32,995</span>
        </div>
        <div class="vehicle-mileage">45,678 miles</div>
        <div class="vehicle-specs">
          <div class="spec-item">Transmission: Automatic</div>
          <div class="spec-item">Drivetrain: 4WD</div>
        </div>
      `;

      const result = await adapter.scrape();

      expect(result.vehicle.year).toBe(2020);
      expect(result.vehicle.make).toBe('Chevrolet');
      expect(result.vehicle.model).toBe('Silverado');
      expect(result.vehicle.trim).toBe('1500 LT');
      expect(result.vehicle.price).toBe(32995);
      expect(result.vehicle.mileage).toBe(45678);
    });
  });

  describe('Generic Adapter', () => {
    let adapter;

    beforeEach(() => {
      const { GenericAdapter } = require('../src/adapters/generic');
      adapter = new GenericAdapter();
      window.location.hostname = 'unknown-dealer.com';
    });

    test('should identify vehicle pages using heuristics', () => {
      expect(adapter.isVehiclePage('https://unknown-dealer.com/vehicle/123')).toBe(true);
      expect(adapter.isVehiclePage('https://unknown-dealer.com/car-details/456')).toBe(true);
      expect(adapter.isVehiclePage('https://unknown-dealer.com/inventory/789')).toBe(true);
      expect(adapter.isVehiclePage('https://unknown-dealer.com/about-us')).toBe(false);
    });

    test('should extract data from microdata', async () => {
      document.body.innerHTML = `
        <div itemtype="http://schema.org/Vehicle">
          <span itemprop="name">2019 BMW X3 xDrive30i</span>
          <span itemprop="brand">BMW</span>
          <span itemprop="model">X3</span>
          <span itemprop="productionDate">2019</span>
          <span itemprop="price">$29,999</span>
          <span itemprop="mileageFromOdometer">35,000</span>
          <span itemprop="vehicleIdentificationNumber">WBXHT3C30K5A12345</span>
        </div>
      `;

      const result = await adapter.scrape();

      expect(result.vehicle.year).toBe(2019);
      expect(result.vehicle.make).toBe('BMW');
      expect(result.vehicle.model).toBe('X3');
      expect(result.vehicle.price).toBe(29999);
      expect(result.vehicle.mileage).toBe(35000);
      expect(result.vehicle.vin).toBe('WBXHT3C30K5A12345');
    });

    test('should extract data from Open Graph tags', async () => {
      document.head.innerHTML = `
        <meta property="og:title" content="2023 Tesla Model 3 Standard Range Plus">
        <meta property="og:description" content="Electric vehicle with autopilot">
      `;

      const result = await adapter.scrape();

      expect(result.vehicle.year).toBe(2023);
      expect(result.vehicle.make).toBe('Tesla');
      expect(result.vehicle.model).toBe('Model');
      expect(result.vehicle.description).toBe('Electric vehicle with autopilot');
    });

    test('should extract data from JSON-LD structured data', async () => {
      document.head.innerHTML = `
        <script type="application/ld+json">
        {
          "@type": "Vehicle",
          "name": "2022 Audi A4 Premium Plus",
          "brand": "Audi",
          "model": "A4",
          "productionDate": "2022",
          "offers": {
            "price": "31500"
          },
          "mileageFromOdometer": 12000,
          "vehicleIdentificationNumber": "WAUENAF4XNA123456"
        }
        </script>
      `;

      const result = await adapter.scrape();

      expect(result.vehicle.make).toBe('Audi');
      expect(result.vehicle.model).toBe('A4');
      expect(result.vehicle.year).toBe(2022);
      expect(result.vehicle.price).toBe(31500);
      expect(result.vehicle.mileage).toBe(12000);
      expect(result.vehicle.vin).toBe('WAUENAF4XNA123456');
    });

    test('should use regex patterns for fallback extraction', async () => {
      document.body.innerHTML = `
        <div>
          <p>This beautiful 2021 Mercedes-Benz C-Class C300 is priced at $28,750 and has only 25,123 miles.</p>
          <p>VIN: 55SWF8DB7MU123456</p>
          <p>Contact ABC Motors at (555) 123-4567</p>
        </div>
      `;

      const result = await adapter.scrape();

      expect(result.vehicle.mileage).toBe(25123);
      expect(result.vehicle.vin).toBe('55SWF8DB7MU123456');
      expect(result.dealer.phone).toBe('(555) 123-4567');
    });
  });

  describe('Photo Extraction', () => {
    beforeEach(() => {
      // Mock successful fetch response for image conversion
      global.fetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['fake-image-data'], { type: 'image/jpeg' })),
        headers: {
          get: (header) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          }
        }
      });
    });

    test('should extract images from gallery selectors', async () => {
      document.body.innerHTML = `
        <div class="vehicle-gallery">
          <img src="https://example.com/photo1.jpg" width="800" height="600">
          <img src="https://example.com/photo2.jpg" width="800" height="600">
        </div>
      `;

      const { extractPhotos } = require('../src/core/photos');
      const photos = await extractPhotos(['.vehicle-gallery img']);

      expect(photos).toHaveLength(2);
      expect(photos[0].url).toBe('https://example.com/photo1.jpg');
      expect(photos[0].width).toBe(800);
      expect(photos[0].height).toBe(600);
    });

    test('should handle srcset attributes', async () => {
      document.body.innerHTML = `
        <img src="https://example.com/small.jpg" 
             srcset="https://example.com/large.jpg 1200w, https://example.com/medium.jpg 800w">
      `;

      const { extractPhotos } = require('../src/core/photos');
      const photos = await extractPhotos(['img']);

      expect(photos).toHaveLength(3); // Original src + 2 from srcset
      expect(photos[0].url).toBe('https://example.com/large.jpg'); // Largest first
    });

    test('should deduplicate identical URLs', async () => {
      document.body.innerHTML = `
        <img src="https://example.com/photo1.jpg">
        <img src="https://example.com/photo1.jpg">
        <img data-src="https://example.com/photo1.jpg">
      `;

      const { extractPhotos } = require('../src/core/photos');
      const photos = await extractPhotos(['img']);

      expect(photos).toHaveLength(1);
      expect(photos[0].url).toBe('https://example.com/photo1.jpg');
    });

    test('should convert relative URLs to absolute', async () => {
      window.location.origin = 'https://dealer.com';
      
      document.body.innerHTML = `
        <img src="/images/photo1.jpg">
        <img src="./photo2.jpg">
      `;

      const { extractPhotos } = require('../src/core/photos');
      const photos = await extractPhotos(['img']);

      expect(photos[0].url).toBe('https://dealer.com/images/photo1.jpg');
      expect(photos[1].url).toBe('https://dealer.com/photo2.jpg');
    });
  });

  describe('Error Handling', () => {
    test('should handle DOM parsing errors gracefully', async () => {
      const { AutoTraderAdapter } = require('../src/adapters/autotrader');
      const adapter = new AutoTraderAdapter();

      // Simulate malformed HTML
      document.body.innerHTML = `<div><span>Incomplete`;

      const result = await adapter.scrape();

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.vehicle).toBeDefined();
      expect(result.photos).toBeDefined();
    });

    test('should handle missing elements without crashing', async () => {
      const { CarsDotComAdapter } = require('../src/adapters/cars_dot_com');
      const adapter = new CarsDotComAdapter();

      // Empty page
      document.body.innerHTML = '';

      const result = await adapter.scrape();

      expect(result).toBeDefined();
      expect(result.warnings).toContain('Vehicle title not found');
    });

    test('should handle network errors in photo extraction', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      document.body.innerHTML = `
        <img src="https://example.com/photo1.jpg">
      `;

      const { extractPhotos } = require('../src/core/photos');
      const photos = await extractPhotos(['img']);

      // Should still return photo metadata even if fetch fails
      expect(photos).toHaveLength(1);
      expect(photos[0].url).toBe('https://example.com/photo1.jpg');
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complete scraping workflow', async () => {
    // Mock a complete AutoTrader page
    window.location.hostname = 'www.autotrader.com';
    window.location.href = 'https://autotrader.com/cars-for-sale/vehicledetails.xhtml?listingId=123';
    
    document.body.innerHTML = `
      <div class="vehicle-title">
        <h1>2023 Honda Civic Sport</h1>
      </div>
      <div data-cmp="firstPrice">$24,999</div>
      <div data-cmp="mileage">8,500 miles</div>
      <div class="vehicle-specs">
        <li>Transmission: Manual</li>
        <li>Drivetrain: FWD</li>
        <li>Exterior Color: Sonic Gray Pearl</li>
      </div>
      <div class="dealer-name">Honda of Downtown</div>
      <div class="dealer-contact">
        <p>Contact us at (555) 123-4567</p>
        <p>123 Main St, Anytown, CA 90210</p>
      </div>
      <div class="vehicle-gallery">
        <img src="https://example.com/photo1.jpg" class="hero-image">
        <img src="https://example.com/photo2.jpg">
      </div>
      <div class="vehicle-description">
        <p>This excellent condition Honda Civic features sport styling and manual transmission.</p>
      </div>
      <p>VIN: 19XFC2F5XPE123456</p>
    `;

    const { ScrapingEngine } = require('../src/core/scrape');
    const engine = new ScrapingEngine();
    
    const result = await engine.scrapeCurrentPage();

    // Verify complete data extraction
    expect(result.vehicle.year).toBe(2023);
    expect(result.vehicle.make).toBe('Honda');
    expect(result.vehicle.model).toBe('Civic');
    expect(result.vehicle.trim).toBe('Sport');
    expect(result.vehicle.price).toBe(24999);
    expect(result.vehicle.mileage).toBe(8500);
    expect(result.vehicle.transmission).toBe('Manual');
    expect(result.vehicle.drivetrain).toBe('FWD');
    expect(result.vehicle.exteriorColor).toBe('Sonic Gray Pearl');
    expect(result.vehicle.vin).toBe('19XFC2F5XPE123456');
    expect(result.vehicle.condition).toBe('Used'); // Default

    expect(result.dealer.name).toBe('Honda of Downtown');
    expect(result.dealer.phone).toBe('(555) 123-4567');
    expect(result.dealer.city).toBe('Anytown');
    expect(result.dealer.state).toBe('CA');
    expect(result.dealer.zip).toBe('90210');

    expect(result.photos).toHaveLength(2);
    expect(result.photos[0].isMain).toBe(true); // Hero image should be marked as main

    expect(result.warnings).toEqual([]);
    expect(result.sourceUrl).toBe(window.location.href);
    expect(result.id).toMatch(/^autotrader_/);
  });
});
