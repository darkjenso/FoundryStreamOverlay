// Optimized template helpers for Foundry Stream Overlay
import { FONT_FAMILIES, PREMIUM_FONTS } from '../core/constants.js';

/**
 * Register essential Handlebars helpers
 */
export function registerTemplateHelpers() {

  // Basic comparison helpers
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

  // Object helpers
  Handlebars.registerHelper("lookup", function(obj, key) {
    return obj && obj[key];
  });

  Handlebars.registerHelper("len", function(obj) {
    if (!obj) return 0;
    if (Array.isArray(obj)) return obj.length;
    if (typeof obj === 'object') return Object.keys(obj).length;
    return 0;
  });

  Handlebars.registerHelper("hasItems", function(obj) {
    if (!obj) return false;
    if (Array.isArray(obj)) return obj.length > 0;
    if (typeof obj === 'object') return Object.keys(obj).length > 0;
    return false;
  });

  // Premium helper
  Handlebars.registerHelper("isPremium", function() {
    try {
      const { isPremiumActive } = require('../premium/validation.js');
      return isPremiumActive();
    } catch (error) {
      return false;
    }
  });

}

/**
 * Get font data for templates
 */
export function getFontData(includePremium = false) {
  const fonts = [...FONT_FAMILIES];
  
  if (includePremium) {
    fonts.push(...PREMIUM_FONTS);
  }
  
  return {
    fontFamilies: fonts,
    fontCount: fonts.length
  };
}

/**
 * Initialize template helper event handlers (optimized)
 */
export function initializeTemplateHelperEvents(html) {
  // Custom path toggle
  html.on('change', '.fso-data-path-select', function() {
    const select = $(this);
    const customSection = select.closest('.fso-data-selector').find('.fso-custom-path-section');
    
    if (select.val() === 'custom') {
      customSection.slideDown(200);
      customSection.find('.fso-custom-path-input').focus();
    } else {
      customSection.slideUp(200);
    }
  });

  // Outline toggle
  html.on('change', '.fso-outline-toggle', function() {
    const checkbox = $(this);
    const outlineOptions = checkbox.closest('.fso-style-row').find('.fso-outline-options');
    
    if (checkbox.is(':checked')) {
      outlineOptions.slideDown(200);
    } else {
      outlineOptions.slideUp(200);
    }
  });

  // Gradient toggle for HP bars
  html.on('change', '.fso-gradient-toggle', function() {
    const checkbox = $(this);
    const row = checkbox.closest('.fso-config-row');
    row.find('.fso-gradient-options').toggle(checkbox.is(':checked'));
    row.find('.fso-single-color').toggle(!checkbox.is(':checked'));
  });

    // Background toggle for HP bars
  html.on('change', '.fso-bg-toggle', function() {
    const checkbox = $(this);
    const row = checkbox.closest('.fso-config-row');
    row.find('.fso-bg-color').toggle(checkbox.is(':checked'));
  });

    // Rounded corner toggle for HP bars
  html.on('change', '.fso-rounded-toggle', function() {
    const checkbox = $(this);
    const row = checkbox.closest('.fso-config-row');
    row.next('.fso-radius-row').toggle(checkbox.is(':checked'));
  });

  // Explore actor data
  html.on('click', '.fso-explore-actor-data', async function(e) {
    e.preventDefault();
    const button = $(this);
    const dataSelector = button.closest('.fso-data-selector');
    const actorSelect = dataSelector.find('.fso-actor-select');
    const actorId = actorSelect.val();
    
    if (!actorId) {
      ui.notifications.warn("Please select a character first.");
      return;
    }
    
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error("Unable to find the selected character.");
      return;
    }
    
    // Import the helper function dynamically
    const { formatActorData } = await import('./helpers.js');
    const dataDisplay = formatActorData(actor);
    
    new Dialog({
      title: `Data Paths for ${actor.name}`,
      content: `
        <div style="height: 400px; overflow-y: auto; font-family: monospace; white-space: pre-wrap; font-size: 12px;">
          ${dataDisplay}
        </div>
        <p style="margin-top: 10px;">
          <em>Use these paths with the "Custom Data Path" option to display specific actor data.</em>
        </p>
      `,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "Close"
        }
      },
      width: 600
    }).render(true);
  });
}