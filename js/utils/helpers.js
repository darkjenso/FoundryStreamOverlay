// Utility helper functions for Foundry Stream Overlay
import { SYSTEM_EXAMPLES } from '../core/constants.js';

/**
 * Gets system-specific data path examples
 * @param {string} gameSystem - The game system ID
 * @returns {Array} Array of example data paths for the system
 */
export function getSystemExamples(gameSystem) {
  return SYSTEM_EXAMPLES[gameSystem] || [
    { label: "Name", path: "name" },
    { label: "Current HP", path: "system.attributes.hp.value" },
    { label: "Look for 'system.attributes', 'system.resources', etc.", path: "" }
  ];
}

/**
 * Formats actor data for debugging display
 * @param {Actor} actor - The actor to format data for
 * @param {string} prefix - Optional prefix for paths
 * @param {number} indent - Current indentation level
 * @returns {string} Formatted HTML string
 */
export function formatActorData(actor, prefix = "", indent = 0) {
  const data = {
    name: actor.name,
    system: actor.system
  };
  
  const formatObject = (obj, path = "", level = 0) => {
    const padding = "  ".repeat(level);
    let output = "";
    
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (typeof value === "object" && value !== null) {
        if (level < 5) {
          output += `${padding}${key}: {\n`;
          output += formatObject(value, fullPath, level + 1);
          output += `${padding}}\n`;
        } else {
          output += `${padding}${key}: { ... }\n`;
        }
      } else {
        output += `${padding}${key}: <span style="color:#4a6;">${value}</span> <span style="color:#999;">(Path: ${fullPath})</span>\n`;
      }
    }
    
    return output;
  };
  
  return formatObject(data);
}

/**
 * Validates layout name
 * @param {string} name - The layout name to validate
 * @param {Object} existingLayouts - Object of existing layouts
 * @param {string} currentName - Current name (for renames)
 * @returns {Object} Validation result with isValid and message
 */
export function validateLayoutName(name, existingLayouts, currentName = null) {
  if (!name || name.trim() === "") {
    return { isValid: false, message: "Layout name cannot be empty" };
  }
  
  const maxLength = 50;
  if (name.length > maxLength) {
    return { isValid: false, message: `Layout name too long. Maximum length is ${maxLength} characters.` };
  }
  
  if (currentName !== name && existingLayouts[name]) {
    return { isValid: false, message: "A layout with that name already exists." };
  }
  
  return { isValid: true, message: "" };
}

/**
 * Sanitizes and validates custom data paths
 * @param {string} path - The custom data path
 * @returns {string} Cleaned data path
 */
