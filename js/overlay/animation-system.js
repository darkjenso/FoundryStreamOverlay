// Animation system for overlay items - FIXED VERSION
import { MODULE_ID, ANIMATION_TYPES } from '../core/constants.js';
import OverlayData from '../../data-storage.js';

/**
 * Renders an item with complex animations
 * @param {Object} item - The item configuration
 * @param {HTMLElement} element - The DOM element
 * @param {Window} overlayWindow - The overlay window
 */
export function renderItemWithAnimations(item, element, overlayWindow) {
  const animations = item.animations || [];
  
  
  // Store reference to this element for the item's actorId
  if (item.actorId) {
    if (!window.overlayAnimatedElements) {
      window.overlayAnimatedElements = {};
    }
    if (!window.overlayAnimatedElements[item.actorId]) {
      window.overlayAnimatedElements[item.actorId] = [];
    }
    window.overlayAnimatedElements[item.actorId].push({
      element: element,
      item: item
    });
  }
  
  // Get continuous animations
  const continuousAnims = animations.filter(a => a.type === "continuous" && a.animation !== "none");
  
  // Handle entrance animations separately
  const entranceAnims = animations.filter(a => a.type === "entrance" && a.animation !== "none");
  
  
  if (entranceAnims.length > 0) {
    const entranceAnim = entranceAnims[0];
    
    
    // Apply entrance animation
    element.classList.add(entranceAnim.animation);
    element.style.animationDelay = `${entranceAnim.delay || 0}s`;
    element.style.animationDuration = `${entranceAnim.duration || 0.5}s`;
    element.style.animationIterationCount = "1";
    element.style.animationFillMode = "forwards";
    
    // Set up transition to continuous animations after entrance completes
    element.addEventListener('animationend', () => {
      
      // Remove entrance animation class
      element.classList.remove(entranceAnim.animation);
      
      // Reset animation properties
      element.style.animationName = "";
      element.style.animationDelay = "";
      element.style.animationDuration = "";
      element.style.animationIterationCount = "";
      element.style.animationFillMode = "";
      
      // Force reflow to ensure animation restarts
      void element.offsetWidth;
      
      // Apply continuous animations if any exist
      if (continuousAnims.length > 0) {
        applyAllContinuousAnimations(continuousAnims, element);
      }
    }, { once: true });
  } 
  // If no entrance animation but there are continuous animations, apply them immediately
  else if (continuousAnims.length > 0) {
    applyAllContinuousAnimations(continuousAnims, element);
  }
  
  // FIXED: Also handle legacy animation properties for backward compatibility
  const legacyAnimation = item.animation || "none";
  const legacyEntranceAnimation = item.entranceAnimation || "none";
  
  if (animations.length === 0 && (legacyAnimation !== "none" || legacyEntranceAnimation !== "none")) {
    
    if (legacyEntranceAnimation !== "none") {
      element.classList.add(legacyEntranceAnimation);
      element.style.animationDelay = `${item.entranceDelay || 0}s`;
      element.style.animationDuration = `${item.entranceDuration || 0.5}s`;
      element.style.animationIterationCount = "1";
      element.style.animationFillMode = "forwards";
      
      if (legacyAnimation !== "none") {
        element.addEventListener('animationend', () => {
          element.classList.remove(legacyEntranceAnimation);
          void element.offsetWidth;
          element.classList.add(legacyAnimation);
          element.style.animationDelay = `${item.animationDelay || 0}s`;
          element.style.animationDuration = `${item.animationDuration || 1.5}s`;
          element.style.animationIterationCount = "infinite";
        }, { once: true });
      }
    } else if (legacyAnimation !== "none") {
      element.classList.add(legacyAnimation);
      element.style.animationDelay = `${item.animationDelay || 0}s`;
      element.style.animationDuration = `${item.animationDuration || 1.5}s`;
      element.style.animationIterationCount = "infinite";
    }
  }
}

/**
 * Applies multiple continuous animations to an element
 * @param {Array} animations - Array of animation configurations
 * @param {HTMLElement} element - The DOM element to animate
 */
function applyAllContinuousAnimations(animations, element) {
  if (!animations.length) return;
  
  
  if (animations.length > 1) {
    // Multiple animations - create combined CSS
    element.setAttribute('data-animations', JSON.stringify(animations.map(a => a.animation)));
    
    if (element.tagName.toLowerCase() === 'img') {
      applyMultipleImageAnimations(animations, element);
    } else {
      applyMultipleTextAnimations(animations, element);
    }
  } else if (animations.length === 1) {
    // Single animation - apply directly with enhanced logic
    const anim = animations[0];
    
    // FIXED: Apply animation class and set properties properly
    element.classList.add(anim.animation);
    element.style.animationDelay = `${anim.delay || 0}s`;
    element.style.animationDuration = `${anim.duration || getDefaultDuration(anim.animation)}s`;
    element.style.animationIterationCount = "infinite";
    element.style.animationTimingFunction = getDefaultTimingFunction(anim.animation);
  }
}

