// Updated module initialization with V2 premium monitoring
import { StandaloneBridge } from '../utils/standalone-bridge.js';
import { MODULE_ID } from './constants.js';
import { registerSettings, registerMenus } from './settings.js';
import { registerHooks } from './hooks.js';
import { syncPremiumStatus, initializePremiumMonitoring } from '../premium/validation.js';
import { liveSync } from '../utils/live-sync.js';
import { registerTemplateHelpers } from '../utils/template-helpers.js';
import { initStreamPageOverlay, isStreamPage } from '../utils/stream-overlay.js';

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

  // ── Refresh streamWindowId dropdown with live window data ──────────────
  // The setting is registered at init-time with whatever windows are stored,
  // but now that OverlayData is loaded we can update the choices accurately.
  try {
    const _windows = OverlayData.getOverlayWindows();
    const _setting = game.settings.settings?.get(`${MODULE_ID}.streamWindowId`);
    if (_setting && _windows && Object.keys(_windows).length > 0) {
      _setting.choices = {};
      for (const [_id, _cfg] of Object.entries(_windows)) {
        _setting.choices[_id] = `${_cfg.name || _id} (${_id})`;
      }
      // If the stored value no longer matches any window, reset to first
      const _current = game.settings.get(MODULE_ID, "streamWindowId");
      if (!_setting.choices[_current]) {
        await game.settings.set(MODULE_ID, "streamWindowId", Object.keys(_windows)[0]);
      }
    }
  } catch (_e) { /* non-fatal — dropdown just shows init-time choices */ }

  // ── Stream page: inject overlay and apply CSS classes ──────────────────
  // Run before premium sync so the overlay appears as fast as possible.
  initStreamPageOverlay();
  // ───────────────────────────────────────────────────────────────────────

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

  // ── Version split announcement / conflict detection ────────────────────
  // Runs after everything is initialised so dialogs don't pile up on load.
  if (game.user.isGM) {
    setTimeout(() => _handleVersionNotices(), 2000);
  }

});

/**
 * Show a one-time announcement for the free/pro split, and warn when both
 * modules are installed simultaneously.
 *
 * Detection logic (works from the same shared codebase):
 *   - The PRO module.json uses id "foundrystreamoverlaypro"
 *   - The FREE module.json uses id "foundrystreamoverlay"
 *   - Both use MODULE_ID = "foundrystreamoverlay" for Foundry settings (shared data)
 */
async function _handleVersionNotices() {
  const { isPremiumActive } = await import('../premium/validation.js');
  const isProVersion  = !!game.modules.get("foundrystreamoverlaypro")?.active;
  const isFreeVersion = !isProVersion;

  // ── Conflict: both free AND pro are active ─────────────────────────────
  if (isProVersion && game.modules.get("foundrystreamoverlay")?.active) {
    new Dialog({
      title: "Foundry Stream Overlay — Conflict Detected",
      content: `
        <div style="padding:6px 0;">
          <p><strong>⚠️ Both the Free and Pro versions of Foundry Stream Overlay are currently enabled.</strong></p>
          <p>Running both at the same time will cause duplicate hooks, doubled settings, and unpredictable behaviour.</p>
          <p>Please <strong>disable or uninstall</strong> the Free version
             (<em>Foundry Stream Overlay Free</em>) and keep only the Pro version active.</p>
          <p style="font-size:12px; color:#666; margin-top:8px;">
            You can do this in <strong>Game Settings → Manage Modules</strong>.
            Your scenes and data will not be lost — both versions share the same storage.
          </p>
        </div>
      `,
      buttons: {
        openModules: {
          icon: '<i class="fas fa-puzzle-piece"></i>',
          label: "Open Manage Modules",
          callback: () => game.settings.sheet?.render(true) ||
                          new ModuleManagement().render(true)
        },
        dismiss: {
          icon: '<i class="fas fa-times"></i>',
          label: "Dismiss"
        }
      },
      default: "openModules",
      width: 480
    }).render(true);
    return; // Don't show the split announcement on top of the conflict dialog
  }

  // ── Free version: one-time split announcement ──────────────────────────
  if (isFreeVersion) {
    const alreadySeen = game.settings.get(MODULE_ID, "splitAnnouncementSeen");
    if (!alreadySeen) {
      await game.settings.set(MODULE_ID, "splitAnnouncementSeen", true);
      new Dialog({
        title: "Foundry Stream Overlay — Now Free & Pro",
        content: `
          <div style="padding:6px 0;">
            <p>
              <strong>Foundry Stream Overlay has split into two versions:</strong>
            </p>
            <ul style="margin:8px 0 12px 20px; line-height:1.7;">
              <li><strong>Free</strong> (this version) — one scene, basic animations, all streaming features.</li>
              <li><strong>Pro</strong> — unlimited scenes, advanced animations, slideshow, multiple windows, and no watermark.</li>
            </ul>
            <p>
              If you were using Pro features previously, download
              <strong>Foundry Stream Overlay Pro</strong> from Patreon and install it in place of
              this module. All your scenes and data will be preserved.
            </p>
            <p style="font-size:12px; color:#666; margin-top:10px;">
              This message will not appear again.
            </p>
          </div>
        `,
        buttons: {
          getPro: {
            icon: '<i class="fab fa-patreon"></i>',
            label: "Get Pro on Patreon",
            callback: () => window.open("https://www.patreon.com/c/jenzelta", "_blank")
          },
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "Got it — stay on Free"
          }
        },
        default: "ok",
        width: 500
      }).render(true);
    }
  }
}

// Register hooks
registerHooks();

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
