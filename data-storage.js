const MODULE_ID = "foundrystreamoverlay";

/**
 * A class to handle all data storage operations for the module
 */
class OverlayDataStorage {
  constructor() {
    this.data = {
      settings: {
        isPremium: false,
        activationKey: "",
        backgroundColour: "#00ff00",
        enableTriggeredAnimations: true
      },
      layouts: {
        "Default": []
      },
      activeLayout: "Default",
      overlayWindows: {
        "main": { 
          id: "main", 
          name: "Main Overlay",
          activeLayout: "Default",
          "slideshowActive": false,
          "width": 800,      
          "height": 600
        }
      },
      slideshow: { 
        list: [], 
        random: false,
        transition: "none",
        transitionDuration: 0.5
      }
    };
    
    this.initialized = false;
  }
  
  /**
   * Initialize the data store, loading data from file if available
   */
  async initialize() {
    if (this.initialized) {
      console.log(`${MODULE_ID} | OverlayData already initialized, skipping`);
      return;
    }
    
    console.log(`${MODULE_ID} | Starting OverlayData initialization...`);
    
    try {
      // FIXED: More robust data loading
      let storedData = null;
      
      try {
        storedData = await game.settings.get(MODULE_ID, "storedUserData");
        console.log(`${MODULE_ID} | Retrieved stored data:`, storedData ? Object.keys(storedData) : "null");
      } catch (error) {
        console.error(`${MODULE_ID} | Error retrieving stored data:`, error);
      }
      
      if (storedData && typeof storedData === 'object' && Object.keys(storedData).length > 0) {
        console.log(`${MODULE_ID} | Found existing user data, merging with defaults`);
        
        // FIXED: More careful merging to preserve existing data
        if (storedData.layouts && Object.keys(storedData.layouts).length > 0) {
          console.log(`${MODULE_ID} | Preserving ${Object.keys(storedData.layouts).length} layouts`);
          this.data.layouts = storedData.layouts;
        }
        
        if (storedData.overlayWindows && Object.keys(storedData.overlayWindows).length > 0) {
          console.log(`${MODULE_ID} | Preserving ${Object.keys(storedData.overlayWindows).length} windows`);
          this.data.overlayWindows = storedData.overlayWindows;
        }
        
        if (storedData.activeLayout) {
          console.log(`${MODULE_ID} | Preserving active layout: ${storedData.activeLayout}`);
          this.data.activeLayout = storedData.activeLayout;
        }
        
        if (storedData.settings) {
          console.log(`${MODULE_ID} | Preserving settings`);
          this.data.settings = foundry.utils.mergeObject(this.data.settings, storedData.settings);
        }
        
        if (storedData.slideshow) {
          console.log(`${MODULE_ID} | Preserving slideshow config`);
          this.data.slideshow = storedData.slideshow;
        }
        
      } else {
        console.log(`${MODULE_ID} | No stored data found, checking for legacy settings...`);
        await this._migrateLegacySettings();
      }
      
      // FIXED: Only ensure minimal data if absolutely nothing exists
      await this._ensureMinimalDataOnly();
      
      // CRITICAL: Set initialized flag BEFORE any save operations
      this.initialized = true;
      console.log(`${MODULE_ID} | Data storage initialization complete`);
      this.debugDataState();
      
      // Save if we made any changes during initialization
      const hasData = this.data.layouts && Object.keys(this.data.layouts).length > 0;
      if (!hasData) {
        console.log(`${MODULE_ID} | Saving initial data structure`);
        await this.save();
      } else {
        console.log(`${MODULE_ID} | Data structure complete, no save needed`);
      }
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error initializing data storage:`, error);
      this.initialized = true; // Set anyway to prevent loops
      await this._ensureMinimalDataOnly();
    }
  }
  
  /**
   * Migrate from legacy settings system (backward compatibility)
   * @private
   */
  async _migrateLegacySettings() {
    console.log(`${MODULE_ID} | Checking for legacy settings to migrate...`);
    
    let migrated = false;
    
    try {
      // Try to get legacy layouts
      const existingLayouts = game.settings.get(MODULE_ID, "layouts");
      if (existingLayouts && Object.keys(existingLayouts).length > 0) {
        console.log(`${MODULE_ID} | Migrating layouts from legacy settings`);
        this.data.layouts = existingLayouts;
        migrated = true;
      }
    } catch(e) {
      // No legacy layouts
    }
    
    try {
      // Try to get legacy active layout
      const existingActiveLayout = game.settings.get(MODULE_ID, "activeLayout");
      if (existingActiveLayout) {
        console.log(`${MODULE_ID} | Migrating active layout from legacy settings`);
        this.data.activeLayout = existingActiveLayout;
        migrated = true;
      }
    } catch(e) {
      // No legacy active layout
    }
    
    try {
      // Try to get legacy overlay windows
      const existingWindows = game.settings.get(MODULE_ID, "overlayWindows");
      if (existingWindows && Object.keys(existingWindows).length > 0) {
        console.log(`${MODULE_ID} | Migrating overlay windows from legacy settings`);
        this.data.overlayWindows = foundry.utils.mergeObject(this.data.overlayWindows, existingWindows);
        migrated = true;
      }
    } catch(e) {
      // No legacy windows
    }
    
    if (migrated) {
      console.log(`${MODULE_ID} | Legacy migration complete, saving data`);
      await this.save();
    }
  }
  
  /**
   * FIXED: Only creates data if absolutely nothing exists
   * @private
   */
  async _ensureMinimalDataOnly() {
    let needsBasicSetup = false;
    
    // Only create layouts if NONE exist
    if (!this.data.layouts || Object.keys(this.data.layouts).length === 0) {
      console.log(`${MODULE_ID} | No layouts found at all, creating Default`);
      this.data.layouts = { "Default": [] };
      needsBasicSetup = true;
    }
    
    // Only create windows if NONE exist  
    if (!this.data.overlayWindows || Object.keys(this.data.overlayWindows).length === 0) {
      console.log(`${MODULE_ID} | No windows found at all, creating main`);
      this.data.overlayWindows = {
        "main": {
          id: "main",
          name: "Main Overlay", 
          activeLayout: "Default",
          slideshowActive: false,
          width: 800,
          height: 600
        }
      };
      needsBasicSetup = true;
    }
    
    // Only set active layout if none exists
    if (!this.data.activeLayout) {
      console.log(`${MODULE_ID} | No active layout, setting to Default`);
      this.data.activeLayout = "Default";
      needsBasicSetup = true;
    }
    
    // Only set slideshow if none exists
    if (!this.data.slideshow) {
      console.log(`${MODULE_ID} | No slideshow config, creating default`);
      this.data.slideshow = {
        list: [],
        random: false,
        transition: "none", 
        transitionDuration: 0.5
      };
      needsBasicSetup = true;
    }
    
    // Only set settings if none exist
    if (!this.data.settings) {
      console.log(`${MODULE_ID} | No settings found, creating defaults`);
      this.data.settings = {
        isPremium: false,
        activationKey: "",
        backgroundColour: "#00ff00",
        enableTriggeredAnimations: true
      };
      needsBasicSetup = true;
    }
    
    if (needsBasicSetup) {
      console.log(`${MODULE_ID} | Created minimal required data structure`);
    } else {
      console.log(`${MODULE_ID} | All required data already exists`);
    }
  }
  
  /**
   * Debug function to check what data actually exists
   */
  debugDataState() {
    console.log(`${MODULE_ID} | === DATA STATE DEBUG ===`);
    console.log(`${MODULE_ID} | Initialized: ${this.initialized}`);
    console.log(`${MODULE_ID} | Layouts:`, this.data.layouts);
    console.log(`${MODULE_ID} | Active Layout: ${this.data.activeLayout}`);
    console.log(`${MODULE_ID} | Windows:`, this.data.overlayWindows);
    console.log(`${MODULE_ID} | Settings:`, this.data.settings);
    console.log(`${MODULE_ID} | =========================`);
    
    // Also check game settings
    try {
      const gameStoredData = game.settings.get(MODULE_ID, "storedUserData");
      console.log(`${MODULE_ID} | Game Settings Data:`, gameStoredData);
    } catch (error) {
      console.log(`${MODULE_ID} | Could not get game settings data:`, error);
    }
  }
  
  /**
   * Save all data to storage
   */
// Update the save method in data-storage.js to only allow GMs to save
async save() {
  // Only GMs can save world-scoped data
  if (!game.user.isGM) {
    console.log(`${MODULE_ID} | Non-GM user cannot save world-scoped data`);
    ui.notifications.warn("Only GMs can modify overlay settings");
    return false;
  }

  try {
    await game.settings.set(MODULE_ID, "storedUserData", this.data);
    console.log(`${MODULE_ID} | Saved user data to storage`);
    
    // Optional: trigger any update callbacks
    this._triggerCallbacks();
    
    return true;
  } catch (error) {
    console.error(`${MODULE_ID} | Error saving data:`, error);
    ui.notifications.error("Failed to save overlay data. Check console for details.");
    return false;
  }
}
  
  /**
   * Export all user data to a downloadable JSON file
   */
  exportToFile() {
    try {
      // Create a formatted JSON string
      const dataStr = JSON.stringify(this.data, null, 2);
      
      // Create a download link
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `foundry-stream-overlay-data.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      ui.notifications.info("Overlay data exported successfully!");
    } catch (error) {
      console.error(`${MODULE_ID} | Export error:`, error);
      ui.notifications.error("Failed to export overlay data.");
    }
  }
  
