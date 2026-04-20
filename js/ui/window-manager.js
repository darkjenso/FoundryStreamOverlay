// Window Manager UI Component - FIXED VERSION
import { MODULE_ID } from '../core/constants.js';
import { canCreateWindow, isPremiumActive, showPremiumRequiredDialog } from '../premium/validation.js';
import { generateUniqueId } from '../utils/helpers.js';
import { openOverlayWindow } from '../overlay/window-management.js';
import { OverlayWindowConfig } from './window-config.js';
import OverlayData from '../../data-storage.js';
import { getBaseApplication } from '../utils/app-compat.js';

export class OverlayWindowManager extends getBaseApplication() {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
      title: "Manage Overlay Windows",
      id: "foundrystreamoverlay-window-manager",
      template: `modules/${MODULE_ID}/templates/window-manager.html`,
      width: 600,
      height: "auto",
      closeOnSubmit: false
    });
  }

  static DEFAULT_OPTIONS = {
    id: "foundrystreamoverlay-window-manager",
    window: { title: "Manage Overlay Windows" },
    position: { width: 600 }
  };

  static get PARTS() {
    return { main: { template: `modules/${MODULE_ID}/templates/window-manager.html` } };
  }

  getData() {
    // Always get fresh data from OverlayData
    const windows = OverlayData.getOverlayWindows() || {
      "main": {
        id: "main",
        name: "Main Overlay",
        activeLayout: "Default"
      }
    };

    // Get premium status
    const isPremium = isPremiumActive();

    return {
      windows,
      isPremium
    };
  }

  async _prepareContext() { return this.getData(); }

  activateListeners(html) {
    super.activateListeners?.(html);
    html.find(".create-new-window").click(this._onCreateWindow.bind(this));
    html.find(".open-window").click(this._onOpenWindow.bind(this));
    html.find(".configure-window").click(this._onConfigureWindow.bind(this));
    html.find(".remove-window").click(this._onRemoveWindow.bind(this));
    html.find(".copy-obs-url").click(this._onCopyObsUrl.bind(this));
  }

  _onRender(context, options) {
    this.activateListeners($(this.element));
  }
  
  async _onCreateWindow(event) {
    event.preventDefault();
    
    const windows = OverlayData.getOverlayWindows() || {};
    
    if (!canCreateWindow(windows)) {
      return;
    }
    
    // Prompt for window name
    const windowName = await Dialog.prompt({
      title: "New Overlay Window",
      content: `<p>Enter a name for the new overlay window:</p>
                <input type="text" name="windowName" value="New Overlay" data-dtype="String">`,
      callback: html => html.find('input[name="windowName"]').val()
    });
    
    if (!windowName) return;
    
    // Generate a unique window ID
    const windowId = generateUniqueId();
    
    // Create new window config
    const newWindowConfig = {
      id: windowId,
      name: windowName,
      activeLayout: "Default",
      slideshowActive: false,
      width: 800,
      height: 600
    };
    
    // Save the new window configuration
    await OverlayData.setOverlayWindow(windowId, newWindowConfig);
    
    ui.notifications.info(`Created new overlay window: ${windowName}`);
    
    // Refresh the window manager
    this.render(true);
  }
  
  async _onOpenWindow(event) {
    event.preventDefault();
    try {
      const windowId = event.currentTarget.dataset.window;
      console.log(`Opening window: ${windowId}`);
      openOverlayWindow(windowId);
      ui.notifications.info(`Overlay window opened: ${windowId}`);
    } catch (error) {
      console.error("Error opening window:", error);
      ui.notifications.error("Failed to open overlay window. Check console for details.");
    }
  }
  
  async _onConfigureWindow(event) {
    event.preventDefault();
    try {
      const windowId = event.currentTarget.dataset.window;
      console.log(`Opening config for window: ${windowId}`);
      
      // Make sure the window exists in storage first
      const windows = OverlayData.getOverlayWindows();
      if (!windows[windowId]) {
        console.log(`Window ${windowId} not found, creating default config`);
        
        // Create a default config
        const defaultConfig = {
          id: windowId,
          name: `Window ${windowId}`,
          activeLayout: "Default",
          slideshowActive: false,
          width: 800,
          height: 600
        };
        
        await OverlayData.setOverlayWindow(windowId, defaultConfig);
      }
      
      // Open the config dialog
      new OverlayWindowConfig(windowId).render(true);
    } catch (error) {
      console.error("Error configuring window:", error);
      ui.notifications.error("There was an error opening the window configuration.");
    }
  }
  
  _onCopyObsUrl(event) {
    event.preventDefault();
    const windowId = event.currentTarget.dataset.window;
    const port = location.port || (location.protocol === "https:" ? "443" : "80");
    const url = `${location.protocol}//${location.hostname}:${port}/modules/${MODULE_ID}/obs-overlay.html?windowId=${windowId}`;
    navigator.clipboard.writeText(url).then(() => {
      ui.notifications.info(`OBS URL copied! In OBS: Browser Source → paste URL → enable "Allow transparency"`);
    }).catch(() => {
      ui.notifications.warn(`OBS URL: ${url}`);
    });
  }

  async _onRemoveWindow(event) {
    event.preventDefault();
    const windowId = event.currentTarget.dataset.window;
    
    if (windowId === "main") {
      ui.notifications.warn("Cannot remove the main overlay window");
      return;
    }
    
    const confirmed = await Dialog.confirm({
      title: "Remove Overlay Window",
      content: "Are you sure you want to remove this overlay window?"
    });
    
    if (!confirmed) return;
    
    try {
      // Delete the window configuration
      await OverlayData.deleteOverlayWindow(windowId);
      
      // Close the window if it's open
      if (window.overlayWindows && window.overlayWindows[windowId]) {
        window.overlayWindows[windowId].close();
        delete window.overlayWindows[windowId];
      }
      
      ui.notifications.info("Overlay window removed successfully");
      
      // Update the window manager
      this.render(true);
    } catch (error) {
      console.error("Error removing window:", error);
      ui.notifications.error("Failed to remove window configuration");
    }
  }
}