/**
 * Gets default duration for animations
 * @param {string} animationType - The animation type
 * @returns {number} Default duration in seconds
 */
function getDefaultDuration(animationType) {
  const durations = {
    hover: 2,
    pulse: 1.5,
    heartbeat: 1.5,
    rotate: 3,
    wiggle: 0.8,
    slide: 2,
    flash: 1,
    shake: 0.5,
    shimmer: 1.5,
    breathe: 3,
    emphasis: 1,
    jitter: 0.2,
    glitch: 0.3
  };
  return durations[animationType] || 1.5;
}

/**
 * Gets default timing function for animations
 * @param {string} animationType - The animation type
 * @returns {string} CSS timing function
 */
function getDefaultTimingFunction(animationType) {
  const timingFunctions = {
    hover: 'ease-in-out',
    pulse: 'ease-in-out',
    heartbeat: 'ease-in-out',
    rotate: 'linear',
    wiggle: 'ease-in-out',
    slide: 'ease-in-out',
    flash: 'ease-in-out',
    shake: 'ease-in-out',
    shimmer: 'ease-in-out',
    breathe: 'ease-in-out',
    emphasis: 'ease-in-out',
    jitter: 'ease-in-out',
    glitch: 'ease-in-out'
  };
  return timingFunctions[animationType] || 'ease-in-out';
}

/**
 * Applies multiple animations to text elements
 * @param {Array} animations - Array of animation configurations
 * @param {HTMLElement} element - The text element
 */
function applyMultipleTextAnimations(animations, element) {
  const styleId = `style-${Math.random().toString(36).substring(2, 9)}`;
  element.setAttribute('data-style-id', styleId);
  
  // FIXED: Get the overlay window document properly
  const doc = element.ownerDocument || window.overlayWindow?.document || document;
  const styleEl = doc.createElement('style');
  styleEl.id = styleId;
  
  let transformProperties = [];
  let filterProperties = [];
  let opacityEffect = '';
  
  // FIXED: Handle all animation types
  animations.forEach(anim => {
    switch(anim.animation) {
      case 'hover':
        transformProperties.push('translateY(-5px)');
        break;
      case 'jitter':
        transformProperties.push('translate(1px, 1px)');
        break;
      case 'emphasis':
        transformProperties.push('scale(1.1)');
        break;
      case 'wiggle':
        transformProperties.push('rotate(3deg)');
        break;
      case 'pulse':
        transformProperties.push('scale(1.2)');
        break;
      case 'breathe':
        transformProperties.push('scale(1.05)');
        break;
      case 'shake':
        transformProperties.push('translateY(-2px)');
        break;
      case 'rotate':
        transformProperties.push('rotate(180deg)');
        break;
      case 'slide':
        transformProperties.push('translateX(5px)');
        break;
      case 'shimmer':
        opacityEffect = 'opacity: 0.5;';
        break;
      case 'glitch':
        filterProperties.push('hue-rotate(180deg)');
        transformProperties.push('translateX(2px)');
        break;
      case 'flash':
        opacityEffect = 'opacity: 0.3;';
        break;
    }
  });
  
  const transformValue = transformProperties.length > 0 ? transformProperties.join(' ') : '';
  const filterValue = filterProperties.length > 0 ? filterProperties.join(' ') : '';
  
  styleEl.textContent = `
    @keyframes combined-${styleId} {
      0% { 
        transform: translateX(-50%); 
        ${filterProperties.length > 0 ? 'filter: none;' : ''}
        ${opacityEffect ? 'opacity: 1;' : ''}
      }
      50% { 
        transform: translateX(-50%) ${transformValue}; 
        ${filterValue ? `filter: ${filterValue};` : ''}
        ${opacityEffect}
      }
      100% { 
        transform: translateX(-50%); 
        ${filterProperties.length > 0 ? 'filter: none;' : ''}
        ${opacityEffect ? 'opacity: 1;' : ''}
      }
    }
    
    [data-style-id="${styleId}"] {
      animation: combined-${styleId} 2s infinite ease-in-out;
    }
  `;
  
  doc.head.appendChild(styleEl);
}

