// FIXED Data Storage for Foundry Stream Overlay - CLEAN VERSION
import { MODULE_ID } from './js/core/constants.js';

class OverlayDataStorage {
  constructor() {
    this.data = {
      layouts: { "Default": [] },
      overlayWindows: {
        "main": { 
          id: "main", 
          name: "Main Overlay",
          activeLayout: "Default",
          slideshowActive: false,
          width: 800,
          height: 600
        }
      },
      slideshow: { 
        list: [], 
        random: false,
        transition: "none",
        transitionDuration: 0.5,
        targetWindow: "main"
      },
      settings: {
        isPremium: false,
        activationKey: "",
        backgroundColour: "#00ff00",
        enableTriggeredAnimations: true
      }
    };
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log(`${MODULE_ID} | Initializing data storage...`);
    
    try {
      // Load all data from Foundry settings
      await this._loadFromSettings();
      
      this.initialized = true;
      console.log(`${MODULE_ID} | Data storage initialized`);
      
      console.log(`${MODULE_ID} | Data loaded:`, {
        layoutCount: Object.keys(this.data.layouts).length,
        windowCount: Object.keys(this.data.overlayWindows).length,
        slideshowItems: this.data.slideshow.list.length
      });
      
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to initialize data storage:`, error);
      this.initialized = false;
      throw error;
    }
  }

  async _loadFromSettings() {
    try {
      // Load layouts
      const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
      this.data.layouts = layouts;
      
      // Ensure Default layout exists
      if (!this.data.layouts["Default"]) {
        this.data.layouts["Default"] = [];
      }

      // Load overlay windows
      const overlayWindows = game.settings.get(MODULE_ID, "overlayWindows") || {};
      this.data.overlayWindows = overlayWindows;
      
      // Ensure main window exists with proper structure
      if (!this.data.overlayWindows["main"]) {
        this.data.overlayWindows["main"] = { 
          id: "main", 
          name: "Main Overlay",
          activeLayout: "Default",
          slideshowActive: false,
          width: 800,
          height: 600
        };
      }

      // Load slideshow config
      const slideshow = game.settings.get(MODULE_ID, "slideshow") || { 
        list: [], 
        random: false,
        transition: "none",
        transitionDuration: 0.5,
        targetWindow: "main"
      };
      this.data.slideshow = slideshow;

      // Load user-specific settings
      this.data.settings.isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
      this.data.settings.activationKey = game.settings.get(MODULE_ID, "activationKey") || "";
      this.data.settings.backgroundColour = game.settings.get(MODULE_ID, "backgroundColour") || "#00ff00";
      this.data.settings.enableTriggeredAnimations = game.settings.get(MODULE_ID, "enableTriggeredAnimations") || true;
      
      console.log(`${MODULE_ID} | Settings loaded successfully`);
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error loading settings:`, error);
      throw error;
    }
  }

  async save() {
    if (!this.initialized) {
      console.warn(`${MODULE_ID} | Cannot save - data storage not initialized`);
      return;
    }

    try {
      // Save layouts
      await game.settings.set(MODULE_ID, "layouts", this.data.layouts);
      
      // Save overlay windows
      await game.settings.set(MODULE_ID, "overlayWindows", this.data.overlayWindows);
      
      // Save slideshow
      await game.settings.set(MODULE_ID, "slideshow", this.data.slideshow);
      
      console.log(`${MODULE_ID} | Data saved successfully`);
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error saving data:`, error);
      throw error;
    }
  }

  // ===================================
  // LAYOUT MANAGEMENT (SCENES)
  // ===================================

  getLayouts() {
    return this.data.layouts || { "Default": [] };
  }

  getLayout(layoutName) {
    return this.data.layouts[layoutName] || null;
  }

  async setLayout(layoutName, items) {
    this.data.layouts[layoutName] = Array.isArray(items) ? items : [];
    await game.settings.set(MODULE_ID, "layouts", this.data.layouts);
    console.log(`${MODULE_ID} | Layout "${layoutName}" saved with ${items.length} items`);
  }

  async deleteLayout(layoutName) {
    if (layoutName === "Default") {
      console.warn(`${MODULE_ID} | Cannot delete Default layout`);
      return false;
    }
    
    delete this.data.layouts[layoutName];
    await game.settings.set(MODULE_ID, "layouts", this.data.layouts);
    console.log(`${MODULE_ID} | Layout "${layoutName}" deleted`);
    return true;
  }

  // ===================================
  // WINDOW MANAGEMENT
  // ===================================

  getOverlayWindows() {
    return this.data.overlayWindows || {};
  }

  getOverlayWindow(windowId) {
    return this.data.overlayWindows[windowId] || null;
  }

  async setOverlayWindow(windowId, config) {
    this.data.overlayWindows[windowId] = {
      id: windowId,
      name: config.name || `Window ${windowId}`,
      activeLayout: config.activeLayout || "Default",
      slideshowActive: config.slideshowActive || false,
      width: config.width || 800,
      height: config.height || 600,
      backgroundColor: config.backgroundColor || "#00ff00",
      ...config
    };
    
    await game.settings.set(MODULE_ID, "overlayWindows", this.data.overlayWindows);
    console.log(`${MODULE_ID} | Window "${windowId}" configuration saved:`, this.data.overlayWindows[windowId]);
  }

  async deleteOverlayWindow(windowId) {
    if (windowId === "main") {
      console.warn(`${MODULE_ID} | Cannot delete main window`);
      return false;
    }
    
    delete this.data.overlayWindows[windowId];
    await game.settings.set(MODULE_ID, "overlayWindows", this.data.overlayWindows);
    console.log(`${MODULE_ID} | Window "${windowId}" deleted`);
    return true;
  }

  // ===================================
  // SLIDESHOW MANAGEMENT
  // ===================================

  getSlideshow() {
    return this.data.slideshow || { 
      list: [], 
      random: false,
      transition: "none",
      transitionDuration: 0.5,
      targetWindow: "main"
    };
  }

  async setSlideshow(slideshowData) {
    this.data.slideshow = {
      list: slideshowData.list || [],
      random: slideshowData.random || false,
      transition: slideshowData.transition || "none",
      transitionDuration: slideshowData.transitionDuration || 0.5,
      targetWindow: slideshowData.targetWindow || "main"
    };
    
    await game.settings.set(MODULE_ID, "slideshow", this.data.slideshow);
    console.log(`${MODULE_ID} | Slideshow configuration saved`);
  }

  // ===================================
  // SETTINGS MANAGEMENT
  // ===================================

  getSetting(key) {
    return this.data.settings[key];
  }

  async setSetting(key, value) {
    this.data.settings[key] = value;
    
    // Also save to Foundry settings if it's a registered setting
    try {
      await game.settings.set(MODULE_ID, key, value);
    } catch (error) {
      console.warn(`${MODULE_ID} | Setting "${key}" not registered in Foundry, storing locally only`);
    }
    
    console.log(`${MODULE_ID} | Setting "${key}" updated to:`, value);
  }

  // ===================================
  // IMPORT/EXPORT FUNCTIONALITY
  // ===================================

  exportToFile() {
    const exportData = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      layouts: this.data.layouts,
      overlayWindows: this.data.overlayWindows,
      slideshow: this.data.slideshow,
      settings: {
        backgroundColour: this.data.settings.backgroundColour,
        enableTriggeredAnimations: this.data.settings.enableTriggeredAnimations
        // Note: Don't export premium settings for security
      }
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `foundry-stream-overlay-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    ui.notifications.info("Overlay data exported successfully!");
  }

  async importFromFile(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate the import data structure
      if (!importData.layouts) {
        throw new Error("Invalid backup file - missing layouts data");
      }

      // Confirm the import
      const confirmed = await Dialog.confirm({
        title: "Import Overlay Data",
        content: `
          <p><strong>This will replace all your current overlay data!</strong></p>
          <p>Backup contains:</p>
          <ul>
            <li>${Object.keys(importData.layouts || {}).length} scenes</li>
            <li>${Object.keys(importData.overlayWindows || {}).length} windows</li>
            <li>${(importData.slideshow?.list || []).length} slideshow items</li>
          </ul>
          <p>Are you sure you want to continue?</p>
        `,
        yes: () => true,
        no: () => false
      });

      if (!confirmed) return false;

      // Import the data
      this.data.layouts = importData.layouts || { "Default": [] };
      this.data.overlayWindows = importData.overlayWindows || {
        "main": { 
          id: "main", 
          name: "Main Overlay",
          activeLayout: "Default",
          slideshowActive: false,
          width: 800,
          height: 600
        }
      };
      this.data.slideshow = importData.slideshow || { 
        list: [], 
        random: false,
        transition: "none",
        transitionDuration: 0.5,
        targetWindow: "main"
      };

      // Import settings (excluding premium settings)
      if (importData.settings) {
        if (importData.settings.backgroundColour) {
          this.data.settings.backgroundColour = importData.settings.backgroundColour;
        }
        if (importData.settings.enableTriggeredAnimations !== undefined) {
          this.data.settings.enableTriggeredAnimations = importData.settings.enableTriggeredAnimations;
        }
      }

      // Save everything
      await this.save();
      
      ui.notifications.info("Overlay data imported successfully!");
      console.log(`${MODULE_ID} | Data imported from file:`, file.name);
      
      return true;
      
    } catch (error) {
      console.error(`${MODULE_ID} | Import error:`, error);
      ui.notifications.error(`Import failed: ${error.message}`);
      return false;
    }
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  // Get the layout for a specific window
  getWindowLayout(windowId) {
    const window = this.getOverlayWindow(windowId);
    if (!window) return "Default";
    return window.activeLayout || "Default";
  }

  // Set the layout for a specific window
  async setWindowLayout(windowId, layoutName) {
    const window = this.getOverlayWindow(windowId);
    if (!window) {
      console.warn(`${MODULE_ID} | Window "${windowId}" not found`);
      return false;
    }

    const layouts = this.getLayouts();
    if (!layouts[layoutName]) {
      console.warn(`${MODULE_ID} | Layout "${layoutName}" not found`);
      return false;
    }

    await this.setOverlayWindow(windowId, {
      ...window,
      activeLayout: layoutName
    });

    console.log(`${MODULE_ID} | Window "${windowId}" layout changed to "${layoutName}"`);
    return true;
  }

  // Get all windows using a specific layout
  getWindowsUsingLayout(layoutName) {
    const windows = this.getOverlayWindows();
    return Object.entries(windows)
      .filter(([windowId, config]) => config.activeLayout === layoutName)
      .map(([windowId, config]) => ({ windowId, config }));
  }

  // Validation helper
  validateData() {
    const issues = [];
    
    // Check layouts
    if (!this.data.layouts || typeof this.data.layouts !== 'object') {
      issues.push("Invalid layouts data structure");
    } else if (!this.data.layouts["Default"]) {
      issues.push("Missing Default layout");
    }
    
    // Check windows
    if (!this.data.overlayWindows || typeof this.data.overlayWindows !== 'object') {
      issues.push("Invalid overlay windows data structure");
    } else if (!this.data.overlayWindows["main"]) {
      issues.push("Missing main window configuration");
    }
    
    // Check slideshow
    if (!this.data.slideshow || typeof this.data.slideshow !== 'object') {
      issues.push("Invalid slideshow data structure");
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  // Debug helper
  getDebugInfo() {
    const validation = this.validateData();
    
    return {
      initialized: this.initialized,
      validation: validation,
      layoutCount: Object.keys(this.data.layouts).length,
      windowCount: Object.keys(this.data.overlayWindows).length,
      slideshowItemCount: this.data.slideshow.list.length,
      settings: { ...this.data.settings, activationKey: "***" }, // Hide sensitive data
      layouts: Object.keys(this.data.layouts),
      windows: Object.entries(this.data.overlayWindows).map(([id, config]) => ({
        id,
        name: config.name,
        activeLayout: config.activeLayout
      }))
    };
  }
}

// Create and export singleton instance
const OverlayData = new OverlayDataStorage();
export default OverlayData;