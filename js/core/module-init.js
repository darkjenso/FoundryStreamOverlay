// Updated module initialization with V2 premium monitoring
import { StandaloneBridge } from '../utils/standalone-bridge.js';
import { MODULE_ID } from './constants.js';
import { registerSettings, registerMenus } from './settings.js';
import { registerHooks } from './hooks.js';
import { syncPremiumStatus, initializePremiumMonitoring } from '../premium/validation.js';
import { liveSync } from '../utils/live-sync.js';
import { registerTemplateHelpers } from '../utils/template-helpers.js';

// Register Handlebars helpers and template components
Hooks.once("init", () => {
  
  // Register basic Handlebars helpers
  Handlebars.registerHelper("ifEquals", function(arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper("eq", function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper("ne", function(a, b) {
    return a !== b;
  });

  Handlebars.registerHelper("ifNotDefault", function(value, options) {
    if (value !== "Default") {
      return options.fn(this);
    }
    return "";
  });

  Handlebars.registerHelper("lookup", function(obj, key) {
    return obj && obj[key];
  });

  // OPTIMIZED: Length helper for counting
  Handlebars.registerHelper("len", function(obj) {
    if (!obj) return 0;
    if (Array.isArray(obj)) return obj.length;
    if (typeof obj === 'object') return Object.keys(obj).length;
    return 0;
  });

  // OPTIMIZED: Check if array/object has items
  Handlebars.registerHelper("hasItems", function(obj) {
    if (!obj) return false;
    if (Array.isArray(obj)) return obj.length > 0;
    if (typeof obj === 'object') return Object.keys(obj).length > 0;
    return false;
  });

  // OPTIMIZED: Format numbers nicely
  Handlebars.registerHelper("formatNumber", function(num) {
    if (typeof num !== 'number') return num;
    return num.toLocaleString();
  });

  // OPTIMIZED: Truncate text with ellipsis
  Handlebars.registerHelper("truncate", function(str, length) {
    if (!str || typeof str !== 'string') return str;
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  });

  // OPTIMIZED: Check if user has premium (for templates)
  Handlebars.registerHelper("isPremium", function() {
    try {
      const { isPremiumActive } = require('../premium/validation.js');
      return isPremiumActive();
    } catch (error) {
      return false;
    }
  });

  Handlebars.registerHelper("terminology", function(layoutTerm, sceneTerm) {
    return sceneTerm;
  });

  // Register the template helper components
  registerTemplateHelpers();

  // Register settings and menus
  registerSettings();
  registerMenus();
  
});

// Initialize when Foundry is ready - ENHANCED WITH V2 PREMIUM MONITORING
Hooks.once("ready", async () => {
  
  // Initialize data storage FIRST and wait for completion
  const OverlayData = (await import('../../data-storage.js')).default;
  await OverlayData.initialize();
  
  // Only ensure configuration if data is truly missing
  await ensureMinimalConfiguration(OverlayData);
  
  // Sync premium status AFTER OverlayData is fully initialized
  await syncPremiumStatus();
  
  // NEW: Initialize premium monitoring for V2 API
  initializePremiumMonitoring();
  
  // Setup global window references for backward compatibility
  await setupGlobalReferences();
  
  if (!window.standaloneBridge) {
    window.standaloneBridge = new StandaloneBridge();
  }
  
  // FIXED: Initialize LiveSync AFTER game is ready
  try {
    const { liveSync } = await import('../utils/live-sync.js');
    await liveSync.init();
  } catch (error) {
    console.error(`${MODULE_ID} | Error initializing LiveSync:`, error);
  }

  // OPTIMIZED: Show migration notice for world-scoped settings
  if (game.user.isGM && !sessionStorage.getItem(`${MODULE_ID}-scope-notified`)) {
    ui.notifications.info("Foundry Stream Overlay: Scenes are now shared across all users in this world!");
    sessionStorage.setItem(`${MODULE_ID}-scope-notified`, "true");
  }
  
  // NEW: Show V2 upgrade notice for premium users
  const currentKey = game.settings.get(MODULE_ID, "activationKey") || "";
  if (currentKey && !sessionStorage.getItem(`${MODULE_ID}-v2-notified`)) {
    setTimeout(() => {
      ui.notifications.info("🚀 V2 authentication system is now available! Your existing premium key will work with improved validation.");
    }, 2000);
    sessionStorage.setItem(`${MODULE_ID}-v2-notified`, "true");
  }
  
});

// Register hooks
registerHooks();

/**
 * OPTIMIZED: Less aggressive configuration check
 */
async function ensureMinimalConfiguration(OverlayData) {
  
  let needsMinimalSetup = false;
  
  try {
    const layouts = OverlayData.getLayouts();
    
    // Only create defaults if no layouts exist at all
    if (!layouts || Object.keys(layouts).length === 0) {
      await OverlayData.setLayout("Default", []);
      needsMinimalSetup = true;
    }
    
    const windows = OverlayData.getOverlayWindows();
    
    // Only create main window if no windows exist at all
    if (!windows || Object.keys(windows).length === 0) {
      const defaultWindow = {
        id: "main",
        name: "Main Overlay",
        activeLayout: "Default",
        slideshowActive: false,
        width: 800,
        height: 600
      };
      await OverlayData.setOverlayWindow("main", defaultWindow);
      needsMinimalSetup = true;
    }
    
    // Only set active layout if none exists
    const activeLayout = OverlayData.getActiveLayout();
    if (!activeLayout) {
      await OverlayData.setActiveLayout("Default");
      needsMinimalSetup = true;
    }
    
    // Only set slideshow if none exists
    const slideshow = OverlayData.getSlideshow();
    if (!slideshow) {
      await OverlayData.setSlideshow({
        list: [],
        random: false,
        transition: "none", 
        transitionDuration: 0.5
      });
      needsMinimalSetup = true;
    }
    
    // Only set settings if none exist
    const settings = OverlayData.data?.settings;
    if (!settings) {
      OverlayData.data.settings = {
        isPremium: false,
        activationKey: "",
        backgroundColour: "#00ff00",
        enableTriggeredAnimations: true
      };
      needsMinimalSetup = true;
    }
    
    if (needsMinimalSetup) {
      await OverlayData.save();
    } else {
      console.log(`${MODULE_ID} | Configuration already complete`);
    }
    
  } catch (error) {
    console.error(`${MODULE_ID} | Error in minimal configuration setup:`, error);
  }
}

/**
 * Sets up global window references for backward compatibility
 */
async function setupGlobalReferences() {
  const { OverlayConfig } = await import('../ui/overlay-config.js');
  const { ManageLayouts } = await import('../ui/layout-manager.js');
  const { OverlayWindowManager } = await import('../ui/window-manager.js');
  const { OverlayWindowConfig } = await import('../ui/window-config.js');
  const { SlideshowConfig } = await import('../ui/slideshow-config.js');
  const { AnimationManager } = await import('../ui/animation-manager.js');
  const { PremiumStatusDialog } = await import('../ui/premium-status.js');
  const { openOverlayWindow, updateOverlayWindow } = await import('../overlay/window-management.js');

  // Export classes for global access
  window.FoundryStreamOverlay = {
    // UI Components
    OverlayConfig,
    ManageLayouts,
    OverlayWindowManager,
    OverlayWindowConfig,
    SlideshowConfig,
    AnimationManager,
    PremiumStatusDialog,
    
    // Core functions
    openOverlayWindow,
    updateOverlayWindow,
    
    // Constants
    MODULE_ID,
    
    // OPTIMIZED: Template helpers
    templateHelpers: {
      registerTemplateHelpers,
      getFontData: async () => {
        const { getFontData } = await import('../utils/template-helpers.js');
        return getFontData();
      }
    },
    
    // NEW: V2 Premium API
    premium: {
      validateKey: async (key) => {
        const { validateActivationKey } = await import('../premium/validation.js');
        return await validateActivationKey(key, true);
      },
      getStatus: async () => {
        const { getPremiumStatusDetails } = await import('../premium/validation.js');
        return await getPremiumStatusDetails();
      },
      checkExpiration: async (key) => {
        const { checkKeyExpiration } = await import('../premium/validation.js');
        return await checkKeyExpiration(key);
      }
    }
  };

  // Also assign individual classes to window for backward compatibility
  window.ManageLayouts = ManageLayouts;
  window.OverlayConfig = OverlayConfig;
  window.OverlayWindowManager = OverlayWindowManager;
  window.OverlayWindowConfig = OverlayWindowConfig;
  window.SlideshowConfig = SlideshowConfig;
  window.AnimationManager = AnimationManager;
  window.PremiumStatusDialog = PremiumStatusDialog;
  window.openOverlayWindow = openOverlayWindow;
  window.updateOverlayWindow = updateOverlayWindow;
}