/**
 * Applies multiple animations to image elements
 * @param {Array} animations - Array of animation configurations
 * @param {HTMLElement} element - The image element
 */
function applyMultipleImageAnimations(animations, element) {
  const styleId = `style-${Math.random().toString(36).substring(2, 9)}`;
  element.setAttribute('data-style-id', styleId);
  
  // FIXED: Get the overlay window document properly
  const doc = element.ownerDocument || window.overlayWindow?.document || document;
  const styleEl = doc.createElement('style');
  styleEl.id = styleId;
  
  let transformProperties = [];
  let filterProperties = [];
  let opacityEffect = '';
  
  // FIXED: Handle all animation types for images
  animations.forEach(anim => {
    switch(anim.animation) {
      case 'hover':
        transformProperties.push('translateY(-5px)');
        break;
      case 'jitter':
        transformProperties.push('translate(1px, 1px)');
        break;
      case 'emphasis':
        transformProperties.push('scale(1.1)');
        break;
      case 'wiggle':
        transformProperties.push('rotate(3deg)');
        break;
      case 'pulse':
        transformProperties.push('scale(1.2)');
        break;
      case 'breathe':
        transformProperties.push('scale(1.05)');
        break;
      case 'shake':
        transformProperties.push('translateY(-2px)');
        break;
      case 'rotate':
        transformProperties.push('rotate(180deg)');
        break;
      case 'slide':
        transformProperties.push('translateX(10px)');
        break;
      case 'shimmer':
        opacityEffect = 'opacity: 0.5;';
        break;
      case 'glitch':
        filterProperties.push('hue-rotate(180deg)');
        transformProperties.push('translateX(2px)');
        break;
      case 'flash':
        opacityEffect = 'opacity: 0.3;';
        break;
    }
  });
  
  const transformValue = transformProperties.length > 0 ? transformProperties.join(' ') : '';
  const filterValue = filterProperties.length > 0 ? filterProperties.join(' ') : '';
  
  styleEl.textContent = `
    @keyframes combined-${styleId} {
      0% { 
        transform: translate(0, 0); 
        ${filterProperties.length > 0 ? 'filter: none;' : ''}
        ${opacityEffect ? 'opacity: 1;' : ''}
      }
      50% { 
        transform: ${transformValue}; 
        ${filterValue ? `filter: ${filterValue};` : ''}
        ${opacityEffect}
      }
      100% { 
        transform: translate(0, 0); 
        ${filterProperties.length > 0 ? 'filter: none;' : ''}
        ${opacityEffect ? 'opacity: 1;' : ''}
      }
    }
    
    [data-style-id="${styleId}"] {
      animation: combined-${styleId} 2s infinite ease-in-out;
    }
  `;
  
  doc.head.appendChild(styleEl);
}

/**
 * Triggers HP-specific animations
 * @param {string} actorId - The actor ID
 * @param {string} animationType - The type of animation (damage/healing)
 * @param {number} oldValue - The old HP value
 * @param {number} newValue - The new HP value
 */
export function triggerHPAnimation(actorId, animationType, oldValue, newValue) {
  if (!window.overlayWindow || window.overlayWindow.closed) return;
  
  const container = window.overlayWindow.document.getElementById("overlay-container");
  if (!container) return;
  
  const layouts = OverlayData.getLayouts();
  const activeLayout = OverlayData.getWindowLayout("main");
  const items = layouts[activeLayout] || [];
  
  const hpItems = items.filter(item => 
    item.type === "data" && 
    item.actorId === actorId && 
    (item.dataPath.includes("hp") || item.dataPath === "system.attributes.hp.value")
  );
  
  if (!hpItems.length) return;
  
  const doc = window.overlayWindow.document;
  const elements = Array.from(doc.querySelectorAll(".overlay-item"));
  
  hpItems.forEach(hpItem => {
    const matchingElement = elements.find(el => {
      return el.style.top === `${hpItem.top}px` && 
             el.style.left === `${hpItem.left}px` &&
             el.textContent.includes(String(newValue));
    });
    
    if (matchingElement) {
      matchingElement.classList.remove("hp-damage", "hp-healing");
      
      void matchingElement.offsetWidth;
      
      matchingElement.classList.add(`hp-${animationType}`);
      
      const changeAmount = Math.abs(newValue - oldValue);
      matchingElement.dataset.changeAmount = changeAmount;
      
      setTimeout(() => {
        matchingElement.classList.remove(`hp-${animationType}`);
        delete matchingElement.dataset.changeAmount;
      }, 2000); 
    }
  });
}

