// Data processing for overlay items including dice support
import { getActorDataValue } from '../utils/helpers.js';

/**
 * Processes an image item for display
 * @param {Object} item - The image item configuration
 * @param {boolean} isPremium - Whether premium features are active
 * @returns {Object} Processed image item
 */
export function processImageItem(item, isPremium) {
  return {
    type: "image",
    imagePath: item.imagePath || "",
    imageSize: item.imageSize || 100,
    top: item.top ?? 0,
    left: item.left ?? 0,
    hide: item.hide ?? false,
    order: item.order || 0,
    animation: isPremium ? (item.animation || "none") : "none",
    animationDelay: (item.animationDelay !== undefined) ? item.animationDelay : 0,
    animationDuration: item.animationDuration || 1.5,
    entranceAnimation: isPremium ? (item.entranceAnimation || "none") : "none",
    entranceDuration: item.entranceDuration || 0.5,
    entranceDelay: item.entranceDelay || 0,
    animations: isPremium ? (item.animations || []) : [],
    actorId: item.actorId || null,
    renderOrder: 0
  };
}

/**
 * Processes a static text item for display
 * @param {Object} item - The static text item configuration
 * @param {boolean} isPremium - Whether premium features are active
 * @returns {Object} Processed static item
 */
export function processStaticItem(item, isPremium) {
  return {
    type: "static",
    content: item.content || "",
    top: item.top ?? 0,
    left: item.left ?? 0,
    hide: item.hide ?? false,
    fontSize: item.fontSize || 16,
    bold: item.bold || false,
    fontFamily: item.fontFamily || "Arial, sans-serif",
    fontColor: item.fontColor || "#000000",
    fontStroke: item.fontStroke || false,
    fontStrokeColor: item.fontStrokeColor || "#000000",
    fontStrokeWidth: item.fontStrokeWidth || 1,
    dropShadow: item.dropShadow || false,
    rollAnimation: isPremium ? (item.rollAnimation || false) : false,
    rollDuration: item.rollDuration || 1000,
    rollSpeed: item.rollSpeed || 10,
    order: item.order || 0,
    animation: isPremium ? (item.animation || "none") : "none",
    animationDelay: (item.animationDelay !== undefined) ? item.animationDelay : 0,
    animationDuration: item.animationDuration || 1.5,
    entranceAnimation: isPremium ? (item.entranceAnimation || "none") : "none",
    entranceDuration: item.entranceDuration || 0.5,
    entranceDelay: item.entranceDelay || 0,
    animations: isPremium ? (item.animations || []) : [],
    actorId: item.actorId || null,
    renderOrder: 0
  };
}

/**
 * Processes a data item for display
 * @param {Object} item - The data item configuration
 * @param {boolean} isPremium - Whether premium features are active
 * @returns {Object|null} Processed data item or null if should be hidden
 */
export function processDataItem(item, isPremium) {
  // Skip processing if item should be hidden
  if (item.hide) return null;
  
  // Get the actor from the game
  const actor = game.actors.get(item.actorId);
  if (!actor) return null;
  
  // Get the text value using the helper function
  const textValue = getActorDataValue(actor, item);
  
  // Return the processed item
  return {
    type: "data",
    actorId: item.actorId,
    dataPath: item.dataPath,
    customPath: item.customPath || "",
    data: textValue,
    top: item.top ?? 0,
    left: item.left ?? 0,
    hide: item.hide ?? false,
    fontSize: item.fontSize || 16,
    bold: item.bold || false,
    fontFamily: item.fontFamily || "Arial, sans-serif",
    fontColor: item.fontColor || "#000000",
    fontStroke: item.fontStroke || false,
    fontStrokeColor: item.fontStrokeColor || "#000000",
    dropShadow: item.dropShadow || false,
    fontStrokeWidth: item.fontStrokeWidth || 1,
    order: item.order || 0,
    animation: isPremium ? (item.animation || "none") : "none",
    animationDelay: (item.animationDelay !== undefined) ? item.animationDelay : 0,
    animationDuration: item.animationDuration || 1.5,
    entranceAnimation: isPremium ? (item.entranceAnimation || "none") : "none",
    entranceDuration: item.entranceDuration || 0.5,
    entranceDelay: item.entranceDelay || 0,
    animations: isPremium ? (item.animations || []) : [],
    renderOrder: 0
  };
}

/**
 * Processes a dice roll item for display
 * @param {Object} item - The dice item configuration
 * @param {boolean} isPremium - Whether premium features are active
 * @returns {Object} Processed dice item
 */
