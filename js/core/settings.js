// Settings registration for Foundry Stream Overlay - FIXED STANDALONE APP MENU
import { MODULE_ID } from './constants.js';
import { validateActivationKey } from '../premium/validation.js';

/**
 * Safely registers a setting, handling cases where user lacks permission
 */
function safeRegisterSetting(moduleId, key, options) {
  try {
    game.settings.register(moduleId, key, options);
  } catch (error) {
    if (error.message?.includes('permission') || error.message?.includes('world-scoped')) {
      console.warn(`${moduleId} | Cannot register setting ${key} - insufficient permissions or scope issue (this is normal for non-GM users)`);
    } else {
      console.error(`${moduleId} | Error registering setting ${key}:`, error);
      throw error;
    }
  }
}

// FIXED: Define StandaloneAppConfig class separately to avoid scoping issues
class StandaloneAppConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Standalone App Connection",
      template: `modules/${MODULE_ID}/templates/standalone-connection.html`,
      width: 500,
      height: "auto"
    });
  }
  
  async render(force = false, options = {}) {
    // FIXED: Import with better error handling
    try {
      const { isPremiumActive, showPremiumRequiredDialog } = await import('../premium/validation.js');
      
      if (!isPremiumActive()) {
        showPremiumRequiredDialog("Standalone App Integration");
        return null;
      }
      
      return super.render(force, options);
    } catch (error) {
      console.error(`${MODULE_ID} | Error loading premium validation:`, error);
      ui.notifications.error("Failed to load standalone app configuration");
      return null;
    }
  }
  
  async getData() {
    try {
      const { isPremiumActive } = await import('../premium/validation.js');
      if (!isPremiumActive()) {
        return { isPremium: false };
      }
      
      const isConnected = await this.testStandaloneConnection();
      return {
        serverUrl: game.settings.get(MODULE_ID, "standaloneServerUrl") || "http://localhost:8080",
        autoSync: game.settings.get(MODULE_ID, "autoSyncStandalone") || false,
        isConnected,
        isPremium: true
      };
    } catch (error) {
      console.error(`${MODULE_ID} | Error getting standalone app data:`, error);
      return { isPremium: false, error: error.message };
    }
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    
    html.find("#test-connection").click(async (event) => {
      event.preventDefault();
      const url = html.find("#server-url").val();
      await game.settings.set(MODULE_ID, "standaloneServerUrl", url);
      
      const connected = await this.testStandaloneConnection();
      ui.notifications.info(connected ? "Connected!" : "Connection failed");
      this.render();
    });
    
    html.find("#send-current").click(async (event) => {
      event.preventDefault();
      const success = await this.sendToStandalone();
      ui.notifications.info(success ? "Data sent successfully!" : "Failed to send data");
    });

    html.find("#force-sync-all").click(async (event) => {
      event.preventDefault();
      try {
        const { liveSync } = await import('../utils/live-sync.js');
        liveSync.queueSync("manual-sync-all");
        ui.notifications.info("Syncing all windows...");
      } catch (error) {
        const success = await this.sendToStandalone();
        ui.notifications.info(success ? "Manual sync completed!" : "Sync failed");
      }
    });
  }
  
  async _updateObject(event, formData) {
    await game.settings.set(MODULE_ID, "standaloneServerUrl", formData.serverUrl);
    await game.settings.set(MODULE_ID, "autoSyncStandalone", formData.autoSync);
    ui.notifications.info("Settings saved");
  }

  // FIXED: Move helper methods into the class
  async testStandaloneConnection() {
    const serverUrl = game.settings.get(MODULE_ID, "standaloneServerUrl") || "http://localhost:8080";
    
    try {
      const response = await fetch(`${serverUrl}/api/status`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async sendToStandalone(windowId = "main") {
    const serverUrl = game.settings.get(MODULE_ID, "standaloneServerUrl") || "http://localhost:8080";
    
    try {
      const OverlayData = (await import('../../data-storage.js')).default;
      const windows = OverlayData.getOverlayWindows();
      const windowConfig = windows[windowId] || windows.main;
      const layouts = OverlayData.getLayouts();
      const activeLayout = windowConfig.activeLayout || "Default";
      const layoutItems = layouts[activeLayout] || [];

      const actors = {};
      layoutItems.forEach(item => {
        if (item.type === "data" && item.actorId) {
          const actor = game.actors.get(item.actorId);
          if (actor && !actors[item.actorId]) {
            actors[item.actorId] = {
              id: actor.id,
              name: actor.name,
              system: actor.system
            };
          }
        }
      });

      const overlayData = {
        windowId,
        windowConfig,
        layoutName: activeLayout,
        items: layoutItems,
        settings: {
          backgroundColour: OverlayData.getSetting("backgroundColour") || "#00ff00",
          isPremium: OverlayData.getSetting("isPremium") || false
        },
        actors,
        timestamp: Date.now()
      };

      const response = await fetch(`${serverUrl}/api/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overlayData)
      });

      return response.ok;
    } catch (error) {
      console.warn(`${MODULE_ID} | Failed to send to standalone:`, error);
      return false;
    }
  }
}

/**
 * Registers all module settings
 */
export function registerSettings() {

  // WORLD-SCOPED SETTINGS: Shared across all users in the world

  // Background color setting
  safeRegisterSetting(MODULE_ID, "backgroundColour", {
    name: "Background Colour",
    hint: "Chroma key colour for the overlay background.",
    scope: "world",
    type: String,
    default: "#00ff00",
    config: true,
    onChange: (value) => {
      if (window.overlayWindow && !window.overlayWindow.closed) {
        window.overlayWindow.document.body.style.backgroundColor = value;
      }
    }
  });

  // Triggered animations setting
  safeRegisterSetting(MODULE_ID, "enableTriggeredAnimations", {
    name: "Enable Triggered Animations",
    hint: "Automatically play animations when HP changes, etc.",
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  // CLIENT-SCOPED SETTINGS: Individual user preferences

  // Standalone server URL
  safeRegisterSetting(MODULE_ID, "standaloneServerUrl", {
    name: "Standalone Server URL",
    hint: "URL of the standalone overlay server (e.g., http://localhost:8080)",
    scope: "client",
    config: false,
    type: String,
    default: "http://localhost:8080",
    onChange: async (value) => {
      try {
        const { liveSync } = await import('../utils/live-sync.js');
        liveSync.updateServerUrl(value);
      } catch (error) {
        // Live sync not available yet
      }
    }
  });

  // Auto-sync setting
  safeRegisterSetting(MODULE_ID, "autoSyncStandalone", {
    name: "Auto-sync with Standalone App",
    hint: "Automatically send overlay updates to the standalone app",
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
    onChange: async (value) => {
      try {
        const { liveSync } = await import('../utils/live-sync.js');
        if (value) {
          liveSync.enable();
        } else {
          liveSync.disable();
        }
      } catch (error) {
        // Live sync not available yet
      }
    }
  });

  // Premium activation key
  safeRegisterSetting(MODULE_ID, "activationKey", {
    name: "Premium Activation Key",
    hint: "Enter your key from Patreon to unlock premium features.",
    scope: "client",
    config: false,
    type: String,
    default: "",
    onChange: async value => {
      const OverlayData = (await import('../../data-storage.js')).default;
      if (OverlayData && OverlayData.initialized) {
        await OverlayData.setSetting("activationKey", value);
      }
      validateActivationKey(value);
    }
  });

  // Premium status
  safeRegisterSetting(MODULE_ID, "isPremium", {
    name: "Premium Status",
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: async value => {
      const OverlayData = (await import('../../data-storage.js')).default;
      if (OverlayData && OverlayData.initialized) {
        await OverlayData.setSetting("isPremium", value);
      }
    }
  });

  // Layouts storage - WORLD SCOPED (but will show as "Scenes" in UI)
  safeRegisterSetting(MODULE_ID, "layouts", {
    name: "Scenes", // Changed terminology
    hint: "Stores all overlay scenes. Each key is a scene name and its value is an array of overlay items.",
    scope: "world",
    type: Object,
    default: { "Default": [] },
    config: false,
    onChange: async () => {
      const { updateOverlayWindow } = await import('../overlay/window-management.js');
      updateOverlayWindow();
    }
  });

  // Active layout - WORLD SCOPED (but will show as "Active Scene" in UI)
  safeRegisterSetting(MODULE_ID, "activeLayout", {
    name: "Active Scene", // Changed terminology
    hint: "The scene that is currently in use.",
    scope: "world",
    type: String,
    default: "Default",
    config: false,
    onChange: async () => {
      const { updateOverlayWindow } = await import('../overlay/window-management.js');
      updateOverlayWindow();
    }
  });

  // Overlay windows configuration - WORLD SCOPED
  safeRegisterSetting(MODULE_ID, "overlayWindows", {
    name: "Overlay Displays", // Changed terminology
    hint: "Configurations for multiple overlay displays",
    scope: "world",
    config: false,
    type: Object,
    default: {
      "main": { 
        id: "main", 
        name: "Main Overlay",
        activeLayout: "Default",
        slideshowActive: false
      }
    }
  });

  // Slideshow configuration - WORLD SCOPED
  safeRegisterSetting(MODULE_ID, "slideshow", {
    name: "Slideshow Configuration",
    hint: "Stores the ordered list of scenes with durations for the slideshow.",
    scope: "world",
    type: Object,
    default: { 
      list: [], 
      random: false,
      transition: "none",
      transitionDuration: 0.5
    },
    config: false
  });
}

/**
 * FIXED: Registers consolidated menu structure with proper class definitions
 */
export function registerMenus() {

  // =================================
  // 🚀 QUICK START SECTION
  // =================================

  // Primary action - Open overlay
  game.settings.registerMenu(MODULE_ID, "openOverlay", {
    name: "🚀 Open Overlay",
    label: "Open Overlay",
    hint: "Open the overlay in a pop-up window for streaming",
    icon: "fas fa-external-link-alt",
    type: class extends FormApplication {
      static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
          title: "Open Overlay",
          template: `modules/${MODULE_ID}/templates/open-overlay-window.html`,
          width: 400
        });
      }
      
      async render(force = false, options = {}) {
        const { OverlayWindowOpener } = await import('../ui/window-opener.js');
        const openerInstance = new OverlayWindowOpener();
        return openerInstance.render(true);
      }
      
      getData() { return {}; }
      activateListeners() {}
      async _updateObject() {}
    },
    restricted: false
  });

  // =================================
  // 📺 OVERLAY SCENES SECTION
  // =================================

  // Main configuration
  game.settings.registerMenu(MODULE_ID, "editCurrentScene", {
    name: "📺 Edit Current Scene",
    label: "Edit Scene",
    hint: "Configure what appears in your overlay",
    icon: "fas fa-edit",
    type: class extends FormApplication {
      static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
          title: "Edit Scene",
          template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-config.html`,
          width: 800,
          height: "auto",
          closeOnSubmit: false
        });
      }
      
      async render(force = false, options = {}) {
        const { OverlayConfig } = await import('../ui/overlay-config.js');
        const configInstance = new OverlayConfig();
        return configInstance.render(true);
      }
      
      getData() { return {}; }
      activateListeners() {}
      async _updateObject() {}
    },
    restricted: false
  });

  // Scene management (Premium check handled inside)
  game.settings.registerMenu(MODULE_ID, "manageScenes", {
    name: "🎬 Manage Scenes",
    label: "Manage Scenes",
    hint: "Create, rename, and organize multiple overlay scenes",
    icon: "fas fa-layer-group",
    type: class extends FormApplication {
      static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
          title: "Manage Scenes",
          template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-layouts.html`,
          width: 600
        });
      }
      
      async render(force = false, options = {}) {
        const { ManageLayouts } = await import('../ui/layout-manager.js');
        const managerInstance = new ManageLayouts();
        return managerInstance.render(true);
      }
      
      getData() { return {}; }
      activateListeners() {}
      async _updateObject() {}
    },
    restricted: false
  });

  // =================================
  // 🔧 ADVANCED SECTION
  // =================================

  // Multiple displays (Premium feature)
  game.settings.registerMenu(MODULE_ID, "multipleDisplays", {
    name: "🔧 Multiple Displays",
    label: "Multiple Displays",
    hint: "Create and manage multiple overlay windows (Premium)",
    icon: "fas fa-desktop",
    type: class extends FormApplication {
      static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
          title: "Multiple Displays",
          template: `modules/${MODULE_ID}/templates/window-manager.html`,
          width: 600
        });
      }
      
      async render(force = false, options = {}) {
        const { OverlayWindowManager } = await import('../ui/window-manager.js');
        const managerInstance = new OverlayWindowManager();
        return managerInstance.render(true);
      }
      
      getData() { return {}; }
      activateListeners() {}
      async _updateObject() {}
    },
    restricted: false
  });

  // Slideshow (Premium feature)
  game.settings.registerMenu(MODULE_ID, "slideshow", {
    name: "🎠 Slideshow",
    label: "Slideshow",
    hint: "Auto-rotate through scenes with transitions (Premium)",
    icon: "fas fa-play",
    type: class extends FormApplication {
      static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
          title: "Slideshow",
          template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-slideshow.html`,
          width: 600
        });
      }
      
      async render(force = false, options = {}) {
        const { SlideshowConfig } = await import('../ui/slideshow-config.js');
        const configInstance = new SlideshowConfig();
        return configInstance.render(true);
      }
      
      getData() { return {}; }
      activateListeners() {}
      async _updateObject() {}
    },
    restricted: false
  });

  // Data backup/management
  game.settings.registerMenu(MODULE_ID, "dataBackup", {
    name: "💾 Data Backup",
    label: "Import/Export",
    hint: "Backup or restore your overlay configurations",
    icon: "fas fa-database",
    type: DataManagementDialog,
    restricted: false
  });

