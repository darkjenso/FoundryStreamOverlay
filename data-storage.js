
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
    if (this.initialized) return;
    
    try {
      // Try to load data from the module's data file
      const storedData = await game.settings.get(MODULE_ID, "storedUserData");
      
      if (storedData) {
        this.data = mergeObject(this.data, storedData);
        console.log(`${MODULE_ID} | Loaded user data from storage`);
      } else {
        console.log(`${MODULE_ID} | No stored data found, using defaults`);
        
        // Initialize with any existing foundry settings for backward compatibility
        for (const key of Object.keys(this.data.settings)) {
          try {
            const existingValue = game.settings.get(MODULE_ID, key);
            if (existingValue !== undefined) {
              this.data.settings[key] = existingValue;
            }
          } catch(e) {
            // Setting doesn't exist yet, use default
          }
        }
        
        // Migrate layouts if they exist
        try {
          const existingLayouts = game.settings.get(MODULE_ID, "layouts");
          if (existingLayouts) {
            this.data.layouts = existingLayouts;
          }
        } catch(e) {
          // Layouts don't exist yet
        }
        
        // Store initial data
        await this.save();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error(`${MODULE_ID} | Error initializing data storage:`, error);
      ui.notifications.error("Failed to load overlay data. Check console for details.");
    }
  }
  
  /**
   * Save all data to storage
   */
  async save() {
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
          this.data = mergeObject(this.data, importedData);
          
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
    if (this.data.layouts[name]) {
      this.data.activeLayout = name;
      return this.save();
    }
    return false;
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
  // Register the primary data storage setting
  game.settings.register(MODULE_ID, "storedUserData", {
    name: "Stored User Data",
    scope: "client",
    config: false,
    type: Object,
    default: null
  });
  
  // Register module menu items
  game.settings.registerMenu(MODULE_ID, "dataManagement", {
    name: "Data Management",
    label: "Import/Export Data",
    icon: "fas fa-database",
    type: DataManagementDialog,
    restricted: false
  });
});

// Initialize data when Foundry is ready
Hooks.once("ready", async () => {
  await OverlayData.initialize();
});

/**
 * Dialog for importing/exporting data
 */
class DataManagementDialog extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Overlay Data Management",
      id: "foundrystreamoverlay-data-management",
      template: `modules/${MODULE_ID}/templates/data-management.html`,
      width: 500,
      height: "auto",
      closeOnSubmit: false
    });
  }
  
  getData() {
    return {
      hasData: true,
      lastSaved: new Date().toLocaleString()
    };
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    
    html.find("#export-data").click(() => {
      OverlayData.exportToFile();
    });
    
    html.find("#import-data").click(() => {
      const fileInput = html.find("#import-file")[0];
      fileInput.click();
    });
    
    html.find("#import-file").change(async (event) => {
      const file = event.target.files[0];
      if (file) {
        const confirmed = await Dialog.confirm({
          title: "Import Data",
          content: "This will replace all your current layouts and settings. Are you sure?",
          yes: () => true,
          no: () => false
        });
        
        if (confirmed) {
          const success = await OverlayData.importFromFile(file);
          if (success) {
            this.close();
            // Refresh any open windows
            for (const app of Object.values(ui.windows)) {
              app.render();
            }
          }
        }
        
        // Reset file input
        event.target.value = null;
      }
    });
  }
  
  async _updateObject() {
    // Form doesn't submit anything
  }
}

// Export the data storage instance
export default OverlayData;