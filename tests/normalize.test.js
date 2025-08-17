/**
 * Test suite for data normalization functions
 * Tests the cleaning and standardization of scraped vehicle data
 */

describe('Data Normalization', () => {
  let normalizeVehicleData, 
      formatPrice, 
      formatMileage, 
      generateFacebookTitle, 
      generateFacebookDescription;

  beforeAll(() => {
    const normalizeModule = require('../src/core/normalize');
    normalizeVehicleData = normalizeModule.normalizeVehicleData;
    formatPrice = normalizeModule.formatPrice;
    formatMileage = normalizeModule.formatMileage;
    generateFacebookTitle = normalizeModule.generateFacebookTitle;
    generateFacebookDescription = normalizeModule.generateFacebookDescription;
  });

  describe('normalizeVehicleData', () => {
    test('should normalize make, model, and trim to title case', () => {
      const input = {
        make: 'HONDA',
        model: 'civic',
        trim: 'sport TOURING'
      };

      const result = normalizeVehicleData(input);

      expect(result.make).toBe('Honda');
      expect(result.model).toBe('Civic');
      expect(result.trim).toBe('Sport Touring');
    });

    test('should normalize price from string to number', () => {
      const input = {
        price: '$25,999'
      };

      const result = normalizeVehicleData(input);

      expect(result.price).toBe(25999);
      expect(typeof result.price).toBe('number');
    });

    test('should normalize mileage from string to number', () => {
      const input = {
        mileage: '15,234 miles'
      };

      const result = normalizeVehicleData(input);

      expect(result.mileage).toBe(15234);
      expect(typeof result.mileage).toBe('number');
    });

    test('should normalize year from string to number', () => {
      const input = {
        year: '2023'
      };

      const result = normalizeVehicleData(input);

      expect(result.year).toBe(2023);
      expect(typeof result.year).toBe('number');
    });

    test('should normalize transmission values', () => {
      const testCases = [
        { input: 'automatic transmission', expected: 'Automatic' },
        { input: 'MANUAL', expected: 'Manual' },
        { input: 'CVT Automatic', expected: 'CVT' },
        { input: '6-Speed Manual', expected: 'Manual' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeVehicleData({ transmission: input });
        expect(result.transmission).toBe(expected);
      });
    });

    test('should normalize drivetrain values', () => {
      const testCases = [
        { input: 'front wheel drive', expected: 'FWD' },
        { input: 'REAR-WHEEL DRIVE', expected: 'RWD' },
        { input: 'All Wheel Drive', expected: 'AWD' },
        { input: '4WD', expected: '4WD' },
        { input: '4x4', expected: '4WD' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeVehicleData({ drivetrain: input });
        expect(result.drivetrain).toBe(expected);
      });
    });

    test('should normalize fuel type values', () => {
      const testCases = [
        { input: 'gasoline', expected: 'Gasoline' },
        { input: 'DIESEL', expected: 'Diesel' },
        { input: 'Electric Vehicle', expected: 'Electric' },
        { input: 'Hybrid Electric', expected: 'Hybrid' },
        { input: 'Plug-in Hybrid', expected: 'Plug-in Hybrid' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeVehicleData({ fuelType: input });
        expect(result.fuelType).toBe(expected);
      });
    });

    test('should normalize body style values', () => {
      const testCases = [
        { input: 'sport utility', expected: 'SUV' },
        { input: 'Sports Utility Vehicle', expected: 'SUV' },
        { input: 'pickup truck', expected: 'Truck' },
        { input: 'SEDAN', expected: 'Sedan' },
        { input: 'station wagon', expected: 'Wagon' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeVehicleData({ bodyStyle: input });
        expect(result.bodyStyle).toBe(expected);
      });
    });

    test('should clean and validate VIN', () => {
      const testCases = [
        { input: '1HGBH41JXMN109186', expected: '1HGBH41JXMN109186' },
        { input: '1hgbh41jxmn109186', expected: '1HGBH41JXMN109186' },
        { input: '1HG-BH4-1JX-MN109186', expected: '1HGBH41JXMN109186' },
        { input: 'invalid-vin', expected: undefined }, // Too short
        { input: '1HGBH41JXMN109186ABC', expected: undefined } // Too long
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeVehicleData({ vin: input });
        expect(result.vin).toBe(expected);
      });
    });

    test('should normalize colors to title case', () => {
      const input = {
        exteriorColor: 'midnight BLACK',
        interiorColor: 'beige LEATHER'
      };

      const result = normalizeVehicleData(input);

      expect(result.exteriorColor).toBe('Midnight Black');
      expect(result.interiorColor).toBe('Beige Leather');
    });

    test('should clean description text', () => {
      const input = {
        description: '  Great vehicle!   Call 555-123-4567 for more info.   Extended warranty available.  '
      };

      const result = normalizeVehicleData(input);

      expect(result.description).toBe('Great vehicle!');
      expect(result.description).not.toContain('Call 555-123-4567');
      expect(result.description).not.toContain('Extended warranty');
    });

    test('should set default condition if not specified', () => {
      const input = {
        make: 'Honda'
      };

      const result = normalizeVehicleData(input);

      expect(result.condition).toBe('Used');
    });

    test('should handle engine descriptions', () => {
      const input = {
        engine: '2.0L 4-cyl turbo'
      };

      const result = normalizeVehicleData(input);

      expect(result.engine).toBe('2.0 Liter 4-Cylinder Turbo');
    });

    test('should handle invalid numeric values', () => {
      const input = {
        price: 'not-a-number',
        mileage: 'unknown',
        year: 'invalid'
      };

      const result = normalizeVehicleData(input);

      expect(result.price).toBeUndefined();
      expect(result.mileage).toBeUndefined();
      expect(result.year).toBeUndefined();
    });
  });

  describe('formatPrice', () => {
    test('should format prices as currency', () => {
      expect(formatPrice(25999)).toBe('$25,999');
      expect(formatPrice(1234567)).toBe('$1,234,567');
      expect(formatPrice(999)).toBe('$999');
    });

    test('should handle zero and negative values', () => {
      expect(formatPrice(0)).toBe('$0');
      expect(formatPrice(-1000)).toBe('-$1,000');
    });

    test('should not show decimal places', () => {
      expect(formatPrice(25999.99)).toBe('$26,000');
      expect(formatPrice(25000.50)).toBe('$25,001');
    });
  });

  describe('formatMileage', () => {
    test('should format mileage with commas and unit', () => {
      expect(formatMileage(15234)).toBe('15,234 miles');
      expect(formatMileage(1234567)).toBe('1,234,567 miles');
      expect(formatMileage(999)).toBe('999 miles');
    });

    test('should handle zero mileage', () => {
      expect(formatMileage(0)).toBe('0 miles');
    });

    test('should handle single mile', () => {
      expect(formatMileage(1)).toBe('1 miles'); // Still uses plural for consistency
    });
  });

  describe('generateFacebookTitle', () => {
    test('should generate complete title from all fields', () => {
      const vehicle = {
        year: 2023,
        make: 'Honda',
        model: 'Civic',
        trim: 'Sport Touring'
      };

      const title = generateFacebookTitle(vehicle);

      expect(title).toBe('2023 Honda Civic Sport Touring');
    });

    test('should handle missing trim', () => {
      const vehicle = {
        year: 2022,
        make: 'Toyota',
        model: 'Camry'
      };

      const title = generateFacebookTitle(vehicle);

      expect(title).toBe('2022 Toyota Camry');
    });

    test('should handle missing fields gracefully', () => {
      const vehicle = {
        make: 'Ford',
        model: 'F-150'
      };

      const title = generateFacebookTitle(vehicle);

      expect(title).toBe('Ford F-150');
    });

    test('should return empty string for completely empty vehicle', () => {
      const vehicle = {};

      const title = generateFacebookTitle(vehicle);

      expect(title).toBe('');
    });
  });

  describe('generateFacebookDescription', () => {
    test('should generate formatted description with all details', () => {
      const vehicle = {
        year: 2023,
        make: 'Honda',
        model: 'Civic',
        trim: 'Sport',
        mileage: 15234,
        exteriorColor: 'Sonic Gray Pearl',
        interiorColor: 'Black',
        transmission: 'Manual',
        drivetrain: 'FWD',
        engine: '2.0L I4',
        fuelType: 'Gasoline',
        vin: '19XFC2F5XPE123456',
        description: 'Excellent condition vehicle with sport styling.'
      };

      const dealer = {
        name: 'Honda of Downtown',
        phone: '(555) 123-4567'
      };

      const stockNumber = 'H23001';

      const description = generateFacebookDescription(vehicle, dealer, stockNumber);

      expect(description).toContain('VEHICLE DETAILS:');
      expect(description).toContain('• Year: 2023');
      expect(description).toContain('• Make: Honda');
      expect(description).toContain('• Mileage: 15,234 miles');
      expect(description).toContain('• VIN: 19XFC2F5XPE123456');
      expect(description).toContain('• Stock #: H23001');
      expect(description).toContain('DESCRIPTION:');
      expect(description).toContain('Excellent condition vehicle with sport styling.');
      expect(description).toContain('Offered by: Honda of Downtown');
      expect(description).toContain('Contact: (555) 123-4567');
    });

    test('should handle minimal vehicle data', () => {
      const vehicle = {
        make: 'Toyota',
        model: 'Camry'
      };

      const dealer = {};

      const description = generateFacebookDescription(vehicle, dealer);

      expect(description).toContain('VEHICLE DETAILS:');
      expect(description).toContain('• Make: Toyota');
      expect(description).toContain('• Model: Camry');
      expect(description).not.toContain('Offered by:');
    });

    test('should handle missing description', () => {
      const vehicle = {
        year: 2022,
        make: 'Ford',
        model: 'F-150'
      };

      const dealer = {
        name: 'Ford Dealer'
      };

      const description = generateFacebookDescription(vehicle, dealer);

      expect(description).toContain('VEHICLE DETAILS:');
      expect(description).not.toContain('DESCRIPTION:');
      expect(description).toContain('Offered by: Ford Dealer');
    });

    test('should format bullet points correctly', () => {
      const vehicle = {
        year: 2021,
        make: 'BMW',
        model: 'X3'
      };

      const description = generateFacebookDescription(vehicle, {});

      const lines = description.split('\n');
      const bulletLines = lines.filter(line => line.startsWith('• '));

      expect(bulletLines.length).toBe(3); // Year, Make, Model
      expect(bulletLines[0]).toBe('• Year: 2021');
      expect(bulletLines[1]).toBe('• Make: BMW');
      expect(bulletLines[2]).toBe('• Model: X3');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined inputs', () => {
      const result = normalizeVehicleData({
        make: null,
        model: undefined,
        price: null,
        mileage: undefined
      });

      expect(result.make).toBeNull();
      expect(result.model).toBeUndefined();
      expect(result.price).toBeNull();
      expect(result.mileage).toBeUndefined();
    });

    test('should handle empty strings', () => {
      const result = normalizeVehicleData({
        make: '',
        model: '   ',
        transmission: '',
        drivetrain: '   '
      });

      expect(result.make).toBe('');
      expect(result.model).toBe('');
      expect(result.transmission).toBe('');
      expect(result.drivetrain).toBe('');
    });

    test('should handle extremely large numbers', () => {
      const result = normalizeVehicleData({
        price: 999999999,
        mileage: 9999999,
        year: 3000
      });

      expect(result.price).toBe(999999999);
      expect(result.mileage).toBe(9999999);
      expect(result.year).toBe(3000);
    });

    test('should handle special characters in strings', () => {
      const result = normalizeVehicleData({
        make: 'BMW®',
        model: 'X3™',
        trim: 'xDrive30i®',
        description: 'Great car! <script>alert("xss")</script>'
      });

      expect(result.make).toBe('Bmw®');
      expect(result.model).toBe('X3™');
      expect(result.trim).toBe('Xdrive30i®');
      // Description should be cleaned but XSS is outside scope of normalize function
      expect(result.description).toContain('Great car!');
    });

    test('formatPrice should handle edge cases', () => {
      expect(formatPrice(0.99)).toBe('$1');
      expect(formatPrice(Number.MAX_SAFE_INTEGER)).toBeDefined();
      expect(formatPrice(1/3)).toBe('$0'); // Rounds down
    });

    test('formatMileage should handle edge cases', () => {
      expect(formatMileage(0.5)).toBe('1 miles'); // Rounds up
      expect(formatMileage(Number.MAX_SAFE_INTEGER)).toBeDefined();
    });
  });

  describe('Integration with Real Data Patterns', () => {
    test('should handle AutoTrader-style data', () => {
      const input = {
        make: 'HONDA',
        model: 'CIVIC',
        trim: 'SPORT TOURING',
        price: '$26,999',
        mileage: '8,500 miles',
        transmission: 'Manual 6-Speed',
        drivetrain: 'Front Wheel Drive',
        fuelType: 'Regular Unleaded',
        exteriorColor: 'SONIC GRAY PEARL',
        vin: '19xfc2f5xpe123456'
      };

      const result = normalizeVehicleData(input);

      expect(result.make).toBe('Honda');
      expect(result.model).toBe('Civic');
      expect(result.trim).toBe('Sport Touring');
      expect(result.price).toBe(26999);
      expect(result.mileage).toBe(8500);
      expect(result.transmission).toBe('Manual');
      expect(result.drivetrain).toBe('FWD');
      expect(result.fuelType).toBe('Gasoline');
      expect(result.exteriorColor).toBe('Sonic Gray Pearl');
      expect(result.vin).toBe('19XFC2F5XPE123456');
    });

    test('should handle Cars.com-style data', () => {
      const input = {
        make: 'Toyota',
        model: 'Camry',
        trim: 'LE',
        price: 28500,
        mileage: 22100,
        transmission: 'Automatic CVT',
        drivetrain: 'Front-wheel Drive',
        bodyStyle: 'sedan',
        fuelType: 'gas'
      };

      const result = normalizeVehicleData(input);

      expect(result.transmission).toBe('CVT');
      expect(result.drivetrain).toBe('FWD');
      expect(result.bodyStyle).toBe('Sedan');
      expect(result.fuelType).toBe('Gasoline');
    });

    test('should handle dealer inventory data', () => {
      const input = {
        year: '2020',
        make: 'CHEVROLET',
        model: 'SILVERADO 1500',
        trim: 'LT CREW CAB',
        price: '$32,995.00',
        mileage: '45,678',
        transmission: 'Automatic 8-Speed',
        drivetrain: '4WD',
        bodyStyle: 'pickup truck',
        description: 'Call us today! Extended warranties available. Trade-ins welcome!'
      };

      const result = normalizeVehicleData(input);

      expect(result.year).toBe(2020);
      expect(result.make).toBe('Chevrolet');
      expect(result.model).toBe('Silverado');
      expect(result.trim).toBe('1500 Lt Crew Cab');
      expect(result.price).toBe(32995);
      expect(result.mileage).toBe(45678);
      expect(result.transmission).toBe('Automatic');
      expect(result.drivetrain).toBe('4WD');
      expect(result.bodyStyle).toBe('Truck');
      expect(result.description).not.toContain('Call us today!');
      expect(result.description).not.toContain('Extended warranties');
    });
  });
});
