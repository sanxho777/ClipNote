declare class OptionsManager {
    private logger;
    private currentData;
    private filteredResults;
    private currentSection;
    constructor();
    private init;
    private setupNavigation;
    private setupEventListeners;
    private showSection;
    private updateSectionHeader;
    private loadData;
    private updateStats;
    private populateFilters;
    private applyFilters;
    private clearFilters;
    private updateInventoryView;
    private createVehicleCard;
    private updateAnalyticsView;
    private updateSettingsView;
    private updateStorageInfo;
    openVehicleModal(id: string): Promise<void>;
    openInFacebook(id: string): Promise<void>;
    private createVehicleDetailsHTML;
    private closeModal;
    private openPhotoEditor;
    private downloadPhotos;
    private deleteVehicle;
    private exportData;
    private importData;
    private handleFileImport;
    private clearAllData;
    private saveSettings;
    private resetSettings;
    private showError;
}
declare global {
    interface Window {
        optionsManager: OptionsManager;
    }
}
export {};
//# sourceMappingURL=options.d.ts.map