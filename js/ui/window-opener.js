// Simple window opener UI component - FIXED VERSION
import { MODULE_ID } from '../core/constants.js';
import { openOverlayWindow } from '../overlay/window-management.js';
import { getBaseApplication } from '../utils/app-compat.js';

export class OverlayWindowOpener extends getBaseApplication() {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
      title: "Open Overlay Window",
      id: "foundrystreamoverlay-open-overlay",
      template: `modules/${MODULE_ID}/templates/open-overlay-window.html`,
      width: 400
    });
  }

  static DEFAULT_OPTIONS = {
    id: "foundrystreamoverlay-open-overlay",
    window: { title: "Open Overlay Window" },
    position: { width: 400 }
  };

  static get PARTS() {
    return { main: { template: `modules/${MODULE_ID}/templates/open-overlay-window.html` } };
  }

  getData(options) { return {}; }
  async _prepareContext() { return {}; }

  activateListeners(html) {
    super.activateListeners?.(html);
    html.find("button[name='open-overlay']").click(this._openOverlay.bind(this));
  }

  _onRender(context, options) {
    this.activateListeners($(this.element));
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