export function sanitizeDataPath(path) {
  if (!path) return "";
  
  return path.trim().replace(/^["']|["']$/g, '');
}

/**
 * Gets the actual text value from an actor using a data path
 * @param {Actor} actor - The actor to get data from
 * @param {Object} item - The overlay item configuration
 * @returns {string} The text value to display
 */
export function getActorDataValue(actor, item) {
  let textValue;
  
  try {
    if (item.dataPath === "name") {
      textValue = actor.name;
} else if (item.dataPath === "hp") {
    let currentHP = foundry.utils.getProperty(actor, 'system.attributes.hp.value');
    let maxHP = foundry.utils.getProperty(actor, 'system.attributes.hp.max');
    // Support alternative path conventions
    if (currentHP === undefined) {
      currentHP = foundry.utils.getProperty(actor, 'system.attribs.hp.value');
      maxHP = foundry.utils.getProperty(actor, 'system.attribs.hp.max');
    }
    textValue = `${currentHP} / ${maxHP}`;
  } else if (item.dataPath === "heroPoints") {
    const current = foundry.utils.getProperty(actor, 'system.resources.heroPoints.value');
    const max = foundry.utils.getProperty(actor, 'system.resources.heroPoints.max');
    textValue = `${current} / ${max}`;
  } else if (item.dataPath === "custom" && item.customPath) {
      const path = sanitizeDataPath(item.customPath);
      if (path) {
        textValue = foundry.utils.getProperty(actor, path);
        
        
        // Convert objects to readable format
        if (textValue && typeof textValue === 'object') {
          try {
            textValue = JSON.stringify(textValue).slice(0, 50);
            if (textValue.length === 50) textValue += '...';
          } catch (e) {
            textValue = '[Object]';
          }
        }
      } else {
        textValue = 'N/A (Empty Path)';
      }
    } else {
      textValue = foundry.utils.getProperty(actor, item.dataPath);
    }
  } catch (error) {
    console.error(`Error getting data for ${item.dataPath || item.customPath}:`, error);
    textValue = 'Error';
  }
  
  // Add label if configured
  if (item.addLabel && textValue !== 'Error') {
    const label = getDataPathLabel(item.dataPath, item.customPath);
    textValue = label ? `${label}: ${textValue}` : textValue;
  }
  
  // Handle null/undefined values
  if (textValue === null || textValue === undefined) {
    textValue = "N/A";
  }
  
  // Convert to string
  if (typeof textValue !== 'string') {
    textValue = String(textValue);
  }
  
  return textValue;
}

/**
 * Gets a human-readable label for a data path
 * @param {string} dataPath - The data path
 * @param {string} customPath - The custom path (if dataPath is "custom")
 * @returns {string} Human-readable label
 */
export function getDataPathLabel(dataPath, customPath = "") {
  const labelMap = {
    "name": "Name",
    "system.attributes.hp.value": "HP",
    "system.attributes.hp.max": "Max HP",
    "hp": "HP",
    "system.attributes.ac.value": "AC",
    "system.details.level": "Level",
    "system.details.level.value": "Level",
    "system.details.race": "Race",
    "system.details.xp.value": "XP",
    "system.details.xp.max": "Max XP",
    "system.abilities.str.value": "STR",
    "system.abilities.dex.value": "DEX",
    "system.abilities.con.value": "CON",
    "system.abilities.int.value": "INT",
    "system.abilities.wis.value": "WIS",
    "system.abilities.cha.value": "CHA",
    "system.attributes.perception.value": "Perception",
    "system.saves.fortitude.value": "Fortitude",
    "system.saves.reflex.value": "Reflex",
    "system.saves.will.value": "Will",
    "system.attributes.prof": "Proficiency",
    "system.resources.heroPoints.value": "Hero Points",
    "system.resources.heroPoints.max": "Max Hero Points",
    "heroPoints": "Hero Points",
    "system.attribs.hp.value": "HP",
    "system.attribs.hp.max": "Max HP",
    "system.attribs.mp.value": "MP",
    "system.attribs.san.value": "Sanity",
    "system.attribs.san.max": "Max Sanity",
    "system.attribs.lck.value": "Luck",
    "system.attribs.mov.value": "Movement",
    "system.attribs.db.value": "Damage Bonus",
    "system.infos.occupation": "Occupation",
    "system.infos.age": "Age",
    "system.infos.residence": "Residence",
    "data.details.species.name": "Species",
    "data.bennies.max": "Bennies",
    "data.attributes.agility.die.sides": "Agility Die",
    "data.attributes.agility.modifier": "Agility Mod",
    "data.attributes.smarts.die.sides": "Smarts Die",
    "data.attributes.smarts.modifier": "Smarts Mod",
    "data.attributes.might.die.sides": "Might Die",
    "data.attributes.might.modifier": "Might Mod",
    "data.attributes.spirit.die.sides": "Spirit Die",
    "data.attributes.spirit.modifier": "Spirit Mod",
    "data.attributes.vigor.die.sides": "Vigor Die",
    "data.attributes.vigor.modifier": "Vigor Mod",
    "data.stats.speed.adjusted": "Speed",
    "data.stats.parry.value": "Parry",
    "data.stats.toughness.value": "Toughness",
    "data.stats.toughness.armor": "Armor",
    "system.header.health.value": "HP",
    "system.header.health.max": "Max HP",
    "system.header.stress.value": "Stress",
    "system.attributes.agl.value": "AGL",
    "system.attributes.emp.value": "EMP",
    "system.attributes.str.value": "STR",
    "system.attributes.wit.value": "WIT",
    "system.general.career.value": "Career",
    "system.general.cash.value": "Cash",
    "system.consumables.air.value": "Air",
    "system.consumables.food.value": "Food",
    "system.consumables.water.value": "Water",
    "system.consumables.power.value": "Power",
    "system.skills.closeCbt.value": "Close Combat",
    "system.skills.rangedCbt.value": "Ranged Combat",
    "system.skills.medicalAid.value": "Medical Aid",
    "system.skills.perception.total": "Perception Skill",
    "system.attributes.hp.temp": "Temp HP",
    "system.attributes.prof": "Proficiency",
    "system.details.subclass": "Subclass",
    "system.resources.heroPoints.value": "Hero Points",
    "system.resources.heroPoints.max": "Max Hero Points",
    "heroPoints": "Hero Points",
    "custom": customPath || "Custom"
  };
  
  return labelMap[dataPath] || '';
}

/**
 * Creates a deep copy of an object
 * @param {Object} obj - Object to copy
 * @returns {Object} Deep copy of the object
 */
export function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generates a unique ID
 * @returns {string} Unique ID string
 */
export function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Safely gets a nested property value
 * @param {Object} obj - Object to get property from
 * @param {string} path - Dot-separated path to property
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} Property value or default
 */
export function safeGet(obj, path, defaultValue = undefined) {
  try {
    return foundry.utils.getProperty(obj, path) ?? defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Checks if a string is a valid JSON
 * @param {string} str - String to check
 * @returns {boolean} Whether the string is valid JSON
 */
export function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Clamps a number between min and max values
 * @param {number} num - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped number
 */
export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

/**
 * Converts a hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {Object} RGB object with r, g, b properties
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Converts RGB to hex color
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hex color string
 */
export function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Shows a temporary notification with auto-save feedback
 * @param {string} message - Message to show
 * @param {number} duration - Duration in milliseconds
 */
export function showAutoSaveFeedback(message = "Auto-saved", duration = 1000) {
  $('.auto-save-feedback').remove();
  
  const flashFeedback = $(`<div class="auto-save-feedback">${message}</div>`);
  $('body').append(flashFeedback);
  
  setTimeout(() => {
    flashFeedback.css('opacity', 1);
    setTimeout(() => {
      flashFeedback.css('opacity', 0);
      setTimeout(() => flashFeedback.remove(), 300);
    }, duration);
  }, 10);
}

/**
 * Escapes HTML in a string
 * @param {string} unsafe - Unsafe HTML string
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Downloads content as a file
 * @param {string} content - Content to download
 * @param {string} filename - Name of the file
 * @param {string} contentType - MIME type of the content
 */
export function downloadAsFile(content, filename, contentType = 'application/json') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}