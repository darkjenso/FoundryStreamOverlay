/**
 * validation-pro.js  —  PRO version
 *
 * isPremiumActive() always returns true — all features unlocked.
 * Distributed to subscribers. Do not redistribute.
 *
 * ────────────────────────────────────────────────
 * PACKAGING NOTE FOR DEVELOPER
 *   Pro build : copy this file over validation.js
 *   Free build: use validation.js as-is
 * ────────────────────────────────────────────────
 */

// ── Core flag ──────────────────────────────────────────────────────────────

export function isPremiumActive() {
  return true;
}

// ── Feature gates — all open ───────────────────────────────────────────────

export function canCreateLayout() {
  return true;
}

export function canCreateWindow() {
  return true;
}

export function filterAnimationForPremium(_animationType, selectedAnimation) {
  return selectedAnimation;
}

export function requiresPremium() {
  return false;
}

export function showPremiumRequiredDialog() {
  // Pro users have access to all features — this should never be called.
}

// ── No-op stubs ────────────────────────────────────────────────────────────

export async function syncPremiumStatus() {}
export function initializePremiumMonitoring() {}
export async function validateActivationKey() { return true; }
export async function getPremiumStatusDetails() { return { isPremium: true, statusMessage: "Pro — all features active" }; }
export async function checkKeyExpiration() { return { isPermanent: true }; }
export async function scheduleExpirationCheck() {}