// PRODUCTION VERSION - Replace your standaloneApp menu registration with this:

// Replace the existing standaloneApp menu registration with this version

game.settings.registerMenu(MODULE_ID, "standaloneApp", {
  name: "🔗 Standalone App",
  label: "Standalone App",
  hint: "Connect to standalone overlay application (Coming Soon)",
  icon: "fas fa-server",
  type: class StandaloneAppDialog extends FormApplication {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        title: "Standalone App Connection",
        id: "standalone-app-dialog",
        width: 500,
        height: "auto",
        closeOnSubmit: false,
        resizable: true,
        classes: ["foundry-stream-overlay"]
      });
    }
    
    // Use inline template instead of external file
    get template() {
      return null; // Forces _renderInner to be used
    }
    
    async _renderInner(data) {
      // TEMPORARY: Always show "coming soon" message regardless of premium status
      return $(`
        <form style="padding: 0;">
          <div class="coming-soon-container" style="text-align: center; padding: 40px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);">
            <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;">
              🚧
            </div>
            <h2 style="color: #1e293b; margin-bottom: 15px; font-size: 24px;">Standalone App - Coming Soon!</h2>
            <p style="color: #64748b; margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
              We're working hard on an exciting standalone overlay application that will provide enhanced features and better performance.
            </p>
            
            <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: left;">
              <h3 style="color: #1e293b; margin-bottom: 15px; text-align: center;">🚀 Planned Features</h3>
              <ul style="color: #475569; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Enhanced Performance:</strong> Dedicated app for smoother overlay rendering</li>
                <li><strong>Live Sync:</strong> Real-time updates between Foundry and your streaming software</li>
                <li><strong>Advanced Customization:</strong> More themes, effects, and layout options</li>
                <li><strong>Multi-Stream Support:</strong> Manage multiple overlay windows simultaneously</li>
                <li><strong>Browser Source Integration:</strong> Easy setup with OBS and other streaming tools</li>
                <li><strong>Offline Mode:</strong> Continue using overlays even when Foundry is closed</li>
              </ul>
            </div>
            
            <div style="background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%); border-radius: 8px; padding: 16px; margin: 20px 0;">
              <h4 style="color: #0369a1; margin-bottom: 8px;">💡 In the meantime...</h4>
              <p style="color: #0369a1; margin: 0; font-size: 14px;">
                Continue using the current overlay system which already supports animations, multiple layouts, and slideshow functionality!
              </p>
            </div>
            
            <div style="margin-top: 30px;">
              <p style="color: #64748b; font-size: 14px; margin-bottom: 15px;">
                Want to be notified when it's ready?
              </p>
              <a href="https://www.patreon.com/c/jenzelta" target="_blank" 
                 style="display: inline-block; background: linear-gradient(135deg, #FF424D 0%, #C53030 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 12px rgba(255,66,77,0.3); transition: transform 0.2s;">
                <i class="fab fa-patreon"></i> Follow Development on Patreon
              </a>
            </div>
            
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; font-style: italic;">
                Expected release: Q2 2025 • Premium feature for supporters
              </p>
            </div>
          </div>
        </form>
      `);
    }
    
    async getData() {
      return {};
    }
    
    activateListeners(html) {
      super.activateListeners(html);
      
      // Handle premium upgrade link clicks
      html.find('a[href*="patreon"]').click((event) => {
        event.preventDefault();
        window.open("https://www.patreon.com/c/jenzelta", "_blank");
      });
    }
    
    async _updateObject(event, formData) {
      // No form submission needed for coming soon page
    }
  },
  restricted: false
});

  // =================================
  // 💎 PREMIUM SECTION
  // =================================

  // Premium status and activation
  game.settings.registerMenu(MODULE_ID, "premiumStatus", {
    name: "💎 Premium Features",
    label: "Premium",
    hint: "Unlock advanced features with premium activation",
    icon: "fas fa-gem",
    type: class extends FormApplication {
      static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
          title: "Premium Features",
          template: `modules/${MODULE_ID}/templates/premium-status.html`,
          width: 400
        });
      }
      
      async render(force = false, options = {}) {
        const { PremiumStatusDialog } = await import('../ui/premium-status.js');
        const dialogInstance = new PremiumStatusDialog();
        return dialogInstance.render(true);
      }
      
      getData() { return {}; }
      activateListeners() {}
      async _updateObject() {}
    },
    restricted: false
  });
}

/**
 * Data Management Dialog class
 */
class DataManagementDialog extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Data Backup & Restore",
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
    
    html.find("#export-data").click(async () => {
      const OverlayData = (await import('../../data-storage.js')).default;
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
          content: "This will replace all your current scenes and settings. Are you sure?",
          yes: () => true,
          no: () => false
        });
        
        if (confirmed) {
          const OverlayData = (await import('../../data-storage.js')).default;
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