export function processDiceItem(item, isPremium) {
  // Get the dice type configuration
  const diceConfig = getDiceConfig(item.diceType || "d20");
  
  // Determine what to display
  let displayValue = "";
  if (item.alwaysVisible && item.lastRoll) {
    displayValue = item.lastRoll.total || "?";
  } else if (!item.alwaysVisible) {
    displayValue = ""; // Hidden until roll happens
  } else {
    displayValue = diceConfig.label; // Show dice type when no roll
  }
  
  return {
    type: "dice",
    diceType: item.diceType || "d20",
    alwaysVisible: item.alwaysVisible || false,
    targetUsers: item.targetUsers || [],
    style: item.style || "diceOnly",
    displayValue: displayValue,
    lastRoll: item.lastRoll || null,
    top: item.top ?? 0,
    left: item.left ?? 0,
    hide: item.hide ?? false,
    fontSize: item.fontSize || 24,
    bold: item.bold !== false,
    fontFamily: item.fontFamily || "Impact, sans-serif",
    fontColor: item.fontColor || "#ffffff",
    fontStroke: item.fontStroke !== false,
    fontStrokeColor: item.fontStrokeColor || "#000000",
    fontStrokeWidth: item.fontStrokeWidth || 2,
    dropShadow: item.dropShadow || false,
    rollAnimation: isPremium ? (item.rollAnimation || false) : false,
    rollDuration: item.rollDuration || 1000,
    rollSpeed: item.rollSpeed || 10,
    order: item.order || 0,
    animation: isPremium ? (item.animation || "none") : "none",
    animationDelay: (item.animationDelay !== undefined) ? item.animationDelay : 0,
    animationDuration: item.animationDuration || 1.5,
    entranceAnimation: isPremium ? (item.entranceAnimation || "none") : "none",
    entranceDuration: item.entranceDuration || 0.5,
    entranceDelay: item.entranceDelay || 0,
    animations: isPremium ? (item.animations || []) : [],
    renderOrder: 0
  };
}

/**
 * Processes an HP bar item for display
 * @param {Object} item - The HP bar item configuration
 * @param {boolean} isPremium - Whether premium features are active
 * @returns {Object|null} Processed HP bar item or null if hidden
 */
export function processHpBarItem(item, isPremium) {
  if (item.hide) return null;

  const actor = game.actors.get(item.actorId);
  if (!actor) return null;

  const current = foundry.utils.getProperty(actor, 'system.attributes.hp.value') || 0;
  const max = foundry.utils.getProperty(actor, 'system.attributes.hp.max') || 1;
  const pct = Math.max(0, Math.min(1, current / max));

  return {
    type: 'hpBar',
    actorId: item.actorId,
    pct,
    barWidth: item.barWidth || 200,
    barHeight: item.barHeight || 20,
    orientation: item.orientation || 'ltr',
    rounded: item.rounded !== false,
    cornerRadius: item.cornerRadius || 4,
    outline: item.outline || false,
    outlineWidth: item.outlineWidth || 1,
    outlineColor: item.outlineColor || '#000000',
    dropShadow: item.dropShadow || false,
    gradient: item.gradient !== false,
    startColor: item.startColor || '#0094ff',
    endColor: item.endColor || '#ff0000',
    singleColor: item.singleColor || '#0094ff',
    showBackground: item.showBackground || false,
    backgroundColor: item.backgroundColor || 'transparent',
    top: item.top ?? 0,
    left: item.left ?? 0,
    hide: item.hide ?? false,
    order: item.order || 0,
    animation: isPremium ? (item.animation || 'none') : 'none',
    animationDelay: (item.animationDelay !== undefined) ? item.animationDelay : 0,
    animationDuration: item.animationDuration || 1.5,
    entranceAnimation: isPremium ? (item.entranceAnimation || 'none') : 'none',
    entranceDuration: item.entranceDuration || 0.5,
    entranceDelay: item.entranceDelay || 0,
    animations: isPremium ? (item.animations || []) : [],
    renderOrder: 0
  };
}

/**
 * Gets dice configuration for a dice type
 * @param {string} diceType - The type of dice (d4, d6, d20, etc.)
 * @returns {Object} Dice configuration
 */
function getDiceConfig(diceType) {
  const configs = {
    "d4": { label: "d4", min: 1, max: 4 },
    "d6": { label: "d6", min: 1, max: 6 },
    "d8": { label: "d8", min: 1, max: 8 },
    "d10": { label: "d10", min: 1, max: 10 },
    "d12": { label: "d12", min: 1, max: 12 },
    "d20": { label: "d20", min: 1, max: 20 },
    "d100": { label: "d100", min: 1, max: 100 }
  };
  
  return configs[diceType] || configs["d20"];
}