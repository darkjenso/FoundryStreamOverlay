// Overlay window management - Core window opening and updating functionality with dice support
import { MODULE_ID } from '../core/constants.js';
import { isPremiumActive } from '../premium/validation.js';
import { processDataItem, processStaticItem, processImageItem, processDiceItem, processHpBarItem } from './data-processing.js';
import { createTextElement, createImageElement, createDiceElement, createHpBarElement, addPromoFooter } from './element-creation.js';
import OverlayData from '../../data-storage.js';

/**
 * Opens an overlay window for streaming
 * @param {string} windowId - The ID of the window to open (defaults to "main")
 * @returns {Window} The opened window object
 */
export function openOverlayWindow(windowId = "main") {
  
  try {
    // Get window configuration
    const windows = OverlayData.getOverlayWindows();
    const windowConfig = windows[windowId] || {
      id: windowId,
      name: "Main Overlay",
      activeLayout: "Default",
      width: 800,
      height: 600
    };

    // Close existing window if open
    if (windowId === "main" && window.overlayWindow && !window.overlayWindow.closed) {
      window.overlayWindow.close();
    } else if (window.overlayWindows && window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
      window.overlayWindows[windowId].close();
    }

    // Get background color - prefer per-window setting then global default
    const backgroundColor = windowConfig.backgroundColor ||
      OverlayData.getSetting("backgroundColour") || "#00ff00";
    
    // Open new window
    const overlayWindow = window.open(
      "about:blank",
      `foundry-stream-overlay-${windowId}`,
      `width=${windowConfig.width},height=${windowConfig.height},scrollbars=no,resizable=yes`
    );

    if (!overlayWindow) {
      throw new Error("Failed to open window - popup blocker may be active");
    }

    // Store window reference
    if (windowId === "main") {
      window.overlayWindow = overlayWindow;
    } else {
      if (!window.overlayWindows) {
        window.overlayWindows = {};
      }
      window.overlayWindows[windowId] = overlayWindow;
    }

    // Setup window document
    setupOverlayWindowDocument(overlayWindow, windowConfig, backgroundColor);
    
    // Initial render
    updateOverlayWindow(windowId);

    // Setup window event handlers
    setupWindowEventHandlers(overlayWindow, windowId);

    return overlayWindow;

  } catch (error) {
    console.error(`${MODULE_ID} | Error opening overlay window:`, error);
    ui.notifications.error(`Failed to open overlay window: ${error.message}`);
    throw error;
  }
}

/**
 * Updates the content of an overlay window
 * @param {string} windowId - The ID of the window to update (defaults to "main")
 */
