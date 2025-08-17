import { PhotoEditor, PhotoEditOptions, EditedPhoto } from '../core/photo-editor';
import { Logger } from '../core/logger';

interface PhotoState {
  originalUrl: string;
  currentImageData: string;
  editHistory: PhotoEditOptions[];
  currentEdit: PhotoEditOptions;
}

class PhotoEditorUI {
  private logger = new Logger('PhotoEditorUI');
  private photoEditor = new PhotoEditor();
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentPhoto: PhotoState | null = null;
  private photos: PhotoState[] = [];
  private currentPhotoIndex = 0;
  private zoomLevel = 1;
  private cropMode = false;
  private cropSelection: { x: number; y: number; width: number; height: number } | null = null;

  constructor() {
    this.canvas = document.getElementById('editCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.init();
  }

  private async init() {
    this.logger.info('Initializing Photo Editor UI');
    
    try {
      this.setupEventListeners();
      this.loadPhotosFromStorage();
      this.updateUI();
      
      this.logger.info('Photo Editor UI initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize photo editor:', error);
    }
  }

  private setupEventListeners() {
    // Header buttons
    document.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
    document.getElementById('autoEnhanceBtn')?.addEventListener('click', () => this.autoEnhance());
    document.getElementById('saveBtn')?.addEventListener('click', () => this.saveCurrentPhoto());

    // Basic adjustment sliders
    this.setupSlider('brightnessSlider', 'brightnessValue', 'brightness');
    this.setupSlider('contrastSlider', 'contrastValue', 'contrast');
    this.setupSlider('saturationSlider', 'saturationValue', 'saturation');

    // Transform buttons
    document.getElementById('rotate90Btn')?.addEventListener('click', () => this.rotate(90));
    document.getElementById('rotate180Btn')?.addEventListener('click', () => this.rotate(180));
    document.getElementById('rotate270Btn')?.addEventListener('click', () => this.rotate(270));
    document.getElementById('cropBtn')?.addEventListener('click', () => this.toggleCropMode());

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter') as PhotoEditOptions['filter'];
        this.applyFilter(filter);
        this.updateFilterUI(btn);
      });
    });

    // Resize controls
    this.setupResizeControls();

    // Batch actions
    document.getElementById('createVariationsBtn')?.addEventListener('click', () => this.createVariations());
    document.getElementById('batchApplyBtn')?.addEventListener('click', () => this.batchApplyCurrentSettings());

    // Reset button
    document.getElementById('resetBtn')?.addEventListener('click', () => this.resetAllEdits());

    // Canvas controls
    document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoomIn());
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoomOut());
    document.getElementById('fitToScreenBtn')?.addEventListener('click', () => this.fitToScreen());

    // Photo management
    document.getElementById('addPhotosBtn')?.addEventListener('click', () => this.addPhotos());
    document.getElementById('photoFileInput')?.addEventListener('change', (e) => this.handleFileSelection(e));

    // Canvas interaction for cropping
    this.setupCanvasInteraction();
  }

  private setupSlider(sliderId: string, valueId: string, property: keyof PhotoEditOptions) {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId);
    
    slider?.addEventListener('input', () => {
      const value = parseInt(slider.value);
      if (valueDisplay) valueDisplay.textContent = value.toString();
      
      if (this.currentPhoto) {
        this.currentPhoto.currentEdit[property] = value as any;
        this.applyCurrentEdits();
      }
    });
  }

  private setupResizeControls() {
    const widthInput = document.getElementById('widthInput') as HTMLInputElement;
    const heightInput = document.getElementById('heightInput') as HTMLInputElement;
    const aspectRatioCheckbox = document.getElementById('maintainAspectRatio') as HTMLInputElement;
    const qualitySlider = document.getElementById('qualitySlider') as HTMLInputElement;
    const qualityValue = document.getElementById('qualityValue');

    let aspectRatio = 1;

    const updateAspectRatio = () => {
      if (this.currentPhoto && widthInput.value && heightInput.value) {
        aspectRatio = parseInt(widthInput.value) / parseInt(heightInput.value);
      }
    };

    widthInput?.addEventListener('input', () => {
      if (aspectRatioCheckbox.checked && heightInput.value) {
        const newHeight = Math.round(parseInt(widthInput.value) / aspectRatio);
        heightInput.value = newHeight.toString();
      }
      this.updateResize();
    });

    heightInput?.addEventListener('input', () => {
      if (aspectRatioCheckbox.checked && widthInput.value) {
        const newWidth = Math.round(parseInt(heightInput.value) * aspectRatio);
        widthInput.value = newWidth.toString();
      }
      this.updateResize();
    });

    aspectRatioCheckbox?.addEventListener('change', () => {
      if (aspectRatioCheckbox.checked) {
        updateAspectRatio();
      }
    });

    qualitySlider?.addEventListener('input', () => {
      const value = parseInt(qualitySlider.value);
      if (qualityValue) qualityValue.textContent = `${value}%`;
      this.updateResize();
    });

    // Initialize aspect ratio when photo is loaded
    updateAspectRatio();
  }

  private updateResize() {
    if (!this.currentPhoto) return;

    const widthInput = document.getElementById('widthInput') as HTMLInputElement;
    const heightInput = document.getElementById('heightInput') as HTMLInputElement;
    const qualitySlider = document.getElementById('qualitySlider') as HTMLInputElement;

    if (widthInput.value && heightInput.value) {
      this.currentPhoto.currentEdit.resize = {
        width: parseInt(widthInput.value),
        height: parseInt(heightInput.value),
        quality: parseInt(qualitySlider.value) / 100
      };
      this.applyCurrentEdits();
    }
  }

  private setupCanvasInteraction() {
    let isDragging = false;
    let startX = 0, startY = 0;

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.cropMode) return;

      isDragging = true;
      const rect = this.canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;

      this.cropSelection = { x: startX, y: startY, width: 0, height: 0 };
      this.updateCropOverlay();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.cropMode || !this.cropSelection) return;

      const rect = this.canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      this.cropSelection.width = currentX - startX;
      this.cropSelection.height = currentY - startY;
      this.updateCropOverlay();
    });

    this.canvas.addEventListener('mouseup', () => {
      if (isDragging && this.cropMode && this.cropSelection) {
        this.applyCrop();
      }
      isDragging = false;
    });
  }

  private async loadPhotosFromStorage() {
    try {
      const result = await chrome.storage.local.get(['vehiclePhotos']);
      const storedPhotos = result.vehiclePhotos || [];
      
      this.photos = storedPhotos.map((url: string) => ({
        originalUrl: url,
        currentImageData: url,
        editHistory: [],
        currentEdit: {}
      }));

      if (this.photos.length > 0) {
        this.currentPhotoIndex = 0;
        this.currentPhoto = this.photos[0];
        await this.loadCurrentPhoto();
      }

      this.updatePhotosPanel();
    } catch (error) {
      this.logger.error('Failed to load photos from storage:', error);
    }
  }

  private async loadCurrentPhoto() {
    if (!this.currentPhoto) return;

    try {
      this.showLoading(true);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
        
        this.fitToScreen();
        this.updateResizeInputs(img.width, img.height);
        this.showLoading(false);
      };
      
      img.src = this.currentPhoto.currentImageData;
    } catch (error) {
      this.logger.error('Failed to load current photo:', error);
      this.showLoading(false);
    }
  }

  private async applyCurrentEdits() {
    if (!this.currentPhoto) return;

    try {
      this.showLoading(true);
      
      const editedPhoto = await this.photoEditor.editPhoto(
        this.currentPhoto.originalUrl,
        this.currentPhoto.currentEdit
      );
      
      this.currentPhoto.currentImageData = editedPhoto.editedDataUrl;
      
      // Load the edited image onto canvas
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
        this.showLoading(false);
      };
      img.src = editedPhoto.editedDataUrl;
      
    } catch (error) {
      this.logger.error('Failed to apply edits:', error);
      this.showLoading(false);
    }
  }

  private async autoEnhance() {
    if (!this.currentPhoto) return;

    try {
      this.showLoading(true);
      
      const enhancedPhoto = await this.photoEditor.autoEnhance(this.currentPhoto.originalUrl);
      this.currentPhoto.currentEdit = enhancedPhoto.editOptions;
      this.currentPhoto.currentImageData = enhancedPhoto.editedDataUrl;
      
      this.updateControlsFromEdit();
      await this.loadCurrentPhoto();
      
    } catch (error) {
      this.logger.error('Auto enhance failed:', error);
      this.showLoading(false);
    }
  }

  private applyFilter(filter: PhotoEditOptions['filter']) {
    if (!this.currentPhoto) return;

    this.currentPhoto.currentEdit.filter = filter;
    this.applyCurrentEdits();
  }

  private updateFilterUI(activeBtn: Element) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  private rotate(degrees: number) {
    if (!this.currentPhoto) return;

    this.currentPhoto.currentEdit.rotation = 
      ((this.currentPhoto.currentEdit.rotation || 0) + degrees) % 360;
    this.applyCurrentEdits();
  }

  private toggleCropMode() {
    this.cropMode = !this.cropMode;
    const cropOverlay = document.getElementById('cropOverlay');
    const cropBtn = document.getElementById('cropBtn');
    
    if (this.cropMode) {
      cropOverlay?.classList.remove('hidden');
      cropBtn?.classList.add('active');
    } else {
      cropOverlay?.classList.add('hidden');
      cropBtn?.classList.remove('active');
      this.cropSelection = null;
    }
  }

  private updateCropOverlay() {
    if (!this.cropSelection) return;

    const overlay = document.querySelector('.crop-selection') as HTMLElement;
    if (overlay) {
      overlay.style.left = `${Math.min(this.cropSelection.x, this.cropSelection.x + this.cropSelection.width)}px`;
      overlay.style.top = `${Math.min(this.cropSelection.y, this.cropSelection.y + this.cropSelection.height)}px`;
      overlay.style.width = `${Math.abs(this.cropSelection.width)}px`;
      overlay.style.height = `${Math.abs(this.cropSelection.height)}px`;
    }
  }

  private applyCrop() {
    if (!this.currentPhoto || !this.cropSelection) return;

    // Adjust crop coordinates for canvas scaling
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    this.currentPhoto.currentEdit.crop = {
      x: Math.min(this.cropSelection.x, this.cropSelection.x + this.cropSelection.width) * scaleX,
      y: Math.min(this.cropSelection.y, this.cropSelection.y + this.cropSelection.height) * scaleY,
      width: Math.abs(this.cropSelection.width) * scaleX,
      height: Math.abs(this.cropSelection.height) * scaleY
    };

    this.applyCurrentEdits();
    this.toggleCropMode();
  }

  private async createVariations() {
    if (!this.currentPhoto) return;

    try {
      this.showLoading(true);
      
      const variations = await this.photoEditor.createVariations(this.currentPhoto.originalUrl);
      this.displayVariations(variations);
      
      this.showLoading(false);
    } catch (error) {
      this.logger.error('Failed to create variations:', error);
      this.showLoading(false);
    }
  }

  private displayVariations(variations: EditedPhoto[]) {
    const variationsSection = document.getElementById('variationsSection');
    const variationsGrid = document.getElementById('variationsGrid');
    
    if (!variationsSection || !variationsGrid) return;

    variationsGrid.innerHTML = '';
    
    variations.forEach((variation, index) => {
      const variationElement = document.createElement('div');
      variationElement.className = 'variation-item';
      
      variationElement.innerHTML = `
        <img src="${variation.editedDataUrl}" alt="Variation ${index + 1}" class="variation-thumb">
        <div class="variation-label">Variation ${index + 1}</div>
      `;
      
      variationElement.addEventListener('click', () => {
        if (this.currentPhoto) {
          this.currentPhoto.currentEdit = variation.editOptions;
          this.currentPhoto.currentImageData = variation.editedDataUrl;
          this.updateControlsFromEdit();
          this.loadCurrentPhoto();
        }
      });
      
      variationsGrid.appendChild(variationElement);
    });
    
    variationsSection.classList.remove('hidden');
  }

  private async batchApplyCurrentSettings() {
    if (!this.currentPhoto || this.photos.length <= 1) return;

    try {
      this.showLoading(true);
      
      const otherPhotoUrls = this.photos
        .filter((_, index) => index !== this.currentPhotoIndex)
        .map(photo => photo.originalUrl);
      
      const editedPhotos = await this.photoEditor.batchEdit(
        otherPhotoUrls,
        this.currentPhoto.currentEdit
      );
      
      // Update other photos with edited versions
      editedPhotos.forEach((editedPhoto, index) => {
        const photoIndex = index < this.currentPhotoIndex ? index : index + 1;
        this.photos[photoIndex].currentEdit = editedPhoto.editOptions;
        this.photos[photoIndex].currentImageData = editedPhoto.editedDataUrl;
      });
      
      this.updatePhotosPanel();
      this.showLoading(false);
      
    } catch (error) {
      this.logger.error('Batch apply failed:', error);
      this.showLoading(false);
    }
  }

  private resetAllEdits() {
    if (!this.currentPhoto) return;

    this.currentPhoto.currentEdit = {};
    this.currentPhoto.currentImageData = this.currentPhoto.originalUrl;
    this.updateControlsFromEdit();
    this.loadCurrentPhoto();
  }

  private updateControlsFromEdit() {
    if (!this.currentPhoto) return;

    const edit = this.currentPhoto.currentEdit;
    
    // Update sliders
    this.setSliderValue('brightnessSlider', 'brightnessValue', edit.brightness || 0);
    this.setSliderValue('contrastSlider', 'contrastValue', edit.contrast || 0);
    this.setSliderValue('saturationSlider', 'saturationValue', edit.saturation || 0);
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-filter') === (edit.filter || 'none')) {
        btn.classList.add('active');
      }
    });
  }

  private setSliderValue(sliderId: string, valueId: string, value: number) {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId);
    
    if (slider) slider.value = value.toString();
    if (valueDisplay) valueDisplay.textContent = value.toString();
  }

  private updateResizeInputs(width: number, height: number) {
    const widthInput = document.getElementById('widthInput') as HTMLInputElement;
    const heightInput = document.getElementById('heightInput') as HTMLInputElement;
    
    if (widthInput) widthInput.value = width.toString();
    if (heightInput) heightInput.value = height.toString();
  }

  private zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5);
    this.applyZoom();
  }

  private zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.1);
    this.applyZoom();
  }

  private fitToScreen() {
    const container = document.querySelector('.canvas-container') as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const scaleX = (containerRect.width - 40) / this.canvas.width;
    const scaleY = (containerRect.height - 40) / this.canvas.height;
    
    this.zoomLevel = Math.min(scaleX, scaleY, 1);
    this.applyZoom();
  }

  private applyZoom() {
    this.canvas.style.transform = `scale(${this.zoomLevel})`;
    
    const zoomDisplay = document.querySelector('.zoom-level');
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
  }

  private addPhotos() {
    const fileInput = document.getElementById('photoFileInput') as HTMLInputElement;
    fileInput?.click();
  }

  private async handleFileSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await this.fileToDataUrl(file);
        
        const newPhoto: PhotoState = {
          originalUrl: dataUrl,
          currentImageData: dataUrl,
          editHistory: [],
          currentEdit: {}
        };
        
        this.photos.push(newPhoto);
      }
    }
    
    this.updatePhotosPanel();
    
    // Load the first new photo if no photo was selected
    if (!this.currentPhoto && this.photos.length > 0) {
      this.currentPhotoIndex = 0;
      this.currentPhoto = this.photos[0];
      await this.loadCurrentPhoto();
    }
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private updatePhotosPanel() {
    const photosList = document.getElementById('photosList');
    if (!photosList) return;

    photosList.innerHTML = '';
    
    this.photos.forEach((photo, index) => {
      const photoElement = document.createElement('div');
      photoElement.className = `photo-item ${index === this.currentPhotoIndex ? 'active' : ''}`;
      
      photoElement.innerHTML = `
        <img src="${photo.currentImageData}" alt="Photo ${index + 1}" class="photo-thumb">
        <div class="photo-info">
          <div class="photo-name">Photo ${index + 1}</div>
          <div class="photo-size">Edited: ${Object.keys(photo.currentEdit).length > 0 ? 'Yes' : 'No'}</div>
        </div>
        <div class="photo-actions">
          <button class="btn btn-xs btn-tool" onclick="event.stopPropagation(); this.parentElement.parentElement.remove();">×</button>
        </div>
      `;
      
      photoElement.addEventListener('click', () => {
        this.currentPhotoIndex = index;
        this.currentPhoto = photo;
        this.loadCurrentPhoto();
        this.updateControlsFromEdit();
        this.updatePhotosPanel();
      });
      
      photosList.appendChild(photoElement);
    });
  }

  private async saveCurrentPhoto() {
    if (!this.currentPhoto) return;

    try {
      // Create download link
      const link = document.createElement('a');
      link.download = `edited-photo-${Date.now()}.jpg`;
      link.href = this.currentPhoto.currentImageData;
      link.click();
      
      this.logger.info('Photo saved successfully');
    } catch (error) {
      this.logger.error('Failed to save photo:', error);
    }
  }

  private goBack() {
    // Return to main extension view
    window.history.back();
  }

  private showLoading(show: boolean) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      if (show) {
        loadingIndicator.classList.remove('hidden');
      } else {
        loadingIndicator.classList.add('hidden');
      }
    }
  }

  private updateUI() {
    // Update various UI elements based on current state
    this.updatePhotosPanel();
    if (this.currentPhoto) {
      this.updateControlsFromEdit();
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PhotoEditorUI();
});