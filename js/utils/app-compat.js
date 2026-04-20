/**
 * Returns the appropriate base Application class depending on the Foundry version.
 * - Foundry v14+: ApplicationV2 with HandlebarsApplicationMixin (native popout support, no deprecation warnings)
 * - Foundry v12/v13: FormApplication (unchanged behaviour)
 *
 * Usage:
 *   import { getBaseApplication } from '../utils/app-compat.js';
 *   export class MyDialog extends getBaseApplication() { ... }
 */
/**
 * Returns the base application class.
 * FormApplication still works on v14 (deprecated until v16, not removed).
 * Full ApplicationV2 migration requires a much larger refactor of templates,
 * form handling, and constructor patterns — deferred for a future major version.
 */
export function getBaseApplication() {
  return FormApplication;
}

/**
 * Close any existing instance of an application by its registered id.
 * Works across both v13 (ui.windows) and v14 (foundry.applications.instances).
 * @param {string} appId  The application id string (e.g. "foundrystreamoverlay-config")
 */
export function closeExistingById(appId) {
  // v14: foundry.applications.instances is a Map keyed by appId
  if (typeof foundry !== "undefined" && foundry.applications?.instances instanceof Map) {
    const existing = foundry.applications.instances.get(appId);
    if (existing) existing.close();
  }
  // v13 fallback: ui.windows is a plain object keyed by appId
  if (typeof ui !== "undefined" && ui.windows) {
    for (const app of Object.values(ui.windows)) {
      if (app.id === appId || app.options?.id === appId) {
        app.close();
      }
    }
  }
}

/**
 * Returns true when running on Foundry v14 or later.
 */
export function isV14() {
  return (
    typeof foundry !== "undefined" &&
    foundry.applications?.api?.ApplicationV2 !== undefined
  );
}

/**
 * Builds the defaultOptions / DEFAULT_OPTIONS block for both v13 (FormApplication)
 * and v14 (ApplicationV2). Pass the result into the class as appropriate.
 *
 * @param {object} opts  The options you would normally put in defaultOptions
 * @returns {object}
 */
export function buildAppOptions(opts) {
  if (isV14()) {
    // ApplicationV2 uses PARTS for template, window for title, etc.
    return {
      window: { title: opts.title ?? "" },
      position: {
        width: opts.width ?? "auto",
        height: opts.height ?? "auto"
      },
      ...opts
    };
  }
  return opts;
}
