import { ScrapeResult, FacebookAutofillOptions } from '../types';
export declare class FacebookAutofiller {
    private logger;
    /**
     * Auto-fill Facebook Marketplace vehicle listing form
     */
    autofillForm(scrapeResult: ScrapeResult, options?: FacebookAutofillOptions): Promise<void>;
    /**
     * Wait for Facebook Marketplace form to be ready
     */
    private waitForPageReady;
    /**
     * Fill vehicle details in the form
     */
    private fillVehicleDetails;
    /**
     * Fill location information
     */
    private fillLocationInfo;
    /**
     * Fill description field
     */
    private fillDescription;
    /**
     * Upload photos to Facebook Marketplace
     */
    private uploadPhotos;
    /**
     * Show instructions for manual photo upload
     */
    private showPhotoUploadInstructions;
    /**
     * Fill an input field using multiple selectors
     */
    private fillInput;
    /**
     * Fill a textarea field using multiple selectors
     */
    private fillTextarea;
    /**
     * Fill a select field using multiple selectors
     */
    private fillSelect;
    /**
     * Wait for an element to appear using multiple selectors
     */
    private waitForSelector;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
}
//# sourceMappingURL=facebook.d.ts.map