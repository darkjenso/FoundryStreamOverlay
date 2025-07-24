// Premium validation and feature management - DEBLOATED VERSION
import { MODULE_ID } from '../core/constants.js';

/**
 * Validates a premium activation key
 * @param {string} key - The activation key to validate
 * @param {boolean} showNotification - Whether to show success/error notifications (default: true)
 * @returns {boolean} - Whether the key is valid
 */
export function validateActivationKey(key, showNotification = true) {
  console.log(`${MODULE_ID} | Validating activation key: ${key.substring(0, 4)}...`);
  
  if (!key || key.length !== 16 || !/^[A-F0-9]{16}$/.test(key)) {
    if (key !== "" && showNotification) {
      ui.notifications.error("Invalid activation key format.");
      console.error(`${MODULE_ID} | Invalid key format`);
    }
    
    // Set premium status to false in BOTH places
    game.settings.set(MODULE_ID, "isPremium", false);
    updateOverlayDataPremiumStatus(false);
    
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const charCode = parseInt(key[i], 16);
    sum = (sum + charCode) % 16;
  }
  
  const expectedChecksum = sum.toString(16).toUpperCase();
  const lastChar = key[15];
  
  const isValid = lastChar === expectedChecksum;
  
  console.log(`${MODULE_ID} | Key validation result: ${isValid ? "VALID" : "INVALID"}`);
  
  // Set premium status consistently in BOTH places
  game.settings.set(MODULE_ID, "isPremium", isValid);
  updateOverlayDataPremiumStatus(isValid);
  
  if (isValid && showNotification) {
    // Only show notification when user actively enters a key, not during sync
    ui.notifications.info("Premium features activated!");
    
    // Refresh relevant UI components
    refreshPremiumUI();
    
    // Update all overlay windows
    updateAllOverlayWindows();
  } else if (!isValid && showNotification) {
    ui.notifications.error("Invalid activation key.");
  }
  
  return isValid;
}

/**
 * Updates premium status in OverlayData (async helper)
 */
