// Simple window opener UI component - FIXED VERSION
import { MODULE_ID } from '../core/constants.js';
import { openOverlayWindow } from '../overlay/window-management.js';

export class OverlayWindowOpener extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Open Overlay Window",
      id: "foundrystreamoverlay-open-overlay",
      template: `modules/${MODULE_ID}/templates/open-overlay-window.html`,
      width: 400
    });
  }

  getData(options) {
    return {};
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[name='open-overlay']").click(this._openOverlay.bind(this));
  }

  async _openOverlay(event) {
    event.preventDefault();
    try {
      console.log("Opening overlay window...");
      openOverlayWindow();
      ui.notifications.info("Overlay window opened!");
    } catch (error) {
      console.error("Error opening overlay window:", error);
      ui.notifications.error("Failed to open overlay window. Check console for details.");
    }
  }

  async _updateObject(event, formData) {
    // No form submission needed
  }
}