// Premium validation and feature management - V2 API ONLY (No V1 Fallback)
import { MODULE_ID } from '../core/constants.js';

/**
 * Validates a premium activation key ONLY against the V2 API
 * @param {string} key - The activation key to validate
 * @param {boolean} showNotification - Whether to show success/error notifications (default: true)
 * @returns {Promise<boolean>} - Whether the key is valid
 */
export async function validateActivationKey(key, showNotification = true) {
  console.log(`${MODULE_ID} | Validating activation key: ${key.substring(0, 4)}...`);
  
  // First check basic format
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

  // ONLY use V2 API validation - NO FALLBACK
  const apiResult = await validateKeyWithV2API(key);
  
  if (apiResult.success) {
    console.log(`${MODULE_ID} | V2 API validation: ${apiResult.valid ? "VALID" : "INVALID"}`);
    
    // Set premium status consistently in BOTH places
    game.settings.set(MODULE_ID, "isPremium", apiResult.valid);
    updateOverlayDataPremiumStatus(apiResult.valid);
    
    if (apiResult.valid && showNotification) {
      ui.notifications.info("Premium features activated!");
      
      // Show additional info from V2 API
      if (apiResult.data && apiResult.data.key_type) {
        console.log(`${MODULE_ID} | Key type: ${apiResult.data.key_type}, Product: ${apiResult.data.product}`);
        
        if (apiResult.data.key_type === 'permanent') {
          ui.notifications.info("Permanent premium license activated!");
        } else if (apiResult.data.key_type === 'subscription') {
          const expiresAt = apiResult.data.expires_at ? new Date(apiResult.data.expires_at).toLocaleDateString() : 'Unknown';
          ui.notifications.info(`Subscription premium active until ${expiresAt}`);
        }
      }
      
      // Refresh relevant UI components
      refreshPremiumUI();
      updateAllOverlayWindows();
    }

    if (apiResult.valid) {
      // Log usage in the database (don't block on failure)
      recordKeyUsage(key);
    } else if (showNotification) {
      // Show specific error message from API
      const errorMsg = apiResult.error || "Invalid activation key.";
      ui.notifications.error(errorMsg);
    }
    
    return apiResult.valid;
  } else {
    // V2 API failed - NO FALLBACK, just fail
    console.error(`${MODULE_ID} | V2 API validation failed, no fallback available`);
    
    if (showNotification) {
      ui.notifications.error("Unable to validate key. Please check your internet connection and try again.");
    }
    
    // Set premium status to false
    game.settings.set(MODULE_ID, "isPremium", false);
    updateOverlayDataPremiumStatus(false);
    
    return false;
  }
}

/**
 * Validates a key against the V2 API
 * @param {string} key - The activation key
 * @returns {Promise<Object>} - API response object
 */
async function validateKeyWithV2API(key) {
  try {
    // Always use foundry_module for this module - keys are permanent, never expire
    const product = 'foundry_module';
    
    const response = await fetch('https://cool-puffpuff-4ee93b.netlify.app/.netlify/functions/validate-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: key,
        product: product
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      valid: result.valid || false,
      data: result.valid ? result : null,
      error: result.error || null
    };
    
  } catch (error) {
    console.warn(`${MODULE_ID} | V2 API validation failed:`, error);
    return {
      success: false,
      valid: false,
      error: `API Error: ${error.message}`
    };
  }
}

/**
 * Check if a key has expired (only relevant for non-Foundry products)
 * Note: Foundry module keys are permanent and never expire
 * @param {string} key - The activation key to check
 * @returns {Promise<Object>} - Expiration status
 */