async function updateOverlayDataPremiumStatus(isValid) {
  try {
    const OverlayData = (await import('../../data-storage.js')).default;
    if (OverlayData && OverlayData.initialized) {
      await OverlayData.setSetting("isPremium", isValid);
      console.log(`${MODULE_ID} | isPremium set in OverlayData: ${isValid}`);
    } else {
      console.warn(`${MODULE_ID} | OverlayData not initialized, isPremium only set in game.settings`);
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Error updating OverlayData premium status:`, error);
  }
}

/**
 * Checks if premium features are currently active
 * @returns {boolean} - Whether premium is active
 */
export function isPremiumActive() {
  // Check both sources to ensure consistency
  const settingValue = game.settings.get(MODULE_ID, "isPremium") || false;
  
  // Try to get OverlayData value if available
  let overlayValue = false;
  try {
    // This is a synchronous check - OverlayData should be initialized by now
    if (window.OverlayData && window.OverlayData.initialized) {
      overlayValue = window.OverlayData.getSetting("isPremium") || false;
    }
  } catch (error) {
    // OverlayData not available, use settings value
  }
  
  // If there's a discrepancy, log it but prefer the OverlayData value if it exists
  if (settingValue !== overlayValue && window.OverlayData && window.OverlayData.initialized) {
    console.warn(`${MODULE_ID} | Premium status mismatch: game.settings=${settingValue}, OverlayData=${overlayValue}`);
    // Sync them
    game.settings.set(MODULE_ID, "isPremium", overlayValue);
    return overlayValue;
  }
  
  return settingValue;
}

/**
 * Filters animations based on premium status
 * @param {string} animationType - The type of animation (continuous, entrance, trigger)
 * @param {string} selectedAnimation - The currently selected animation
 * @returns {string} - The animation to use (filtered for non-premium users)
 */
export function filterAnimationForPremium(animationType, selectedAnimation) {
  const isPremium = isPremiumActive();
  
  if (!isPremium) {
    // Non-premium users can only use basic animations or none
    const allowedAnimations = ['none', 'hover', 'pulse', 'fadeIn'];
    
    if (!allowedAnimations.includes(selectedAnimation)) {
      return 'none';
    }
  }
  
  return selectedAnimation;
}

/**
 * Checks if a specific feature requires premium
 * @param {string} feature - The feature to check
 * @returns {boolean} - Whether the feature requires premium
 */
export function requiresPremium(feature) {
  const premiumFeatures = [
    'multipleLayouts',
    'animations',
    'slideshow',
    'multipleWindows',
    'advancedAnimations',
    'triggeredAnimations',
    'layoutTransitions'
  ];
  
  return premiumFeatures.includes(feature);
}

/**
 * Shows a premium required dialog
 * @param {string} featureName - The name of the feature that requires premium
 */
export function showPremiumRequiredDialog(featureName = "This feature") {
  new Dialog({
    title: "Premium Feature",
    content: `
      <h3><i class="fas fa-gem" style="color:#FF424D;"></i> Premium Feature Required</h3>
      <p>${featureName} requires premium activation.</p>
      <p>With premium, you can unlock advanced animations, multiple layouts, slideshow functionality, and more!</p>
    `,
    buttons: {
      upgrade: {
        icon: '<i class="fab fa-patreon"></i>',
        label: "Upgrade on Patreon",
        callback: () => window.open("https://www.patreon.com/c/jenzelta", "_blank")
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Close"
      }
    },
    default: "cancel",
    width: 400
  }).render(true);
}

/**
 * Validates layout count for non-premium users
 * @param {Object} layouts - The current layouts object
 * @returns {boolean} - Whether the user can create more layouts
 */
export function canCreateLayout(layouts) {
  const isPremium = isPremiumActive();
  
  if (!isPremium) {
    const layoutCount = Object.keys(layouts).length;
    if (layoutCount > 0) {
      showPremiumRequiredDialog("Multiple layouts");
      return false;
    }
  }
  
  return true;
}

/**
 * Validates window count for non-premium users
 * @param {Object} windows - The current windows object
 * @returns {boolean} - Whether the user can create more windows
 */
export function canCreateWindow(windows) {
  const isPremium = isPremiumActive();
  
  if (!isPremium) {
    const windowCount = Object.keys(windows).length;
    if (windowCount >= 1) {
      showPremiumRequiredDialog("Multiple overlay windows");
      return false;
    }
  }
  
  return true;
}

/**
 * Synchronizes premium status between game settings and OverlayData
 * DEBLOATED: No longer shows notifications during sync
 */
export async function syncPremiumStatus() {
  try {
    const OverlayData = (await import('../../data-storage.js')).default;
    
    const storedKey = OverlayData.getSetting("activationKey") || "";
    const gameSettingsKey = game.settings.get(MODULE_ID, "activationKey") || "";
    
    // If there's a key in either system, validate it silently
    if (storedKey || gameSettingsKey) {
      const keyToUse = storedKey || gameSettingsKey;
      
      // Make sure both systems have the same key
      if (storedKey !== gameSettingsKey) {
        console.log(`${MODULE_ID} | Synchronizing activation keys...`);
        if (storedKey) {
          game.settings.set(MODULE_ID, "activationKey", storedKey);
        } else {
          await OverlayData.setSetting("activationKey", gameSettingsKey);
        }
      }
      
      // Validate the key silently (no notification during sync)
      validateActivationKey(keyToUse, false);
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Error syncing premium status:`, error);
  }
}

/**
 * Refreshes UI components that depend on premium status
 */
function refreshPremiumUI() {
  for (const app of Object.values(ui.windows)) {
    if (app.constructor.name === 'OverlayConfig' || 
        app.constructor.name === 'ManageLayouts' || 
        app.constructor.name === 'PremiumStatusDialog' ||
        app.constructor.name === 'OverlayWindowManager') {
      app.render(true);
    }
  }
}

/**
 * Updates all open overlay windows
 */
async function updateAllOverlayWindows() {
  try {
    // Import updateOverlayWindow function when needed
    const { updateOverlayWindow } = await import('../overlay/window-management.js');
    
    if (window.overlayWindow && !window.overlayWindow.closed) {
      updateOverlayWindow();
    }
    
    if (window.overlayWindows) {
      for (const [windowId, overlayWindow] of Object.entries(window.overlayWindows)) {
        if (overlayWindow && !overlayWindow.closed) {
          updateOverlayWindow(windowId);
        }
      }
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Error updating overlay windows:`, error);
  }
}