  /**
   * Import data from a JSON file
   * @param {File} file - The JSON file to import
   * @returns {Promise<boolean>} - Whether the import was successful
   */
  async importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const importedData = JSON.parse(event.target.result);
          
          // Validate the data structure
          if (!this._validateImportedData(importedData)) {
            ui.notifications.error("Invalid data format in imported file.");
            resolve(false);
            return;
          }
          
          // Merge imported data with default structure to ensure all required fields exist
          this.data = foundry.utils.mergeObject(this.data, importedData);
          
          // Save the imported data
          const saved = await this.save();
          
          if (saved) {
            ui.notifications.info("Overlay data imported successfully!");
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          console.error(`${MODULE_ID} | Import error:`, error);
          ui.notifications.error("Failed to import overlay data.");
          resolve(false);
        }
      };
      
      reader.onerror = () => {
        ui.notifications.error("Error reading the file.");
        resolve(false);
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Validate imported data structure
   * @param {Object} data - The imported data
   * @returns {boolean} - Whether the data is valid
   */
  _validateImportedData(data) {
    // Basic validation to ensure required sections exist
    const requiredSections = ['settings', 'layouts'];
    
    for (const section of requiredSections) {
      if (!data[section] || typeof data[section] !== 'object') {
        return false;
      }
    }
    
    // Layouts should have at least a Default layout
    if (!data.layouts.Default) {
      data.layouts.Default = [];
    }
    
    return true;
  }
  
  /**
   * Get a setting value
   * @param {string} key - The setting key
   * @param {*} defaultValue - The default value if setting not found
   * @returns {*} The setting value
   */
  getSetting(key, defaultValue = undefined) {
    return this.data.settings[key] !== undefined ? this.data.settings[key] : defaultValue;
  }
  
  /**
   * Set a setting value
   * @param {string} key - The setting key
   * @param {*} value - The value to set
   * @returns {Promise<boolean>} Whether the save was successful
   */
async setSetting(key, value) {
  if (!game.user.isGM) {
    console.log(`${MODULE_ID} | Non-GM user cannot modify settings`);
    ui.notifications.warn("Only GMs can modify overlay settings");
    return false;
  }
  
  this.data.settings[key] = value;
  return this.save();
}

  
  /**
   * Get all layouts
   * @returns {Object} The layouts object
   */
  getLayouts() {
    return this.data.layouts;
  }
  
  /**
   * Get a specific layout
   * @param {string} name - The layout name
   * @returns {Array|null} The layout items or null if not found
   */
  getLayout(name) {
    return this.data.layouts[name] || null;
  }
  
  /**
   * Set a layout
   * @param {string} name - The layout name
   * @param {Array} items - The layout items
   * @returns {Promise<boolean>} Whether the save was successful
   */
async setLayout(name, items) {
  if (!game.user.isGM) {
    console.log(`${MODULE_ID} | Non-GM user cannot modify layouts`);
    ui.notifications.warn("Only GMs can modify layouts");
    return false;
  }

  // First make sure layouts exists in this.data
  if (!this.data.layouts) {
    this.data.layouts = { "Default": [] };
  }
  
  // Now set the layout items
  this.data.layouts[name] = items;
  
  // Save to storage
  return this.save();
}
  
  /**
   * Delete a layout
   * @param {string} name - The layout name
   * @returns {Promise<boolean>} Whether the save was successful
   */
async deleteLayout(name) {
  if (!game.user.isGM) {
    console.log(`${MODULE_ID} | Non-GM user cannot delete layouts`);
    ui.notifications.warn("Only GMs can modify layouts");
    return false;
  }

  if (name === "Default") {
    ui.notifications.warn("Cannot delete the Default layout.");
    return false;
  }
  
  if (this.data.layouts[name]) {
    delete this.data.layouts[name];
    
    // If active layout was deleted, switch to Default
    if (this.data.activeLayout === name) {
      this.data.activeLayout = "Default";
    }
    
    // Update any windows using this layout
    for (const windowId in this.data.overlayWindows) {
      if (this.data.overlayWindows[windowId].activeLayout === name) {
        this.data.overlayWindows[windowId].activeLayout = "Default";
      }
    }
    
    return this.save();
  }
  
  return false;
}
  
  /**
   * Get the active layout name
   * @returns {string} The active layout name
   */
  getActiveLayout() {
    return this.data.activeLayout;
  }
  
  /**
   * Set the active layout
   * @param {string} name - The layout name
   * @returns {Promise<boolean>} Whether the save was successful
   */
async setActiveLayout(name) {
  if (!game.user.isGM) {
    console.log(`${MODULE_ID} | Non-GM user cannot change active layout`);
    ui.notifications.warn("Only GMs can modify overlay settings");
    return false;
  }

  // Ensure we have layouts object
  if (!this.data.layouts) {
    this.data.layouts = { "Default": [] };
  }
  
  // If the layout doesn't exist yet, create it
  if (!this.data.layouts[name]) {
    console.log(`${MODULE_ID} | Creating new layout: ${name}`);
    this.data.layouts[name] = [];
  }
  
  // Set as active
  this.data.activeLayout = name;
  return this.save();
}
  
  /**
   * Get overlay window configurations
   * @returns {Object} The overlay windows object
   */
  getOverlayWindows() {
    return this.data.overlayWindows;
  }
  
  /**
   * Get a specific overlay window configuration
   * @param {string} id - The window ID
   * @returns {Object|null} The window config or null if not found
   */
  getOverlayWindow(id) {
    return this.data.overlayWindows[id] || null;
  }

  /**
   * Migrate client data to world scope (legacy function, no longer needed)
   */
  async migrateClientToWorld() {
    // Only GMs can migrate data to world scope
    if (!game.user.isGM) return;
    
    try {
      // Check if there's client data that needs migration
      const clientData = await game.settings.get(MODULE_ID, "storedUserData");
      if (!clientData) return;
      
      // Check if world data already exists
      try {
        const worldData = await game.settings.get(MODULE_ID, "storedUserData");
        if (worldData && Object.keys(worldData).length > 0) {
          console.log(`${MODULE_ID} | World data already exists, skipping migration`);
          return;
        }
      } catch (error) {
        // World setting doesn't exist yet, safe to migrate
      }
      
      // Migrate the data
      console.log(`${MODULE_ID} | Migrating client data to world scope...`);
      await game.settings.set(MODULE_ID, "storedUserData", clientData);
      
      ui.notifications.info("Overlay data migrated to world scope - now shared with all users!");
      
    } catch (error) {
      console.error(`${MODULE_ID} | Migration error:`, error);
    }
  }

  /**
   * Set an overlay window configuration
   * @param {string} id - The window ID
   * @param {Object} config - The window configuration
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async setOverlayWindow(id, config) {
    this.data.overlayWindows[id] = config;
    return this.save();
  }
  
  /**
   * Delete an overlay window configuration
   * @param {string} id - The window ID
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async deleteOverlayWindow(id) {
    if (id === "main") {
      ui.notifications.warn("Cannot delete the main overlay window.");
      return false;
    }
    
    if (this.data.overlayWindows[id]) {
      delete this.data.overlayWindows[id];
      return this.save();
    }
    
    return false;
  }
  
  /**
   * Get slideshow configuration
   * @returns {Object} The slideshow configuration
   */
  getSlideshow() {
    return this.data.slideshow;
  }
  
  /**
   * Set slideshow configuration
   * @param {Object} config - The slideshow configuration
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async setSlideshow(config) {
    this.data.slideshow = config;
    return this.save();
  }
  
  /**
   * Create a backup of all data
   * @returns {Object} A copy of all data
   */
  createBackup() {
    return JSON.parse(JSON.stringify(this.data));
  }
  
  /**
   * Restore from a backup
   * @param {Object} backup - The backup data
   * @returns {Promise<boolean>} Whether the restore was successful
   */
  async restoreFromBackup(backup) {
    if (!this._validateImportedData(backup)) {
      ui.notifications.error("Invalid backup data format.");
      return false;
    }
    
    this.data = backup;
    return this.save();
  }
  
  // Private methods
  _triggerCallbacks() {
    // Could implement a system for callbacks when data changes
    // For example, updating windows when settings change
    Hooks.callAll(`${MODULE_ID}.dataUpdated`, this.data);
  }
}

// Create a single instance of the data storage
const OverlayData = new OverlayDataStorage();

// Add the storage setting to Foundry
Hooks.once("init", () => {
  // Register the primary data storage setting - WORLD SCOPED
  game.settings.register(MODULE_ID, "storedUserData", {
    name: "Stored User Data",
    scope: "world", // Changed from "client" to "world"
    config: false,
    type: Object,
    default: null
  });
});

// REMOVED: The duplicate initialization hook that was causing issues
// The initialization is now handled in module-init.js

// Export the data storage instance
export default OverlayData;