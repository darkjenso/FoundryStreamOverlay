// Window Configuration UI Component - Enhanced Version
import { MODULE_ID } from '../core/constants.js';
import { isPremiumActive } from '../premium/validation.js';
import OverlayData from '../../data-storage.js';

export class OverlayWindowConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Configure Overlay Window",
      id: "foundrystreamoverlay-window-config",
      template: `modules/${MODULE_ID}/templates/window-config.html`,
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      resizable: true,
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "basic" }]
    });
  }

  constructor(windowId, options = {}) {
    super();
    this.windowId = windowId;
    this.options = foundry.utils.mergeObject(this.options, options);
    
    if (!this.windowId) {
      ui.notifications.error("Window ID is required for configuration");
      this.close();
      return;
    }

    // Initialize state
    this._previewMode = false;
    this._hasUnsavedChanges = false;
  }

  getData() {
    try {
      const windows = OverlayData.getOverlayWindows();
      let windowConfig = windows[this.windowId];
      
      // Create default config if window doesn't exist
      if (!windowConfig) {
        console.warn(`${MODULE_ID} | Window ${this.windowId} not found, creating default config`);
        windowConfig = {
          id: this.windowId,
          name: this.windowId === "main" ? "Main Overlay" : `Window ${this.windowId}`,
          activeLayout: "Default",
          width: 800,
          height: 600,
          slideshowActive: false,
          backgroundColor: "#00ff00",
          autoResize: false,
          alwaysOnTop: false
        };
        
        // Save the default config
        OverlayData.setOverlayWindow(this.windowId, windowConfig);
      }

      const layouts = OverlayData.getLayouts();
      const layoutsList = Object.keys(layouts).map(key => ({
        key: key,
        name: key,
        itemCount: Array.isArray(layouts[key]) ? layouts[key].length : 0,
        isActive: key === windowConfig.activeLayout
      }));

      // Check if window is currently open
      const isWindowOpen = window.overlayWindows && 
                          window.overlayWindows[this.windowId] && 
                          !window.overlayWindows[this.windowId].closed;

      // Get current window dimensions if open
      let currentDimensions = null;
      if (isWindowOpen) {
        const overlayWindow = window.overlayWindows[this.windowId];
        currentDimensions = {
          width: overlayWindow.outerWidth || overlayWindow.innerWidth,
          height: overlayWindow.outerHeight || overlayWindow.innerHeight
        };
      }

      // Check if this window is being used in slideshow
      const slideshow = OverlayData.getSlideshow();
      const isInSlideshow = slideshow.targetWindow === this.windowId;

      console.log(`${MODULE_ID} | Window config data for ${this.windowId}:`, {
        windowConfig,
        layoutsCount: layoutsList.length,
        isWindowOpen,
        currentDimensions
      });

      return {
        windowId: this.windowId,
        windowConfig,
        layouts: layoutsList,
        isWindowOpen,
        currentDimensions,
        isInSlideshow,
        isPremium: isPremiumActive(),
        hasUnsavedChanges: this._hasUnsavedChanges,
        presets: this._getPresets(),
        availableBackgrounds: this._getBackgroundPresets()
      };
    } catch (error) {
      console.error(`${MODULE_ID} | Error getting window config data:`, error);
      ui.notifications.error("Failed to load window configuration");
      return this._getErrorFallbackData();
    }
  }

  _getErrorFallbackData() {
    return {
      windowId: this.windowId,
      windowConfig: {
        id: this.windowId,
        name: "Error Loading",
        activeLayout: "Default",
        width: 800,
        height: 600,
        backgroundColor: "#00ff00"
      },
      layouts: [{ key: "Default", name: "Default", itemCount: 0, isActive: true }],
      isWindowOpen: false,
      currentDimensions: null,
      isInSlideshow: false,
      isPremium: false,
      hasUnsavedChanges: false,
      presets: [],
      availableBackgrounds: []
    };
  }

  _getPresets() {
    return [
      { name: "1080p Stream", width: 1920, height: 1080 },
      { name: "720p Stream", width: 1280, height: 720 },
      { name: "Small Overlay", width: 800, height: 600 },
      { name: "Compact", width: 600, height: 400 },
      { name: "Widescreen", width: 1200, height: 500 },
      { name: "Square", width: 800, height: 800 }
    ];
  }

  _getBackgroundPresets() {
    return [
      { name: "Green Screen", value: "#00ff00", description: "Standard chroma key green" },
      { name: "Blue Screen", value: "#0000ff", description: "Chroma key blue" },
      { name: "Magenta", value: "#ff00ff", description: "Bright magenta for chroma key" },
      { name: "Transparent", value: "transparent", description: "No background (browser dependent)" },
      { name: "Black", value: "#000000", description: "Solid black background" },
      { name: "White", value: "#ffffff", description: "Solid white background" }
    ];
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Basic controls
    html.find("#save-current-size").click(this._onSaveCurrentSize.bind(this));
    html.find(".open-window").click(this._onOpenWindow.bind(this));
    html.find(".close-window").click(this._onCloseWindow.bind(this));
    html.find(".test-window").click(this._onTestWindow.bind(this));

    // Preset controls
    html.find(".apply-preset").click(this._onApplyPreset.bind(this));
    html.find(".apply-background").click(this._onApplyBackground.bind(this));

    // Advanced controls
    html.find("#refresh-layouts").click(this._onRefreshLayouts.bind(this));
    html.find("#duplicate-window").click(this._onDuplicateWindow.bind(this));
    html.find("#reset-window").click(this._onResetWindow.bind(this));

    // Auto-update and change tracking
    html.find('input, select').on('change input', this._onFormChange.bind(this));
    html.find('input[type="number"]').on('input', this._onNumberInputChange.bind(this));

    // Layout preview
    html.find('.layout-preview-btn').click(this._onPreviewLayout.bind(this));

    // Save and cancel buttons
    html.find('.save-config').click(this._onSave.bind(this));
    html.find('.cancel-config').click(this._onCancel.bind(this));

    // Auto-save toggle
    html.find('#auto-save-toggle').change(this._onAutoSaveToggle.bind(this));

    // Real-time preview toggle
    html.find('#live-preview-toggle').change(this._onLivePreviewToggle.bind(this));
  }

  async _onSaveCurrentSize(event) {
    event.preventDefault();
    
    try {
      if (!window.overlayWindows || !window.overlayWindows[this.windowId]) {
        ui.notifications.warn("Window is not currently open. Please open the window first.");
        return;
      }

      const overlayWindow = window.overlayWindows[this.windowId];
      
      if (overlayWindow.closed) {
        ui.notifications.warn("Window appears to be closed. Please open the window first.");
        return;
      }

      const width = overlayWindow.outerWidth || overlayWindow.innerWidth ||
                     overlayWindow.document.documentElement.clientWidth;
      const height = overlayWindow.outerHeight || overlayWindow.innerHeight ||
                      overlayWindow.document.documentElement.clientHeight;
      // Update the form inputs
      const html = this.element;
      html.find('input[name="width"]').val(width);
      html.find('input[name="height"]').val(height);

      this._hasUnsavedChanges = true;
      this._updateSaveButton();

      ui.notifications.info(`Captured current size: ${width}x${height}`);
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error capturing window size:`, error);
      ui.notifications.error("Failed to capture window size");
    }
  }

  async _onOpenWindow(event) {
    event.preventDefault();
    
    try {
      const { openOverlayWindow } = await import('../overlay/window-management.js');
      await openOverlayWindow(this.windowId);
      
      // Update the form to reflect that window is now open
      setTimeout(() => {
        this.render();
      }, 1000);
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error opening window:`, error);
      ui.notifications.error("Failed to open overlay window");
    }
  }

  async _onCloseWindow(event) {
    event.preventDefault();
    
    try {
      if (window.overlayWindows && window.overlayWindows[this.windowId]) {
        window.overlayWindows[this.windowId].close();
        setTimeout(() => {
          this.render();
        }, 500);
      }
    } catch (error) {
      console.error(`${MODULE_ID} | Error closing window:`, error);
    }
  }

  async _onTestWindow(event) {
    event.preventDefault();
    
    // Temporarily apply current form settings to test
    const formData = new FormDataExtended(this.element.find('form')[0]).object;
    await this._applyTemporarySettings(formData);
  }

  _onApplyPreset(event) {
    event.preventDefault();
    const preset = $(event.currentTarget).data('preset');
    const presetData = this._getPresets().find(p => p.name === preset);
    
    if (presetData) {
      const html = this.element;
      html.find('input[name="width"]').val(presetData.width);
      html.find('input[name="height"]').val(presetData.height);
      
      this._hasUnsavedChanges = true;
      this._updateSaveButton();
      
      ui.notifications.info(`Applied ${preset} preset`);
    }
  }

  _onApplyBackground(event) {
    event.preventDefault();
    const background = $(event.currentTarget).data('background');
    
    const html = this.element;
    html.find('input[name="backgroundColor"]').val(background);
    
    this._hasUnsavedChanges = true;
    this._updateSaveButton();
    
    ui.notifications.info(`Applied background: ${background}`);
  }

  async _onRefreshLayouts(event) {
    event.preventDefault();
    this.render();
    ui.notifications.info("Layout list refreshed");
  }

  async _onDuplicateWindow(event) {
    event.preventDefault();
    
    if (!isPremiumActive()) {
      ui.notifications.warn("Window duplication requires premium features");
      return;
    }

    // Implementation for duplicating window configuration
    const newWindowId = `window_${Date.now()}`;
    const currentConfig = this._getCurrentFormData();
    currentConfig.id = newWindowId;
    currentConfig.name = `${currentConfig.name} (Copy)`;
    
    await OverlayData.setOverlayWindow(newWindowId, currentConfig);
    ui.notifications.info(`Window duplicated as: ${currentConfig.name}`);
  }

  async _onResetWindow(event) {
    event.preventDefault();
    
    const confirmed = await Dialog.confirm({
      title: "Reset Window Configuration",
      content: "Are you sure you want to reset this window to default settings?",
      yes: () => true,
      no: () => false
    });
    
    if (confirmed) {
      // Reset to defaults
      const html = this.element;
      html.find('input[name="name"]').val(`Window ${this.windowId}`);
      html.find('select[name="activeLayout"]').val("Default");
      html.find('input[name="width"]').val(800);
      html.find('input[name="height"]').val(600);
      html.find('input[name="backgroundColor"]').val("#00ff00");
      
      this._hasUnsavedChanges = true;
      this._updateSaveButton();
      
      ui.notifications.info("Window configuration reset to defaults");
    }
  }

  _onFormChange(event) {
    this._hasUnsavedChanges = true;
    this._updateSaveButton();
    
    // If live preview is enabled, apply changes immediately
    if (this._previewMode && this.element.find('#live-preview-toggle').is(':checked')) {
      clearTimeout(this._previewTimeout);
      this._previewTimeout = setTimeout(() => {
        this._applyLivePreview();
      }, 500);
    }
  }

  _onNumberInputChange(event) {
    // Validate number inputs in real-time
    const input = $(event.currentTarget);
    const value = Number(input.val());
    const min = Number(input.attr('min')) || 0;
    const max = Number(input.attr('max')) || 9999;
    
    if (value < min || value > max) {
      input.addClass('invalid');
    } else {
      input.removeClass('invalid');
    }
  }

  async _onPreviewLayout(event) {
    event.preventDefault();
    const layoutName = $(event.currentTarget).data('layout');
    
    if (window.overlayWindows && window.overlayWindows[this.windowId] && !window.overlayWindows[this.windowId].closed) {
      // Temporarily switch to this layout for preview
      const windows = OverlayData.getOverlayWindows();
      const currentConfig = windows[this.windowId];
      const tempConfig = { ...currentConfig, activeLayout: layoutName };
      
      const { updateOverlayWindow } = await import('../overlay/window-management.js');
      await OverlayData.setOverlayWindow(this.windowId, tempConfig);
      updateOverlayWindow(this.windowId);
      
      ui.notifications.info(`Previewing layout: ${layoutName}`);
    } else {
      ui.notifications.warn("Please open the window first to preview layouts");
    }
  }

  async _onSave(event) {
    event.preventDefault();
    
    const formData = new FormDataExtended(this.element.find('form')[0]).object;
    const success = await this._updateObject(event, formData);
    
    if (success) {
      this._hasUnsavedChanges = false;
      this._updateSaveButton();
    }
  }

  _onCancel(event) {
    event.preventDefault();
    
    if (this._hasUnsavedChanges) {
      Dialog.confirm({
        title: "Unsaved Changes",
        content: "You have unsaved changes. Are you sure you want to close without saving?",
        yes: () => this.close(),
        no: () => {}
      });
    } else {
      this.close();
    }
  }

  _onAutoSaveToggle(event) {
    const enabled = $(event.currentTarget).is(':checked');
    if (enabled) {
      ui.notifications.info("Auto-save enabled");
    }
  }

  _onLivePreviewToggle(event) {
    this._previewMode = $(event.currentTarget).is(':checked');
    if (this._previewMode) {
      ui.notifications.info("Live preview enabled");
    }
  }

  _updateSaveButton() {
    const saveButton = this.element.find('.save-config');
    if (this._hasUnsavedChanges) {
      saveButton.text('Save Changes*').addClass('modified');
    } else {
      saveButton.text('Save Changes').removeClass('modified');
    }
  }

  _getCurrentFormData() {
    return new FormDataExtended(this.element.find('form')[0]).object;
  }

  async _applyTemporarySettings(formData) {
    // Apply settings temporarily for testing without saving
    try {
      const windows = OverlayData.getOverlayWindows();
      const currentConfig = windows[this.windowId] || {};
      
      const tempConfig = {
        ...currentConfig,
        name: formData.name?.trim() || currentConfig.name,
        activeLayout: formData.activeLayout || currentConfig.activeLayout,
        width: Number(formData.width) || currentConfig.width,
        height: Number(formData.height) || currentConfig.height,
        backgroundColor: formData.backgroundColor || currentConfig.backgroundColor
      };

      if (window.overlayWindows && window.overlayWindows[this.windowId] && !window.overlayWindows[this.windowId].closed) {
        const { updateOverlayWindow } = await import('../overlay/window-management.js');
        await OverlayData.setOverlayWindow(this.windowId, tempConfig);
        updateOverlayWindow(this.windowId);
        
        ui.notifications.info("Test settings applied (not saved)");
      } else {
        ui.notifications.warn("Window is not open for testing");
      }
    } catch (error) {
      console.error(`${MODULE_ID} | Error applying temporary settings:`, error);
    }
  }

  async _applyLivePreview() {
    if (!this._previewMode) return;
    
    const formData = this._getCurrentFormData();
    await this._applyTemporarySettings(formData);
  }

  async _updateObject(event, formData) {
    try {
      console.log(`${MODULE_ID} | Updating window config for ${this.windowId}:`, formData);

      // Validate input data
      const width = Number(formData.width) || 800;
      const height = Number(formData.height) || 600;
      
      if (width < 100 || width > 7680) {
        ui.notifications.error("Width must be between 100 and 7680 pixels");
        return false;
      }
      
      if (height < 100 || height > 4320) {
        ui.notifications.error("Height must be between 100 and 4320 pixels");
        return false;
      }

      // Get current config and merge with new data
      const windows = OverlayData.getOverlayWindows();
      const currentConfig = windows[this.windowId] || {};
      
      const windowConfig = {
        ...currentConfig,
        id: this.windowId,
        name: formData.name?.trim() || currentConfig.name || `Window ${this.windowId}`,
        activeLayout: formData.activeLayout || currentConfig.activeLayout || "Default",
        width: width,
        height: height,
        backgroundColor: formData.backgroundColor || currentConfig.backgroundColor || "#00ff00",
        autoResize: Boolean(formData.autoResize),
        alwaysOnTop: Boolean(formData.alwaysOnTop),
        slideshowActive: currentConfig.slideshowActive || false
      };

      // Validate that the selected layout exists
      const layouts = OverlayData.getLayouts();
      if (!layouts[windowConfig.activeLayout]) {
        console.warn(`${MODULE_ID} | Layout ${windowConfig.activeLayout} not found, using Default`);
        windowConfig.activeLayout = "Default";
      }

      // Save the configuration
      await OverlayData.setOverlayWindow(this.windowId, windowConfig);
      
      ui.notifications.info(`Window configuration saved: ${windowConfig.name}`);

      // Update the window if it's currently open
      if (window.overlayWindows && 
          window.overlayWindows[this.windowId] && 
          !window.overlayWindows[this.windowId].closed) {
        
        const { updateOverlayWindow } = await import('../overlay/window-management.js');
        updateOverlayWindow(this.windowId);
        
        // Resize the window if size changed
        try {
          const overlayWindow = window.overlayWindows[this.windowId];
          overlayWindow.resizeTo(windowConfig.width, windowConfig.height);
          
          // Update background color
          if (overlayWindow.document && overlayWindow.document.body) {
            overlayWindow.document.body.style.backgroundColor = windowConfig.backgroundColor;
          }
        } catch (resizeError) {
          console.warn(`${MODULE_ID} | Could not resize/update window:`, resizeError.message);
        }
      }

      // Trigger live sync if enabled
      if (game.settings.get(MODULE_ID, "autoSyncStandalone")) {
        try {
          const { liveSync } = await import('../utils/live-sync.js');
          liveSync.queueSync("window-config-change", this.windowId);
        } catch (error) {
          // Live sync not available
        }
      }

      return true;
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error updating window configuration:`, error);
      ui.notifications.error("Failed to save window configuration. Check console for details.");
      return false;
    }
  }

  /**
   * Handle closing the window config
   */
  async close(options = {}) {
    // Clean up any timers
    if (this._previewTimeout) {
      clearTimeout(this._previewTimeout);
    }
    
    return super.close(options);
  }

  /**
   * Static method to open window config for a specific window
   */
  static async openForWindow(windowId) {
    try {
      // Close any existing window config dialogs
      for (const app of Object.values(ui.windows)) {
        if (app.constructor.name === 'OverlayWindowConfig') {
          app.close();
        }
      }
      
      // Open new config
      const config = new OverlayWindowConfig(windowId);
      return config.render(true);
    } catch (error) {
      console.error(`${MODULE_ID} | Error opening window config:`, error);
      ui.notifications.error("Failed to open window configuration");
    }
  }
}