// Premium Status Dialog UI Component - V2 INTEGRATION with Password Toggle
import { MODULE_ID } from '../core/constants.js';
import { validateActivationKey, getPremiumStatusDetails } from '../premium/validation.js';
import OverlayData from '../../data-storage.js';

export class PremiumStatusDialog extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Premium Status",
      id: "foundrystreamoverlay-premium-status",
      template: `modules/${MODULE_ID}/templates/premium-status.html`,
      width: 450,
      height: "auto",
      closeOnSubmit: false,
      resizable: true
    });
  }

  async getData() {
    const isPremium = OverlayData.getSetting("isPremium") || false;
    const activationKey = game.settings.get(MODULE_ID, "activationKey") || "";
    
    // Get detailed premium status from V2 API
    let premiumDetails = {
      isPremium: false,
      keyPresent: false,
      statusMessage: "Premium features not activated"
    };
    
    try {
      premiumDetails = await getPremiumStatusDetails();
    } catch (error) {
      console.warn(`${MODULE_ID} | Error getting premium details:`, error);
    }
    
    return { 
      isPremium, 
      activationKey,
      premiumDetails,
      v2Available: true // Indicate V2 validation is available
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // NEW: Toggle password visibility
    html.find("#toggle-key-visibility").click((event) => {
      event.preventDefault();
      const input = html.find("#activation-key-input")[0];
      const icon = html.find("#visibility-icon");
      
      if (input.type === "password") {
        input.type = "text";
        icon.removeClass("fa-eye").addClass("fa-eye-slash");
        event.currentTarget.title = "Hide activation key";
      } else {
        input.type = "password";
        icon.removeClass("fa-eye-slash").addClass("fa-eye");
        event.currentTarget.title = "Show activation key";
      }
    });

    html.find("#activate-key-button").click(async (event) => {
      event.preventDefault();
      const button = $(event.currentTarget);
      const originalText = button.html();
      const key = html.find("#activation-key-input").val().trim();
      
      if (!key) {
        ui.notifications.warn("Please enter an activation key.");
        return;
      }
      
      // Show loading state
      button.html('<i class="fas fa-spinner fa-spin"></i> Validating...').prop("disabled", true);
      
      try {
        // Use the enhanced V2 validation
        const isValid = await validateActivationKey(key, true);
        
        if (isValid) {
          // Save the key
          await game.settings.set(MODULE_ID, "activationKey", key);
          
          // Show success and refresh the dialog
          setTimeout(() => {
            this.render();
          }, 1000);
        }
        
      } catch (error) {
        console.error(`${MODULE_ID} | Error during validation:`, error);
        ui.notifications.error("Validation failed. Please try again.");
      } finally {
        // Restore button state
        button.html(originalText).prop("disabled", false);
      }
    });

    // Check expiration button for subscription keys
    html.find("#check-expiration-button").click(async (event) => {
      event.preventDefault();
      const button = $(event.currentTarget);
      const originalText = button.html();
      const key = html.find("#activation-key-input").val().trim() || 
                  game.settings.get(MODULE_ID, "activationKey") || "";
      
      if (!key) {
        ui.notifications.warn("No activation key to check.");
        return;
      }
      
      button.html('<i class="fas fa-spinner fa-spin"></i> Checking...').prop("disabled", true);
      
      try {
        const { checkKeyExpiration } = await import('../premium/validation.js');
        const expirationStatus = await checkKeyExpiration(key);
        
        if (expirationStatus.isPermanent) {
          ui.notifications.info("✅ Permanent license - never expires!");
        } else if (expirationStatus.isSubscription) {
          if (expirationStatus.isExpired) {
            ui.notifications.error("❌ Subscription has expired. Please renew your Patreon subscription.");
          } else if (expirationStatus.isExpiringSoon) {
            ui.notifications.warn(`⚠️ Subscription expires in ${expirationStatus.daysUntilExpiry} day(s) on ${expirationStatus.expiresAt.toLocaleDateString()}.`);
          } else {
            ui.notifications.info(`✅ Subscription active until ${expirationStatus.expiresAt.toLocaleDateString()} (${expirationStatus.daysUntilExpiry} days remaining).`);
          }
        } else {
          ui.notifications.warn("Unable to determine expiration status. Key may be invalid or API unavailable.");
        }
        
      } catch (error) {
        console.error(`${MODULE_ID} | Error checking expiration:`, error);
        ui.notifications.error("Failed to check expiration status.");
      } finally {
        button.html(originalText).prop("disabled", false);
      }
    });



    // Open V2 auth page button
    html.find("#open-v2-auth").click((event) => {
      event.preventDefault();
      window.open("https://cool-puffpuff-4ee93b.netlify.app/v2/", "_blank");
    });

    // Clear key button
    html.find("#clear-key-button").click(async (event) => {
      event.preventDefault();
      
      const confirmed = await Dialog.confirm({
        title: "Clear Activation Key",
        content: "Are you sure you want to clear your activation key? This will disable premium features.",
        yes: () => true,
        no: () => false
      });
      
      if (confirmed) {
        await game.settings.set(MODULE_ID, "activationKey", "");
        await game.settings.set(MODULE_ID, "isPremium", false);
        
        // Also clear from OverlayData
        try {
          await OverlayData.setSetting("activationKey", "");
          await OverlayData.setSetting("isPremium", false);
        } catch (error) {
          console.warn(`${MODULE_ID} | Error clearing OverlayData:`, error);
        }
        
        ui.notifications.info("Activation key cleared. Premium features disabled.");
        this.render();
      }
    });

    // NEW: Handle input focus/blur for better UX
    html.find("#activation-key-input").on('focus', function() {
      $(this).parent().css('border-color', '#0066cc');
    }).on('blur', function() {
      $(this).parent().css('border-color', '#cbd5e1');
    });

    // NEW: Handle paste events for keys
    html.find("#activation-key-input").on('paste', function(event) {
      // Allow paste, then format the key after a short delay
      setTimeout(() => {
        let value = $(this).val().replace(/[^A-F0-9]/g, '').toUpperCase();
        if (value.length > 16) {
          value = value.substring(0, 16);
        }
        $(this).val(value);
      }, 10);
    });

    // NEW: Auto-format input as user types
    html.find("#activation-key-input").on('input', function() {
      let value = $(this).val().replace(/[^A-F0-9]/g, '').toUpperCase();
      if (value.length > 16) {
        value = value.substring(0, 16);
      }
      $(this).val(value);
    });
  }

  async _updateObject(event, formData) {
    // No form submission needed
  }
}