export function updateOverlayWindow(windowId = "main") {
  
  try {
    // Get the window reference
    let overlayWindow;
    if (windowId === "main") {
      overlayWindow = window.overlayWindow;
    } else {
      overlayWindow = window.overlayWindows && window.overlayWindows[windowId];
    }

    // Check if window exists and is open
    if (!overlayWindow || overlayWindow.closed) {
      return;
    }

    // Get window configuration and layout
    const windows = OverlayData.getOverlayWindows();
    const windowConfig = windows[windowId] || windows.main;
    const layouts = OverlayData.getLayouts();
    const activeLayout = windowConfig.activeLayout || "Default";
    const layoutItems = layouts[activeLayout] || [];

    // Ensure window background color reflects configuration
    const bgColor = windowConfig.backgroundColor ||
      OverlayData.getSetting("backgroundColour") || "#00ff00";
    if (overlayWindow.document?.body) {
      overlayWindow.document.body.style.backgroundColor = bgColor;
    }


    // Clear existing content
    const container = overlayWindow.document.getElementById("overlay-container");
    if (!container) {
      console.error(`${MODULE_ID} | Overlay container not found in window ${windowId}`);
      return;
    }

    // Clear any existing animated elements registry for this window
    if (window.overlayAnimatedElements) {
      window.overlayAnimatedElements = {};
    }

    // Clear dice elements registry
    if (overlayWindow.diceElements) {
      overlayWindow.diceElements = [];
    }

    // Preserve any dice elements that are currently animating
    const animatingDice = Array.from(container.querySelectorAll('.dice-item.animating'));
    const preserveSet = new Set(animatingDice);

    // Remove all non-animating children
    Array.from(container.children).forEach(el => {
      if (!preserveSet.has(el)) {
        container.removeChild(el);
      }
    });


    // Get premium status
    const isPremium = isPremiumActive();

    // Process and render each item
    const processedItems = [];
    
    const totalItems = layoutItems.length;

    layoutItems.forEach((item, index) => {
      let processedItem = null;

      try {
        // Process item based on type
        switch (item.type) {
          case "data":
            processedItem = processDataItem(item, isPremium);
            break;
          case "static":
            processedItem = processStaticItem(item, isPremium);
            break;
          case "image":
            processedItem = processImageItem(item, isPremium);
            break;
          case "dice":
            processedItem = processDiceItem(item, isPremium);
            break;
          case "hpBar":
            processedItem = processHpBarItem(item, isPremium);
            break;
          default:
            console.warn(`${MODULE_ID} | Unknown item type: ${item.type}`);
            return;
        }

        if (processedItem && !processedItem.hide) {
          // Preserve the item's original index for DOM matching
          processedItem.itemIndex = index;
          // Higher renderOrder means item appears in front
          processedItem.renderOrder = totalItems - index - 1;
          processedItems.push(processedItem);
        }
      } catch (error) {
        console.error(`${MODULE_ID} | Error processing item ${index}:`, error, item);
      }
    });

    // Sort by render order
    processedItems.sort((a, b) => (a.renderOrder || 0) - (b.renderOrder || 0));

    // Create DOM elements for each item
    processedItems.forEach(item => {
      try {
        let element;

        if (item.type === "image") {
          element = createImageElement(item, overlayWindow);
        } else if (item.type === "dice") {
          // Skip creating a new element if one is already animating for this item
          const exists = container.querySelector(`.dice-item.animating[data-index='${item.itemIndex}']`);
          if (exists) {
            return;
          }
          element = createDiceElement(item, overlayWindow);
                  } else if (item.type === "hpBar") {
          element = createHpBarElement(item, overlayWindow);
        } else {
          element = createTextElement(item, overlayWindow);
        }

        if (element) {
          container.appendChild(element);
        }
      } catch (error) {
        console.error(`${MODULE_ID} | Error creating element:`, error, item);
      }
    });

    // Add promotional footer for non-premium users
    if (!isPremium) {
      addPromoFooter(container, overlayWindow);
    }


    // Trigger live sync if enabled
    if (game.settings.get(MODULE_ID, "autoSyncStandalone")) {
      import('../utils/live-sync.js').then(({ liveSync }) => {
        liveSync.queueSync("window-updated", windowId);
      }).catch(() => {
        // Live sync not available
      });
    }

  } catch (error) {
    console.error(`${MODULE_ID} | Error updating overlay window ${windowId}:`, error);
  }
}

/**
 * Sets up the basic HTML structure for an overlay window
 * @param {Window} overlayWindow - The window object
 * @param {Object} windowConfig - Window configuration
 * @param {string} backgroundColor - Background color for the window
 */
