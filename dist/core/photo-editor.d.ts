export interface PhotoEditOptions {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    rotation?: number;
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
        quality?: number;
    };
}
export interface EditedPhoto {
    originalUrl: string;
    editedDataUrl: string;
    fileName: string;
    editOptions: PhotoEditOptions;
    timestamp: number;
}
export declare class PhotoEditor {
    private logger;
    private canvas;
    private ctx;
    constructor();
    /**
     * Apply edits to a photo and return the edited image data
     */
    editPhoto(imageUrl: string, options: PhotoEditOptions): Promise<EditedPhoto>;
    /**
     * Apply automatic enhancement to improve photo quality
     */
    autoEnhance(imageUrl: string): Promise<EditedPhoto>;
    /**
     * Create multiple variations of a photo for A/B testing
     */
    createVariations(imageUrl: string): Promise<EditedPhoto[]>;
    /**
     * Load an image from URL
     */
    private loadImage;
    /**
     * Calculate dimensions after rotation
     */
    private calculateRotatedDimensions;
    /**
     * Apply rotation transformation
     */
    private applyRotation;
    /**
     * Apply crop to the current canvas
     */
    private applyCrop;
    /**
     * Apply brightness, contrast, and saturation adjustments
     */
    private applyImageAdjustments;
    /**
     * Apply preset filters
     */
    private applyFilter;
    private applyGrayscaleFilter;
    private applySepiaFilter;
    private applyVintageFilter;
    private applyVibrantFilter;
    private applyCoolFilter;
    private applyWarmFilter;
    /**
     * Resize the image
     */
    private applyResize;
    /**
     * Analyze image to suggest automatic enhancements
     */
    private analyzeImage;
    /**
     * Generate a filename for the edited photo
     */
    private generateFileName;
    /**
     * Batch process multiple photos with the same options
     */
    batchEdit(imageUrls: string[], options: PhotoEditOptions): Promise<EditedPhoto[]>;
}
//# sourceMappingURL=photo-editor.d.ts.map