/**
 * Triggers animations based on game events
 * @param {string} actorId - The actor ID that triggered the event
 * @param {string} eventType - The type of event
 * @param {Object} context - Context data for the event
 */
export function triggerAnimationsByEvent(actorId, eventType, context) {
  
  // Use global event handling setting
  const enableTriggeredAnimations = game.settings.get(MODULE_ID, "enableTriggeredAnimations");
  if (!enableTriggeredAnimations) {
    return;
  }

  // Check if we have any animated elements at all
  if (!window.overlayAnimatedElements) {
    return;
  }
  
  // Loop through all animated elements
  let animationsApplied = 0;
  
  // Process all items with animations
  for (const [elemActorId, elements] of Object.entries(window.overlayAnimatedElements)) {
    elements.forEach(({element, item}) => {
      // Get the animations array from the item
      const animations = item.animations || [];
      
      // Filter for trigger animations that match this event
      const triggerAnims = animations.filter(a => {
        // Basic check - is this a trigger animation for this event type?
        if (a.type !== "trigger" || a.triggerCondition?.event !== eventType) return false;
        
        // Target check - does this animation target the actor that triggered the event?
        if (a.triggerCondition.targetActor) {
          // If a specific target actor is defined, it must match
          return a.triggerCondition.targetActor === actorId;
        } else if (item.actorId) {
          // If no specific target but the item has an actor, use that
          return item.actorId === actorId;
        } else {
          // If no targets specified at all, don't match
          return false;
        }
      });
      
      if (triggerAnims.length > 0) {
      }
      
      // Apply matching animations
      triggerAnims.forEach(anim => {
        // Check if the trigger condition is met
        const meetsCondition = evaluateTriggerCondition(anim.triggerCondition, context);
        if (meetsCondition) {
          applyTriggeredAnimation(element, anim);
          animationsApplied++;
        } else {
        }
      });
    });
  }
  
  
  // Also trigger the HP-specific animation if this is an HP change (for backward compatibility)
  if (eventType === "hpChange") {
    const direction = context.newValue < context.oldValue ? "damage" : "healing";
    triggerHPAnimation(actorId, direction, context.oldValue, context.newValue);
  }
}

/**
 * Evaluates whether a trigger condition is met
 * @param {Object} condition - The trigger condition
 * @param {Object} context - The event context
 * @returns {boolean} Whether the condition is met
 */
function evaluateTriggerCondition(condition, context) {
  
  if (!condition) return false;
  
  switch(condition.event) {
    case "hpChange":
      if (condition.comparison === "decrease" && context.newValue < context.oldValue) return true;
      if (condition.comparison === "increase" && context.newValue > context.oldValue) return true;
      if (condition.comparison === "threshold" && context.newValue <= condition.threshold) return true;
      break;
    
    case "statChange":
      // Handle other stat changes
      break;
      
    case "levelUp":
      if (context.newValue > context.oldValue) return true;
      break;
      
    case "criticalHit":
      return context.isCritical === true;
      
    case "statusEffect":
      return context.statusEffect !== undefined;
  }
  
  return false;
}

/**
 * Applies a triggered animation to an element
 * @param {HTMLElement} element - The element to animate
 * @param {Object} animation - The animation configuration
 */
function applyTriggeredAnimation(element, animation) {
  
  // Remove any existing triggered animations
  element.classList.remove("hp-damage", "hp-healing");
  
  // Store original styles
  const originalColor = element.style.color;
  const originalClasses = [...element.classList];
  
  // Apply the animation class
  element.classList.add(animation.animation);
  
  switch (animation.animation) {
    case "hpDamage":
      element.classList.add("hp-damage");
      element.style.color = "#ff3333"; 
      break;
    case "hpHealing":
      element.classList.add("hp-healing");
      element.style.color = "#33ff33"; 
      break;
    default:
      const allAnimations = [
        ...ANIMATION_TYPES.CONTINUOUS.map(a => a.id),
        ...ANIMATION_TYPES.ENTRANCE.map(a => a.id),
        ...ANIMATION_TYPES.TRIGGER.map(a => a.id)
      ];
      if (allAnimations.includes(animation.animation)) {
        element.classList.add(animation.animation);
      }
      break;
  }
  
  void element.offsetWidth;
  
  // Remove animation after duration
  const duration = animation.duration || 1.5;
  setTimeout(() => {
    // Restore original classes and styles
    element.className = originalClasses.join(' ');
    element.style.color = originalColor;
    
  }, duration * 1000);
}