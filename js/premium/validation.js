/**
 * validation.js  —  FREE version
 *
 * isPremiumActive() always returns false.
 * Upgrade to Foundry Stream Overlay Pro for all features.
 *
 * ────────────────────────────────────────────────
 * PACKAGING NOTE FOR DEVELOPER
 *   Free build : ship this file as-is
 *   Pro build  : replace with validation-pro.js
 * ────────────────────────────────────────────────
 */

// ── Core flag ──────────────────────────────────────────────────────────────

/**
 * Returns whether pro features are active.
 * Always false in the free version.
 */
export function isPremiumActive() {
  return false;
}

// ── Feature gates ──────────────────────────────────────────────────────────

/**
 * Whether the user may create an additional layout/scene.
 * Free users are limited to 1 (the Default scene).
 */
export function canCreateLayout(layouts) {
  if (Object.keys(layouts).length > 0) {
    showPremiumRequiredDialog("Multiple scenes");
    return false;
  }
  return true;
}

/**
 * Whether the user may create an additional overlay window.
 * Free users are limited to 1 window.
 */
export function canCreateWindow(windows) {
  if (Object.keys(windows).length >= 1) {
    showPremiumRequiredDialog("Multiple overlay windows");
    return false;
  }
  return true;
}

/**
 * Filters an animation selection for non-pro users.
 * Free tier allows: none, hover, pulse, fadeIn.
 */
export function filterAnimationForPremium(_animationType, selectedAnimation) {
  const free = ["none", "hover", "pulse", "fadeIn"];
  return free.includes(selectedAnimation) ? selectedAnimation : "none";
}

/**
 * Returns true if the named feature requires Pro.
 */
export function requiresPremium(feature) {
  const proFeatures = [
    "multipleLayouts", "animations", "slideshow", "multipleWindows",
    "advancedAnimations", "triggeredAnimations", "layoutTransitions"
  ];
  return proFeatures.includes(feature);
}

// ── Upgrade dialog ─────────────────────────────────────────────────────────

/**
 * Shows a dialog explaining that a feature requires Pro.
 */
export function showPremiumRequiredDialog(featureName = "This feature") {
  new Dialog({
    title: "Pro Feature",
    content: `
      <div style="text-align:center; padding: 8px 0 4px;">
        <p style="font-size:15px; margin:0 0 10px;">
          <strong>${featureName}</strong> is available in
          <strong>Foundry Stream Overlay Pro</strong>.
        </p>
        <p style="color:#555; margin:0 0 14px;">
          Pro unlocks unlimited scenes, advanced animations, slideshow,
          multiple windows, and more.
        </p>
      </div>
    `,
    buttons: {
      upgrade: {
        icon: '<i class="fas fa-gem"></i>',
        label: "Get Pro",
        callback: () => window.open("https://www.patreon.com/c/jenzelta", "_blank")
      },
      close: {
        icon: '<i class="fas fa-times"></i>',
        label: "Not now"
      }
    },
    default: "upgrade",
    width: 420
  }).render(true);
}

// ── No-op stubs (keep module-init.js call sites working) ──────────────────

export async function syncPremiumStatus() {}
export function initializePremiumMonitoring() {}
export async function validateActivationKey() { return false; }
export async function getPremiumStatusDetails() { return { isPremium: false }; }
export async function checkKeyExpiration() { return { isPermanent: true }; }
export async function scheduleExpirationCheck() {}