export async function checkKeyExpiration(key) {
  const apiResult = await validateKeyWithV2API(key);
  
  if (apiResult.success && apiResult.valid && apiResult.data) {
    const keyData = apiResult.data;
    
    // Foundry module keys are always permanent - skip expiration checking
    if (keyData.product === 'foundry_module') {
      return {
        isSubscription: false,
        isPermanent: true,
        isFoundryModule: true,
        message: "Foundry module keys are permanent and never expire"
      };
    }
    
    // Only check expiration for other products (like standalone app)
    if (keyData.key_type === 'subscription' && keyData.expires_at) {
      const expiresAt = new Date(keyData.expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      return {
        isSubscription: true,
        expiresAt: expiresAt,
        daysUntilExpiry: daysUntilExpiry,
        isExpired: expiresAt < now,
        isExpiringSoon: daysUntilExpiry <= 7 && daysUntilExpiry > 0
      };
    } else if (keyData.key_type === 'permanent') {
      return {
        isSubscription: false,
        isPermanent: true
      };
    }
  }
  
  return {
    isSubscription: false,
    isPermanent: false,
    checkFailed: true
  };
}

/**
 * Periodic check for subscription key expiration (run every hour)
 */
export async function scheduleExpirationCheck() {
  const currentKey = game.settings.get(MODULE_ID, "activationKey") || "";
  
  if (currentKey && isPremiumActive()) {
    const expirationStatus = await checkKeyExpiration(currentKey);
    
    if (expirationStatus.isExpiringSoon) {
      ui.notifications.warn(
        `Your premium subscription expires in ${expirationStatus.daysUntilExpiry} day(s). 
         Renew your Patreon subscription to continue using premium features.`
      );
    } else if (expirationStatus.isExpired) {
      ui.notifications.error("Your premium subscription has expired. Premium features have been disabled.");
      
      // Disable premium features
      game.settings.set(MODULE_ID, "isPremium", false);
      updateOverlayDataPremiumStatus(false);
      refreshPremiumUI();
    }
  }
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
 * Get detailed premium status information
 * @returns {Promise<Object>} - Detailed premium status
 */
export async function getPremiumStatusDetails() {
  const currentKey = game.settings.get(MODULE_ID, "activationKey") || "";
  const isPremium = isPremiumActive();
  
  if (!currentKey || !isPremium) {
    return {
      isPremium: false,
      keyPresent: !!currentKey,
      statusMessage: "Premium features not activated"
    };
  }
  
  const expirationStatus = await checkKeyExpiration(currentKey);
  
  return {
    isPremium: true,
    keyPresent: true,
    keyType: expirationStatus.isPermanent ? 'permanent' : 'subscription',
    expirationStatus: expirationStatus,
    statusMessage: expirationStatus.isPermanent ? 
      "Permanent premium license active" : 
      `Subscription active (expires ${expirationStatus.expiresAt?.toLocaleDateString() || 'unknown'})`
  };
}

/**
 * Synchronizes premium status between game settings and OverlayData
 * Enhanced with V2 API validation
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
      
      // Validate the key silently with V2 API (no notification during sync)
      await validateActivationKey(keyToUse, false);
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Error syncing premium status:`, error);
  }
}

/**
 * Initialize periodic expiration checking
 */
export function initializePremiumMonitoring() {
  // Check expiration every hour
  setInterval(scheduleExpirationCheck, 60 * 60 * 1000);
  
  // Also check 5 minutes after module loads
  setTimeout(scheduleExpirationCheck, 5 * 60 * 1000);
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
      <div style="background: #f0f9ff; border: 1px solid #0369a1; border-radius: 6px; padding: 12px; margin: 12px 0;">
        <p style="margin: 0; color: #0369a1; font-size: 13px;">
          <i class="fas fa-info-circle"></i> Get your premium activation key through our V2 authentication system by connecting your Patreon account.
        </p>
      </div>
    `,
    buttons: {
      getKey: {
        icon: '<i class="fas fa-key"></i>',
        label: "Get V2 Activation Key",
        callback: () => window.open("https://cool-puffpuff-4ee93b.netlify.app/v2/", "_blank")
      },
      upgrade: {
        icon: '<i class="fab fa-patreon"></i>',
        label: "Support on Patreon",
        callback: () => window.open("https://www.patreon.com/c/jenzelta", "_blank")
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Close"
      }
    },
    default: "getKey",
    width: 450
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

/**
 * Records usage statistics for a valid activation key
 * Updates last_used and usage_count on the server
 * @param {string} key - Activation key that was just validated
 */
async function recordKeyUsage(key) {
  try {
    const product = 'foundry_module';
    await fetch('https://cool-puffpuff-4ee93b.netlify.app/.netlify/functions/update-key-usage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key, product })
    });
  } catch (error) {
    console.warn(`${MODULE_ID} | Failed to record key usage:`, error);
  }
}
