// Settings registration for Foundry Stream Overlay - FIXED NO GLOBAL ACTIVE LAYOUT
import { MODULE_ID } from './constants.js';
import { isPremiumActive, showPremiumRequiredDialog } from '../premium/validation.js';
import { getBaseApplication } from '../utils/app-compat.js';

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

// Define StandaloneAppConfig class separately to avoid scoping issues
class StandaloneAppConfig extends getBaseApplication() {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
      title: "Standalone App Connection",
      template: `modules/${MODULE_ID}/templates/standalone-connection.html`,
      width: 500,
      height: "auto"
    });
  }

  static DEFAULT_OPTIONS = {
    id: "foundrystreamoverlay-standalone-config",
    window: { title: "Standalone App Connection" },
    position: { width: 500 }
  };

  static get PARTS() {
    return { main: { template: `modules/${MODULE_ID}/templates/standalone-connection.html` } };
  }

  async _prepareContext() { return this.getData(); }
  
  async render(force = false, options = {}) {
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
    super.activateListeners?.(html);

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

  _onRender(context, options) {
    this.activateListeners($(this.element));
  }

  async _updateObject(event, formData) {
    await game.settings.set(MODULE_ID, "standaloneServerUrl", formData.serverUrl);
    await game.settings.set(MODULE_ID, "autoSyncStandalone", formData.autoSync);
    ui.notifications.info("Settings saved");
  }

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
      if (window.overlayWindows) {
        for (const [windowId, overlayWindow] of Object.entries(window.overlayWindows)) {
          if (overlayWindow && !overlayWindow.closed && overlayWindow.document && overlayWindow.document.body) {
            overlayWindow.document.body.style.backgroundColor = value;
          }
        }
      }
    }
  });

  // ── Stream page settings ─────────────────────────────────────────────────

  safeRegisterSetting(MODULE_ID, "streamOverlayEnabled", {
    name: "Show Overlay on /stream",
    hint: "Render the overlay directly on the built-in Foundry /stream page — no popup window or OBS Browser Source required. Just point OBS at [your-foundry-url]/stream.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Build a dropdown from whichever overlay windows are already stored.
  // Falls back to just "main" on a fresh install.
  let _streamWindowChoices = { "main": "Main Overlay (main)" };
  try {
    const _existingWindows = game.settings.get(MODULE_ID, "overlayWindows") || {};
    if (Object.keys(_existingWindows).length > 0) {
      _streamWindowChoices = {};
      for (const [_id, _cfg] of Object.entries(_existingWindows)) {
        _streamWindowChoices[_id] = `${_cfg.name || _id} (${_id})`;
      }
    }
  } catch (_e) { /* use default */ }

  safeRegisterSetting(MODULE_ID, "streamWindowId", {
    name: "Overlay Window on /stream",
    hint: "Which overlay window's items to display on the /stream page. If you add more windows later, reload Foundry to refresh this list.",
    scope: "world",
    config: true,
    type: String,
    choices: _streamWindowChoices,
    default: Object.keys(_streamWindowChoices)[0] || "main"
  });

  safeRegisterSetting(MODULE_ID, "streamHideChat", {
    name: "Hide Chat Cards on /stream",
    hint: "Hide the chat message cards on the /stream page so only the overlay and game canvas are visible.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  safeRegisterSetting(MODULE_ID, "streamHideSidebar", {
    name: "Hide Entire Sidebar on /stream",
    hint: "Hide the full sidebar panel on /stream (chat, combat tracker, etc.) for a completely clean canvas view.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // ─────────────────────────────────────────────────────────────────────────

  // One-time announcement flag (client-scoped so each user sees it once)
  safeRegisterSetting(MODULE_ID, "splitAnnouncementSeen", {
    name: "Split Announcement Seen",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
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


  // Layouts storage - WORLD SCOPED (scenes)
  safeRegisterSetting(MODULE_ID, "layouts", {
    name: "Scenes",
    hint: "Stores all overlay scenes. Each key is a scene name and its value is an array of overlay items.",
    scope: "world",
    type: Object,
    default: { "Default": [] },
    config: false,
    onChange: async () => {
      const { updateOverlayWindow } = await import('../overlay/window-management.js');
      
      // Update all open windows
      if (window.overlayWindow && !window.overlayWindow.closed) {
        updateOverlayWindow("main");
      }
      if (window.overlayWindows) {
        for (const windowId of Object.keys(window.overlayWindows)) {
          if (window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
            updateOverlayWindow(windowId);
          }
        }
      }
    }
  });

  // REMOVED: Global activeLayout setting - each window now manages its own layout

  // Overlay windows configuration - WORLD SCOPED
  safeRegisterSetting(MODULE_ID, "overlayWindows", {
    name: "Overlay Displays",
    hint: "Configurations for multiple overlay displays",
    scope: "world",
    config: false,
    type: Object,
    default: {
      "main": { 
        id: "main", 
        name: "Main Overlay",
        activeLayout: "Default",
        slideshowActive: false,
        width: 800,
        height: 600
      }
    },
    onChange: async () => {
      const { updateOverlayWindow } = await import('../overlay/window-management.js');
      
      // Update all open windows
      if (window.overlayWindow && !window.overlayWindow.closed) {
        updateOverlayWindow("main");
      }
      if (window.overlayWindows) {
        for (const windowId of Object.keys(window.overlayWindows)) {
          if (window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
            updateOverlayWindow(windowId);
          }
        }
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
      transitionDuration: 0.5,
      targetWindow: "main"
    },
    config: false
  });
}

/**
 * Registers consolidated menu structure with proper class definitions
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
        return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
          id: "foundrystreamoverlay-open-overlay-stub",
          title: "Open Overlay",
          template: `modules/${MODULE_ID}/templates/open-overlay-window.html`,
          width: 400
        });
      }
      render(force = false, options = {}) {
        import('../ui/window-opener.js')
          .then(({ OverlayWindowOpener }) => {
            const existing = Object.values(ui.windows || {})
              .find(w => w.options?.id === "foundrystreamoverlay-window-opener");
            if (existing) { existing.bringToTop?.(); }
            else { new OverlayWindowOpener().render(true); }
          })
          .catch(err => { console.error(`${MODULE_ID} | Failed to open Overlay:`, err); });
        return this;
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
        return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
          id: "foundrystreamoverlay-edit-scene-stub",
          title: "Edit Scene",
          template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-config.html`,
          width: 800,
          height: "auto",
          closeOnSubmit: false
        });
      }

      render(force = false, options = {}) {
        import('../ui/overlay-config.js')
          .then(({ OverlayConfig }) => {
            const existing = Object.values(ui.windows || {})
              .find(w => w.options?.id === "foundrystreamoverlay-config");
            if (existing) {
              existing.bringToTop?.();
            } else {
              new OverlayConfig({ windowId: "main" }).render(true);
            }
          })
          .catch(err => {
            console.error(`${MODULE_ID} | Failed to open Edit Scene:`, err);
            ui.notifications?.error("Failed to open Edit Scene — check the browser console for details.");
          });
        return this;
      }

      getData() { return {}; }
      activateListeners() {}
      async _updateObject() {}
    },
    restricted: false
  });

  // Scene management
  game.settings.registerMenu(MODULE_ID, "manageScenes", {
    name: "🎬 Manage Scenes",
    label: "Manage Scenes",
    hint: "Create, rename, and organize multiple overlay scenes",
    icon: "fas fa-layer-group",
    type: class extends FormApplication {
      static get defaultOptions() {
        // Use ?? {} so this is safe on both v13 (FormApplication.defaultOptions
        // exists) and v14 (deprecated, may return undefined).
        return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
          id: "foundrystreamoverlay-manage-scenes-stub",
          title: "Manage Scenes",
          template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-layouts.html`,
          width: 600
        });
      }

      // Synchronous render — kick off the async import in the background and
      // return `this` immediately so Foundry doesn't choke on a Promise.
      render(force = false, options = {}) {
        import('../ui/layout-manager.js')
          .then(({ ManageLayouts }) => {
            // Bring existing window to front if already open
            const existing = Object.values(ui.windows || {})
              .find(w => w.options?.id === "foundrystreamoverlay-manage-layouts");
            if (existing) {
              existing.bringToTop?.();
            } else {
              new ManageLayouts().render(true);
            }
          })
          .catch(err => {
            console.error(`${MODULE_ID} | Failed to open Manage Scenes:`, err);
            ui.notifications?.error("Failed to open Manage Scenes — check the browser console for details.");
          });
        return this;
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
    name: isPremiumActive() ? "🔧 Multiple Displays" : "🔧 Multiple Displays [Pro]",
    label: "Multiple Displays",
    hint: isPremiumActive()
      ? "Create and manage multiple overlay windows"
      : "Create and manage multiple overlay windows — Pro feature",
    icon: "fas fa-desktop",
    type: class extends FormApplication {
      static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
          id: "foundrystreamoverlay-multiple-displays-stub",
          title: "Multiple Displays",
          template: `modules/${MODULE_ID}/templates/window-manager.html`,
          width: 600
        });
      }
      render(force = false, options = {}) {
        if (!isPremiumActive()) {
          showPremiumRequiredDialog("Multiple Displays");
          return this;
        }
        import('../ui/window-manager.js')
          .then(({ OverlayWindowManager }) => {
            const existing = Object.values(ui.windows || {})
              .find(w => w.options?.id === "foundrystreamoverlay-window-manager");
            if (existing) { existing.bringToTop?.(); }
            else { new OverlayWindowManager().render(true); }
          })
          .catch(err => { console.error(`${MODULE_ID} | Failed to open Multiple Displays:`, err); });
        return this;
      }
      getData() { return {}; }
      activateListeners() {}
      async _updateObject() {}
    },
    restricted: false
  });

  // Slideshow (Premium feature)
  game.settings.registerMenu(MODULE_ID, "slideshow", {
    name: isPremiumActive() ? "🎠 Slideshow" : "🎠 Slideshow [Pro]",
    label: "Slideshow",
    hint: isPremiumActive()
      ? "Auto-rotate through scenes with transitions"
      : "Auto-rotate through scenes with transitions — Pro feature",
    icon: "fas fa-play",
    type: class extends FormApplication {
      static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
          id: "foundrystreamoverlay-slideshow-stub",
          title: "Slideshow",
          template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-slideshow.html`,
          width: 600
        });
      }
      render(force = false, options = {}) {
        if (!isPremiumActive()) {
          showPremiumRequiredDialog("Slideshow");
          return this;
        }
        import('../ui/slideshow-config.js')
          .then(({ SlideshowConfig }) => {
            const existing = Object.values(ui.windows || {})
              .find(w => w.options?.id === "foundrystreamoverlay-slideshow");
            if (existing) { existing.bringToTop?.(); }
            else { new SlideshowConfig().render(true); }
          })
          .catch(err => { console.error(`${MODULE_ID} | Failed to open Slideshow:`, err); });
        return this;
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

  // Standalone app
  game.settings.registerMenu(MODULE_ID, "standaloneApp", {
    name: "🔗 Standalone App",
    label: "Standalone App",
    hint: "Connect to standalone overlay application",
    icon: "fas fa-server",
    type: StandaloneAppConfig,
    restricted: false
  });

  // ── "Get Pro" banner — only shown in the free version ────────────────────
  if (!isPremiumActive()) {
    game.settings.registerMenu(MODULE_ID, "getPro", {
      name: "🚀 Upgrade to Foundry Stream Overlay Pro",
      label: "Get Pro",
      hint: "Unlock unlimited scenes, advanced animations, slideshow, multiple windows, and no watermark. Available on Patreon.",
      icon: "fab fa-patreon",
      type: class extends FormApplication {
        static get defaultOptions() {
          return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
            id: "foundrystreamoverlay-get-pro-stub",
            title: "Get Pro",
            template: `modules/${MODULE_ID}/templates/open-overlay-window.html`,
            width: 300
          });
        }
        render() {
          window.open("https://www.patreon.com/c/jenzelta", "_blank");
          return this;
        }
        getData() { return {}; }
        activateListeners() {}
        async _updateObject() {}
      },
      restricted: false
    });
  }

}

/**
 * Data Management Dialog class
 */
class DataManagementDialog extends getBaseApplication() {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
      title: "Data Backup & Restore",
      id: "foundrystreamoverlay-data-management",
      template: `modules/${MODULE_ID}/templates/data-management.html`,
      width: 500,
      height: "auto",
      closeOnSubmit: false
    });
  }

  static DEFAULT_OPTIONS = {
    id: "foundrystreamoverlay-data-management",
    window: { title: "Data Backup & Restore" },
    position: { width: 500 }
  };

  static get PARTS() {
    return { main: { template: `modules/${MODULE_ID}/templates/data-management.html` } };
  }

  async _prepareContext() { return this.getData(); }
  
  getData() {
    return {
      hasData: true,
      lastSaved: new Date().toLocaleString()
    };
  }
  
  activateListeners(html) {
    super.activateListeners?.(html);

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
  
  _onRender(context, options) {
    this.activateListeners($(this.element));
  }

  async _updateObject() {
    // Form doesn't submit anything
  }
}