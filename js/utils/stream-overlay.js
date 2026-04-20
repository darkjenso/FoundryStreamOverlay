/**
 * Stream Page Overlay
 * -------------------
 * Detects when Foundry is loaded at /stream and injects the configured overlay
 * directly into the page, so OBS can capture [foundry-url]/stream with the
 * overlay rendered on top of a transparent background.
 *
 * OBS setup: Browser Source → [foundry-url]/stream → tick "Allow transparency"
 */
import { MODULE_ID } from '../core/constants.js';
import { renderOverlayContent } from '../overlay/window-management.js';

const CONTAINER_ID = "fso-stream-overlay";

/**
 * Returns true when the current page is the Foundry /stream view.
 */
export function isStreamPage() {
  // game.view === "stream" is the authoritative check in Foundry v12/v13/v14
  if (typeof game !== "undefined" && game.view === "stream") return true;
  // Fallback: URL path contains /stream
  return window.location.pathname.includes("/stream");
}

/**
 * Apply inline styles to a container element so it covers the full viewport.
 * Using inline styles means we don't depend on any CSS class being present —
 * the container is always correctly positioned.
 */
function applyContainerStyles(container) {
  container.style.cssText = [
    "position: fixed !important",
    "top: 0 !important",
    "left: 0 !important",
    "width: 100vw !important",
    "height: 100vh !important",
    "pointer-events: none !important",
    "z-index: 2147483647 !important",   // max possible z-index
    "background: transparent !important",
    "overflow: visible !important",     // don't clip items near edges
    "display: block !important",
  ].join("; ");
}

/**
 * Initialise the stream-page overlay.
 * Called once from the "ready" hook — only runs when actually on /stream.
 */
export function initStreamPageOverlay() {
  if (!isStreamPage()) return;

  // Read settings (all default to sensible values if not yet saved)
  let enabled, windowId, hideChat, hideSidebar;
  try {
    enabled     = game.settings.get(MODULE_ID, "streamOverlayEnabled");
    windowId    = game.settings.get(MODULE_ID, "streamWindowId") || "main";
    hideChat    = game.settings.get(MODULE_ID, "streamHideChat");
    hideSidebar = game.settings.get(MODULE_ID, "streamHideSidebar");
  } catch (err) {
    // Settings not yet registered — use safe defaults
    console.warn(`${MODULE_ID} | Could not read stream settings, using defaults:`, err);
    enabled     = true;
    windowId    = "main";
    hideChat    = true;
    hideSidebar = true;
  }

  if (!enabled) {
    console.log(`${MODULE_ID} | Stream overlay disabled in settings`);
    return;
  }

  console.log(`${MODULE_ID} | Initialising stream-page overlay (windowId: ${windowId})`);

  // ── Body classes that CSS rules react to ────────────────────────────────
  document.body.classList.add("fso-stream-active");
  if (hideChat)    document.body.classList.add("fso-stream-hide-chat");
  if (hideSidebar) document.body.classList.add("fso-stream-hide-sidebar");

  // ── Make canvas / UI transparent so OBS sees only the overlay ───────────
  // We do this via inline styles so it works even if the module CSS hasn't
  // been applied yet, and regardless of Foundry's own stream-page CSS.
  document.documentElement.style.setProperty("background", "transparent", "important");
  document.body.style.setProperty("background", "transparent", "important");
  document.body.style.setProperty("background-color", "transparent", "important");

  // Hide the game canvas — use a separate OBS source for the scene background
  const hideTargets = ["#board", "#canvas", "canvas", "#navigation",
                       "#controls", "#players", "#hotbar", "#fps", "#pause",
                       "#chat-bubbles"];
  hideTargets.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.style.setProperty("display", "none", "important");
  });

  // Also hide the sidebar if requested
  if (hideSidebar) {
    const sidebar = document.querySelector("#sidebar");
    if (sidebar) sidebar.style.setProperty("display", "none", "important");
  }

  // Hide chat log cards if requested (Foundry stream sometimes shows sidebar)
  if (hideChat) {
    const chatLog  = document.querySelector("#chat-log");
    const chatForm = document.querySelector("#chat-form");
    if (chatLog)  chatLog.style.setProperty("display",  "none", "important");
    if (chatForm) chatForm.style.setProperty("display", "none", "important");
  }

  // ── Overlay container ────────────────────────────────────────────────────
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
  }
  // Always apply inline styles — independent of CSS class detection
  applyContainerStyles(container);

  // ── Render ───────────────────────────────────────────────────────────────
  function render() {
    try {
      // Re-apply container styles on each render in case something resets them
      applyContainerStyles(container);
      renderOverlayContent(container, windowId, document);
    } catch (err) {
      console.error(`${MODULE_ID} | Stream overlay render error:`, err);
    }
  }

  // Initial render
  render();

  // Live updates
  Hooks.on(`${MODULE_ID}.dataUpdated`, render);
  Hooks.on("updateActor",  render);
  Hooks.on("updateToken",  render);
  Hooks.on("updateCombat", render);

  // Re-hide canvas elements added dynamically by Foundry after ready
  const observer = new MutationObserver(() => {
    hideTargets.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && el.style.display !== "none") {
        el.style.setProperty("display", "none", "important");
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: false });

  console.log(`${MODULE_ID} | Stream-page overlay ready`);
}
