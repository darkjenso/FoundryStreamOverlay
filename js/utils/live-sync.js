// Live synchronization with standalone app - FIXED VERSION
import { MODULE_ID } from '../core/constants.js';
import OverlayData from '../../data-storage.js';

class LiveSync {
  constructor() {
    this.isEnabled = false;
    this.serverUrl = "http://localhost:8080";
    this.lastSyncTime = 0;
    this.syncQueue = new Set();
    // Don't call init() in constructor
  }

  async init() {
    try {
      // Wait for game to be ready
      if (!game || !game.settings) {
        console.warn(`${MODULE_ID} | Game not ready for LiveSync initialization`);
        return;
      }

      const { isPremiumActive } = await import('../premium/validation.js');
      
      this.isEnabled = game.settings.get(MODULE_ID, "autoSyncStandalone") || false;
      this.serverUrl = game.settings.get(MODULE_ID, "standaloneServerUrl") || "http://localhost:8080";
      
      // Only enable if premium
      if (this.isEnabled && isPremiumActive()) {
        this.setupHooks();
        console.log(`${MODULE_ID} | Live sync enabled (Premium)`);
      } else if (this.isEnabled && !isPremiumActive()) {
        console.log(`${MODULE_ID} | Live sync requires premium features`);
        this.isEnabled = false;
      }
    } catch (error) {
      console.error(`${MODULE_ID} | Error initializing LiveSync:`, error);
    }
  }

  setupHooks() {
    // Actor updates (HP changes, etc.)
    Hooks.on("updateActor", (actor, update, options, userId) => {
      this.queueSync("actor-update", actor.id);
    });

    // Token updates (might affect displayed data)
    Hooks.on("updateToken", (token, update, options, userId) => {
      if (token.actor) {
        this.queueSync("token-update", token.actor.id);
      }
    });

    // When overlay windows are updated
    Hooks.on(`${MODULE_ID}.dataUpdated`, () => {
      this.queueSync("data-updated");
    });

    // When settings change
    Hooks.on("updateSetting", (setting) => {
      if (setting.key.startsWith(MODULE_ID)) {
        this.queueSync("settings-updated");
      }
    });
  }

  queueSync(reason, actorId = null) {
    // Check premium status
    import('../premium/validation.js').then(({ isPremiumActive }) => {
      if (!isPremiumActive()) {
        console.log(`${MODULE_ID} | Standalone sync requires premium`);
        return;
      }
      
      if (!this.isEnabled) return;

      const syncKey = `${reason}-${actorId || 'global'}`;
      this.syncQueue.add(syncKey);

      clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => {
        this.processSyncQueue();
      }, 100);
    });
  }

  async processSyncQueue() {
    if (this.syncQueue.size === 0) return;

    console.log(`${MODULE_ID} | Processing ${this.syncQueue.size} sync updates`);
    this.syncQueue.clear();

    // Send all windows
    const windows = OverlayData.getOverlayWindows();
    for (const windowId of Object.keys(windows)) {
      await this.sendOverlayData(windowId);
    }
  }

  async sendOverlayData(windowId = "main") {
    try {
      const windows = OverlayData.getOverlayWindows();
      const windowConfig = windows[windowId] || windows.main;
      const layouts = OverlayData.getLayouts();
      const activeLayout = windowConfig.activeLayout || "Default";
      const layoutItems = layouts[activeLayout] || [];

      // Get fresh actor data
      const actors = {};
      layoutItems.forEach(item => {
        if (item.type === "data" && item.actorId) {
          const actor = game.actors.get(item.actorId);
          if (actor && !actors[item.actorId]) {
            actors[item.actorId] = {
              id: actor.id,
              name: actor.name,
              system: actor.system,
              // Add commonly accessed derived data
              currentHP: actor.system?.attributes?.hp?.value,
              maxHP: actor.system?.attributes?.hp?.max,
              ac: actor.system?.attributes?.ac?.value,
              level: actor.system?.details?.level
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

      const response = await fetch(`${this.serverUrl}/api/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overlayData)
      });

      if (response.ok) {
        this.lastSyncTime = Date.now();
        return true;
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | Live sync failed:`, error.message);
    }
    return false;
  }

  enable() {
    this.isEnabled = true;
    this.setupHooks();
    this.queueSync("enabled");
  }

  disable() {
    this.isEnabled = false;
  }

  updateServerUrl(url) {
    this.serverUrl = url;
  }
}

// Export singleton instance
export const liveSync = new LiveSync();