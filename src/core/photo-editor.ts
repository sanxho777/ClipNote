import { Logger } from './logger';

export interface PhotoEditOptions {
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  rotation?: number; // 0, 90, 180, 270
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filter?: 'none' | 'vintage' | 'blackwhite' | 'sepia' | 'vibrant' | 'cool' | 'warm';
  resize?: {
    width: number;
    height: number;
    quality?: number; // 0.1 to 1.0
  };
}

export interface EditedPhoto {
  originalUrl: string;
  editedDataUrl: string;
  fileName: string;
  editOptions: PhotoEditOptions;
  timestamp: number;
}

export class PhotoEditor {
  private logger = new Logger('PhotoEditor');
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Apply edits to a photo and return the edited image data
   */
  async editPhoto(imageUrl: string, options: PhotoEditOptions): Promise<EditedPhoto> {
    this.logger.info('Starting photo edit process', { imageUrl, options });

    try {
      // Load the image
      const img = await this.loadImage(imageUrl);
      
      // Apply rotation first (affects canvas dimensions)
      const rotatedDimensions = this.calculateRotatedDimensions(img.width, img.height, options.rotation || 0);
      
      // Set canvas size
      this.canvas.width = rotatedDimensions.width;
      this.canvas.height = rotatedDimensions.height;
      
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Apply transformations
      this.ctx.save();
      
      // Apply rotation
      if (options.rotation) {
        this.applyRotation(options.rotation, img.width, img.height);
      }
      
      // Draw the image
      this.ctx.drawImage(img, 0, 0);
      
      this.ctx.restore();
      
      // Apply crop if specified
      if (options.crop) {
        this.applyCrop(options.crop);
      }
      
      // Apply filters and adjustments
      await this.applyImageAdjustments(options);
      
      // Apply preset filters
      if (options.filter && options.filter !== 'none') {
        this.applyFilter(options.filter);
      }
      
      // Resize if specified
      if (options.resize) {
        await this.applyResize(options.resize);
      }
      
      // Get the final image data
      const quality = options.resize?.quality || 0.9;
      const editedDataUrl = this.canvas.toDataURL('image/jpeg', quality);
      
      const editedPhoto: EditedPhoto = {
        originalUrl: imageUrl,
        editedDataUrl,
        fileName: this.generateFileName(imageUrl, options),
        editOptions: options,
        timestamp: Date.now()
      };
      
      this.logger.info('Photo edit completed successfully');
      return editedPhoto;
      
    } catch (error) {
      this.logger.error('Failed to edit photo:', error);
      throw new Error(`Photo editing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply automatic enhancement to improve photo quality
   */
  async autoEnhance(imageUrl: string): Promise<EditedPhoto> {
    this.logger.info('Applying automatic enhancement');
    
    // Analyze the image to determine optimal adjustments
    const img = await this.loadImage(imageUrl);
    const analysis = await this.analyzeImage(img);
    
    const enhancementOptions: PhotoEditOptions = {
      brightness: analysis.suggestedBrightness,
      contrast: analysis.suggestedContrast,
      saturation: analysis.suggestedSaturation,
      filter: analysis.suggestedFilter
    };
    
    return this.editPhoto(imageUrl, enhancementOptions);
  }

  /**
   * Create multiple variations of a photo for A/B testing
   */
  async createVariations(imageUrl: string): Promise<EditedPhoto[]> {
    this.logger.info('Creating photo variations');
    
    const variations: PhotoEditOptions[] = [
      { brightness: 10, contrast: 15, saturation: 5 }, // Bright & vibrant
      { filter: 'vibrant', contrast: 10 }, // Enhanced colors
      { filter: 'warm', brightness: 5 }, // Warm tone
      { filter: 'cool', contrast: 20 }, // Cool & sharp
      { brightness: -5, contrast: 25, saturation: -10 } // High contrast
    ];
    
    const editedPhotos = await Promise.all(
      variations.map(options => this.editPhoto(imageUrl, options))
    );
    
    return editedPhotos;
  }

  /**
   * Load an image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.src = url;
    });
  }

  /**
   * Calculate dimensions after rotation
   */
  private calculateRotatedDimensions(width: number, height: number, rotation: number) {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    
    return {
      width: Math.ceil(width * cos + height * sin),
      height: Math.ceil(width * sin + height * cos)
    };
  }

  /**
   * Apply rotation transformation
   */
  private applyRotation(rotation: number, originalWidth: number, originalHeight: number) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate((rotation * Math.PI) / 180);
    this.ctx.translate(-originalWidth / 2, -originalHeight / 2);
  }

  /**
   * Apply crop to the current canvas
   */
  private applyCrop(crop: { x: number; y: number; width: number; height: number }) {
    const imageData = this.ctx.getImageData(crop.x, crop.y, crop.width, crop.height);
    this.canvas.width = crop.width;
    this.canvas.height = crop.height;
    this.ctx.clearRect(0, 0, crop.width, crop.height);
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply brightness, contrast, and saturation adjustments
   */
  private async applyImageAdjustments(options: PhotoEditOptions) {
    if (!options.brightness && !options.contrast && !options.saturation) return;
    
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    const brightness = (options.brightness || 0) * 2.55; // Convert to 0-255 range
    const contrast = ((options.contrast || 0) + 100) / 100; // Convert to multiplier
    const saturation = ((options.saturation || 0) + 100) / 100; // Convert to multiplier
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] += brightness;     // Red
      data[i + 1] += brightness; // Green
      data[i + 2] += brightness; // Blue
      
      // Apply contrast
      data[i] = ((data[i] - 128) * contrast) + 128;
      data[i + 1] = ((data[i + 1] - 128) * contrast) + 128;
      data[i + 2] = ((data[i + 2] - 128) * contrast) + 128;
      
      // Apply saturation
      if (saturation !== 1) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray + (data[i] - gray) * saturation;
        data[i + 1] = gray + (data[i + 1] - gray) * saturation;
        data[i + 2] = gray + (data[i + 2] - gray) * saturation;
      }
      
      // Clamp values to 0-255 range
      data[i] = Math.max(0, Math.min(255, data[i]));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply preset filters
   */
  private applyFilter(filter: string) {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    switch (filter) {
      case 'blackwhite':
        this.applyGrayscaleFilter(data);
        break;
      case 'sepia':
        this.applySepiaFilter(data);
        break;
      case 'vintage':
        this.applyVintageFilter(data);
        break;
      case 'vibrant':
        this.applyVibrantFilter(data);
        break;
      case 'cool':
        this.applyCoolFilter(data);
        break;
      case 'warm':
        this.applyWarmFilter(data);
        break;
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyGrayscaleFilter(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  }

  private applySepiaFilter(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
      data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
      data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
    }
  }

  private applyVintageFilter(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.1); // Enhance red
      data[i + 1] = Math.min(255, data[i + 1] * 0.9); // Reduce green
      data[i + 2] = Math.min(255, data[i + 2] * 0.8); // Reduce blue
    }
  }

  private applyVibrantFilter(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      const factor = max > 128 ? 1.2 : 1.1;
      data[i] = Math.min(255, data[i] * factor);
      data[i + 1] = Math.min(255, data[i + 1] * factor);
      data[i + 2] = Math.min(255, data[i + 2] * factor);
    }
  }

  private applyCoolFilter(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 0.9); // Reduce red
      data[i + 1] = Math.min(255, data[i + 1] * 1.0); // Keep green
      data[i + 2] = Math.min(255, data[i + 2] * 1.1); // Enhance blue
    }
  }

  private applyWarmFilter(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.1); // Enhance red
      data[i + 1] = Math.min(255, data[i + 1] * 1.05); // Slightly enhance green
      data[i + 2] = Math.min(255, data[i + 2] * 0.9); // Reduce blue
    }
  }

  /**
   * Resize the image
   */
  private async applyResize(resize: { width: number; height: number }) {
    const currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Create a temporary canvas for resizing
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    tempCtx.putImageData(currentImageData, 0, 0);
    
    // Resize main canvas
    this.canvas.width = resize.width;
    this.canvas.height = resize.height;
    
    // Draw resized image
    this.ctx.drawImage(tempCanvas, 0, 0, resize.width, resize.height);
  }

  /**
   * Analyze image to suggest automatic enhancements
   */
  private async analyzeImage(img: HTMLImageElement) {
    // Create temporary canvas for analysis
    const analysisCanvas = document.createElement('canvas');
    const analysisCtx = analysisCanvas.getContext('2d')!;
    
    // Use smaller size for faster analysis
    const analysisSize = 100;
    analysisCanvas.width = analysisSize;
    analysisCanvas.height = analysisSize;
    
    analysisCtx.drawImage(img, 0, 0, analysisSize, analysisSize);
    const imageData = analysisCtx.getImageData(0, 0, analysisSize, analysisSize);
    const data = imageData.data;
    
    let totalBrightness = 0;
    let totalSaturation = 0;
    let redTotal = 0, blueTotal = 0;
    const pixelCount = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      
      // Calculate brightness
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      
      // Calculate saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      totalSaturation += saturation;
      
      redTotal += r;
      blueTotal += b;
    }
    
    const avgBrightness = totalBrightness / pixelCount;
    const avgSaturation = totalSaturation / pixelCount;
    const avgRed = redTotal / pixelCount;
    const avgBlue = blueTotal / pixelCount;
    
    // Determine suggested adjustments
    let suggestedBrightness = 0;
    let suggestedContrast = 0;
    let suggestedSaturation = 0;
    let suggestedFilter: PhotoEditOptions['filter'] = 'none';
    
    // Brightness adjustment
    if (avgBrightness < 80) {
      suggestedBrightness = 15; // Brighten dark images
    } else if (avgBrightness > 200) {
      suggestedBrightness = -10; // Darken overly bright images
    }
    
    // Contrast adjustment
    if (avgBrightness > 100 && avgBrightness < 180) {
      suggestedContrast = 15; // Add contrast to mid-tone images
    }
    
    // Saturation adjustment
    if (avgSaturation < 0.3) {
      suggestedSaturation = 20; // Boost saturation for dull images
    }
    
    // Filter suggestion based on color temperature
    const isWarm = avgRed > avgBlue + 10;
    const isCool = avgBlue > avgRed + 10;
    
    if (isWarm && avgSaturation > 0.4) {
      suggestedFilter = 'vibrant';
    } else if (isCool) {
      suggestedFilter = 'warm';
    } else if (avgSaturation < 0.2) {
      suggestedFilter = 'vibrant';
    }
    
    return {
      suggestedBrightness,
      suggestedContrast,
      suggestedSaturation,
      suggestedFilter,
      avgBrightness,
      avgSaturation
    };
  }

  /**
   * Generate a filename for the edited photo
   */
  private generateFileName(_originalUrl: string, options: PhotoEditOptions): string {
    const timestamp = Date.now();
    const editSuffix = Object.keys(options).join('-');
    return `edited-${timestamp}-${editSuffix}.jpg`;
  }

  /**
   * Batch process multiple photos with the same options
   */
  async batchEdit(imageUrls: string[], options: PhotoEditOptions): Promise<EditedPhoto[]> {
    this.logger.info(`Starting batch edit for ${imageUrls.length} photos`);
    
    const editedPhotos = await Promise.all(
      imageUrls.map(url => this.editPhoto(url, options))
    );
    
    this.logger.info(`Batch edit completed for ${editedPhotos.length} photos`);
    return editedPhotos;
  }
}