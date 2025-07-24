// Bridge to communicate with standalone overlay app
import { MODULE_ID } from '../core/constants.js';
import OverlayData from '../../data-storage.js';

export class StandaloneBridge {
  constructor() {
    this.serverUrl = null;
    this.isConnected = false;
    this._initializeServerUrl();
  }

  async _initializeServerUrl() {
    try {
      this.serverUrl = game.settings.get(MODULE_ID, "standaloneServerUrl") || "http://localhost:8080";
    } catch (error) {
      this.serverUrl = "http://localhost:8080";
    }
  }

  async sendOverlayData(windowId = "main") {
    if (!this.serverUrl) {
      await this._initializeServerUrl();
    }

    try {
      const windows = OverlayData.getOverlayWindows();
      const windowConfig = windows[windowId] || windows.main;
      const layouts = OverlayData.getLayouts();
      const activeLayout = windowConfig.activeLayout || "Default";
      const layoutItems = layouts[activeLayout] || [];

      // Get processed overlay data (similar to what the module renders)
      const overlayData = {
        windowId,
        windowConfig,
        layoutName: activeLayout,
        items: layoutItems,
        settings: {
          backgroundColour: OverlayData.getSetting("backgroundColour") || "#00ff00",
          isPremium: OverlayData.getSetting("isPremium") || false
        },
        actors: this.getActorData(layoutItems),
        timestamp: Date.now()
      };

      const response = await fetch(`${this.serverUrl}/api/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(overlayData)
      });

      if (response.ok) {
        this.isConnected = true;
        console.log(`${MODULE_ID} | Sent data to standalone app for window ${windowId}`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.isConnected = false;
      console.warn(`${MODULE_ID} | Failed to send to standalone app:`, error.message);
      return false;
    }
  }

  getActorData(layoutItems) {
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
    
    return actors;
  }

  async testConnection() {
    if (!this.serverUrl) {
      await this._initializeServerUrl();
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/status`);
      this.isConnected = response.ok;
      return response.ok;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  updateServerUrl(url) {
    this.serverUrl = url;
  }
}

