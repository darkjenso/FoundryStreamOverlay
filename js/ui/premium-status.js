// Premium Status Dialog UI Component
import { MODULE_ID } from '../core/constants.js';
import { validateActivationKey } from '../premium/validation.js';
import OverlayData from '../../data-storage.js';

export class PremiumStatusDialog extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Premium Status",
      id: "foundrystreamoverlay-premium-status",
      template: `modules/${MODULE_ID}/templates/premium-status.html`,
      width: 400,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const isPremium = OverlayData.getSetting("isPremium") || false;
    const activationKey = game.settings.get(MODULE_ID, "activationKey") || "";
    return { isPremium, activationKey };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#activate-key-button").click(async (event) => {
      event.preventDefault();
      const key = html.find("#activation-key-input").val().trim();
      
      if (!key) {
        ui.notifications.warn("Please enter an activation key.");
        return;
      }
      
      await game.settings.set(MODULE_ID, "activationKey", key);
      this.render();
    });
  }

  async _updateObject(event, formData) {
    // No form submission needed
  }
}