function setupOverlayWindowDocument(overlayWindow, windowConfig, backgroundColor) {
  const doc = overlayWindow.document;
  
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${windowConfig.name || 'Foundry Stream Overlay'}</title>
      <meta charset="utf-8">
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: ${backgroundColor};
          font-family: Arial, sans-serif;
          overflow: hidden;
          position: relative;
          width: 100vw;
          height: 100vh;
        }
        
        #overlay-container {
          position: relative;
          width: 100%;
          height: 100%;
          background: none;
        }
        
        .overlay-item {
          position: absolute;
          background: none !important;
          background-color: transparent !important;
          color: inherit;
          padding: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          margin: 0 !important;
          cursor: default;
          user-select: none;
          transform-origin: center;
          box-shadow: none !important;
          backdrop-filter: none !important;
          outline: none !important;
        }
        
        .overlay-item:not(img) {
          text-align: center;
          min-width: 80px;
          left: 50%;
          transform: translateX(-50%);
        }
        
        img.overlay-item {
          transform: none;
          left: auto;
        }
        
        .overlay-item.text-stroked {
          paint-order: stroke fill;
        }
        
        @supports not (paint-order: stroke) {
          .overlay-item.text-stroked {
            text-shadow: 
              -1px -1px 0 var(--stroke-color),  
               1px -1px 0 var(--stroke-color),
              -1px  1px 0 var(--stroke-color),
               1px  1px 0 var(--stroke-color);
          }
        }
        
        /* Dice-specific styles */
        .dice-item {
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
          filter: drop-shadow(0 0 8px rgba(255,255,255,0.3));
        }

        .dice-item.dice-stroked {
          paint-order: stroke fill;
          -webkit-text-stroke: 2px #000000;
        }
        
        /* Animation Classes */
        @keyframes hover {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-5px); }
        }
        .overlay-item.hover:not(img) { animation: hover 2s infinite; }
        
        @keyframes img-hover {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        img.overlay-item.hover { animation: img-hover 2s infinite; }
        
        @keyframes pulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.3); }
        }
        .overlay-item.pulse:not(img) { animation: pulse 1.5s infinite; }
        
        @keyframes img-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        img.overlay-item.pulse { animation: img-pulse 1.5s infinite; }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .overlay-item.fadeIn { animation: fadeIn 0.5s forwards; }
        
        @keyframes slideInRight {
          from { transform: translateX(-50%) translateX(40px); opacity: 0; }
          to { transform: translateX(-50%); opacity: 1; }
        }
        .overlay-item.slideInRight:not(img) { animation: slideInRight 0.7s forwards; }
        
        @keyframes img-slideInRight {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        img.overlay-item.slideInRight { animation: img-slideInRight 0.7s forwards; }
        
        @keyframes hpDamage {
          0% { transform: translateX(-50%) scale(1); color: inherit; }
          30% { transform: translateX(-50%) scale(1.4); color: #ff3333; }
          100% { transform: translateX(-50%) scale(1); color: inherit; }
        }
        .overlay-item.hp-damage { animation: hpDamage 1.5s ease-out; }
        
        @keyframes hpHealing {
          0% { transform: translateX(-50%) scale(1); color: inherit; }
          30% { transform: translateX(-50%) scale(1.3); color: #33ff33; }
          100% { transform: translateX(-50%) scale(1); color: inherit; }
        }
        .overlay-item.hp-healing { animation: hpHealing 1.2s ease-out; }

        /* Dice Animations */
        @keyframes diceFlip {
          0% { transform: translateX(-50%) scale(1); }
          25% { transform: translateX(-50%) scale(1.2) rotateY(90deg); }
          50% { transform: translateX(-50%) scale(1.1) rotateY(180deg); }
          75% { transform: translateX(-50%) scale(1.2) rotateY(270deg); }
          100% { transform: translateX(-50%) scale(1) rotateY(360deg); }
        }

        @keyframes diceLanding {
          0% { 
            transform: translateX(-50%) scale(1);
            color: inherit;
            filter: drop-shadow(0 0 8px rgba(255,255,255,0.3));
          }
          30% { 
            transform: translateX(-50%) scale(1.4);
            color: #ffdd44;
            filter: drop-shadow(0 0 16px rgba(255,221,68,0.8));
          }
          100% { 
            transform: translateX(-50%) scale(1);
            color: inherit;
            filter: drop-shadow(0 0 8px rgba(255,255,255,0.3));
          }
        }

        @keyframes modifierFlyIn {
          0% { 
            transform: translateX(-50%) translateY(-20px) scale(0.5);
            opacity: 0;
          }
          50% {
            transform: translateX(-50%) translateY(0) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(0) scale(1);
            opacity: 1;
          }
        }

        /* Additional Animation Classes - Full set from CSS file */
        @keyframes rotate {
          0% { transform: translateX(-50%) rotate(0deg); }
          100% { transform: translateX(-50%) rotate(360deg); }
        }
        .overlay-item.rotate:not(img) { animation: rotate 3s infinite linear; }

        @keyframes img-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        img.overlay-item.rotate { animation: img-rotate 3s infinite linear; }

        @keyframes wiggle {
          0%, 100% { transform: translateX(-50%) rotate(0deg); }
          25% { transform: translateX(-50%) rotate(-3deg); }
          75% { transform: translateX(-50%) rotate(3deg); }
        }
        .overlay-item.wiggle:not(img) { animation: wiggle 0.8s infinite ease-in-out; }

        @keyframes img-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        img.overlay-item.wiggle { animation: img-wiggle 0.8s infinite ease-in-out; }

        @keyframes shake {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-50%) translateY(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(-50%) translateY(2px); }
        }
        .overlay-item.shake:not(img) { animation: shake 0.5s infinite; }

        @keyframes img-shake {
          0%, 100% { transform: translateY(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateY(-2px); }
          20%, 40%, 60%, 80% { transform: translateY(2px); }
        }
        img.overlay-item.shake { animation: img-shake 0.5s infinite; }

        @keyframes shimmer {
          0% { transform: translateX(-50%); opacity: 1; }
          50% { transform: translateX(-50%); opacity: 0.5; }
          100% { transform: translateX(-50%); opacity: 1; }
        }
        .overlay-item.shimmer:not(img) { animation: shimmer 1.5s infinite ease-in-out; }

        @keyframes img-shimmer {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        img.overlay-item.shimmer { animation: img-shimmer 1.5s infinite ease-in-out; }

        @keyframes breathe {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.05); }
        }
        .overlay-item.breathe:not(img) { animation: breathe 3s infinite ease-in-out; }

        @keyframes img-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        img.overlay-item.breathe { animation: img-breathe 3s infinite ease-in-out; }

        @keyframes emphasis {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.1); }
        }
        .overlay-item.emphasis:not(img) { animation: emphasis 1s infinite ease-in-out; }

        @keyframes img-emphasis {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        img.overlay-item.emphasis { animation: img-emphasis 1s infinite ease-in-out; }

        @keyframes jitter {
          0%, 100% { transform: translateX(-50%) translate(0, 0); }
          10% { transform: translateX(-50%) translate(-1px, -1px); }
          20% { transform: translateX(-50%) translate(1px, 1px); }
          30% { transform: translateX(-50%) translate(-1px, 1px); }
          40% { transform: translateX(-50%) translate(1px, -1px); }
          50% { transform: translateX(-50%) translate(-1px, -1px); }
          60% { transform: translateX(-50%) translate(1px, 1px); }
          70% { transform: translateX(-50%) translate(-1px, 1px); }
          80% { transform: translateX(-50%) translate(1px, -1px); }
          90% { transform: translateX(-50%) translate(-1px, -1px); }
        }
        .overlay-item.jitter:not(img) { animation: jitter 0.2s infinite; }

        @keyframes img-jitter {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-1px, -1px); }
          20% { transform: translate(1px, 1px); }
          30% { transform: translate(-1px, 1px); }
          40% { transform: translate(1px, -1px); }
          50% { transform: translate(-1px, -1px); }
          60% { transform: translate(1px, 1px); }
          70% { transform: translate(-1px, 1px); }
          80% { transform: translate(1px, -1px); }
          90% { transform: translate(-1px, -1px); }
        }
        img.overlay-item.jitter { animation: img-jitter 0.2s infinite; }

        @keyframes glitch {
          0%, 100% { transform: translateX(-50%); filter: none; }
          20% { transform: translateX(-50%) translateX(2px); filter: hue-rotate(90deg); }
          40% { transform: translateX(-50%) translateX(-2px); filter: hue-rotate(180deg); }
          60% { transform: translateX(-50%) translateX(2px); filter: hue-rotate(270deg); }
          80% { transform: translateX(-50%) translateX(-2px); filter: hue-rotate(360deg); }
        }
        .overlay-item.glitch:not(img) { animation: glitch 0.3s infinite; }

        @keyframes img-glitch {
          0%, 100% { transform: translateX(0); filter: none; }
          20% { transform: translateX(2px); filter: hue-rotate(90deg); }
          40% { transform: translateX(-2px); filter: hue-rotate(180deg); }
          60% { transform: translateX(2px); filter: hue-rotate(270deg); }
          80% { transform: translateX(-2px); filter: hue-rotate(360deg); }
        }
        img.overlay-item.glitch { animation: img-glitch 0.3s infinite; }

        @keyframes slide {
          0%, 100% { transform: translateX(-50%); }
          50% { transform: translateX(-45%); }
        }
        .overlay-item.slide:not(img) { animation: slide 2s infinite ease-in-out; }

        @keyframes img-slide {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }
        img.overlay-item.slide { animation: img-slide 2s infinite ease-in-out; }

        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .overlay-item.flash { animation: flash 1s infinite; }

        @keyframes heartbeat {
          0%, 100% { transform: translateX(-50%) scale(1); }
          14% { transform: translateX(-50%) scale(1.1); }
          28% { transform: translateX(-50%) scale(1); }
          42% { transform: translateX(-50%) scale(1.1); }
          70% { transform: translateX(-50%) scale(1); }
        }
        .overlay-item.heartbeat:not(img) { animation: heartbeat 1.5s infinite; }

        @keyframes img-heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.1); }
          28% { transform: scale(1); }
          42% { transform: scale(1.1); }
          70% { transform: scale(1); }
        }
        img.overlay-item.heartbeat { animation: img-heartbeat 1.5s infinite; }
      </style>
    </head>
    <body class="overlay-window">
      <div id="overlay-container"></div>
    </body>
    </html>
  `);
  doc.close();
}

/**
 * Sets up event handlers for the overlay window
 * @param {Window} overlayWindow - The window object
 * @param {string} windowId - The window ID
 */
function setupWindowEventHandlers(overlayWindow, windowId) {
  // Handle window closing
  overlayWindow.addEventListener('beforeunload', () => {
    
    // Clean up window references
    if (windowId === "main") {
      window.overlayWindow = null;
    } else if (window.overlayWindows) {
      delete window.overlayWindows[windowId];
    }
    
    // Clean up animated elements registry
    if (window.overlayAnimatedElements) {
      window.overlayAnimatedElements = {};
    }
    
    // Clean up dice elements
    if (overlayWindow.diceElements) {
      overlayWindow.diceElements = [];
    }
  });

  // Handle window resize for responsive layouts
  overlayWindow.addEventListener('resize', () => {
    // Could implement responsive layout adjustments here if needed
  });
}

/**
 * Closes an overlay window
 * @param {string} windowId - The ID of the window to close
 */
export function closeOverlayWindow(windowId = "main") {
  
  try {
    let overlayWindow;
    
    if (windowId === "main") {
      overlayWindow = window.overlayWindow;
      if (overlayWindow && !overlayWindow.closed) {
        overlayWindow.close();
        window.overlayWindow = null;
      }
    } else {
      overlayWindow = window.overlayWindows && window.overlayWindows[windowId];
      if (overlayWindow && !overlayWindow.closed) {
        overlayWindow.close();
        if (window.overlayWindows) {
          delete window.overlayWindows[windowId];
        }
      }
    }
    
  } catch (error) {
    console.error(`${MODULE_ID} | Error closing overlay window ${windowId}:`, error);
  }
}

/**
 * Checks if an overlay window is currently open
 * @param {string} windowId - The ID of the window to check
 * @returns {boolean} Whether the window is open
 */
export function isOverlayWindowOpen(windowId = "main") {
  if (windowId === "main") {
    return window.overlayWindow && !window.overlayWindow.closed;
  } else {
    return window.overlayWindows && 
           window.overlayWindows[windowId] && 
           !window.overlayWindows[windowId].closed;
  }
}

/**
 * Gets the overlay window object
 * @param {string} windowId - The ID of the window to get
 * @returns {Window|null} The window object or null if not open
 */
export function getOverlayWindow(windowId = "main") {
  if (windowId === "main") {
    return (window.overlayWindow && !window.overlayWindow.closed) ? window.overlayWindow : null;
  } else {
    return (window.overlayWindows && 
            window.overlayWindows[windowId] && 
            !window.overlayWindows[windowId].closed) 
            ? window.overlayWindows[windowId] : null;
  }
}