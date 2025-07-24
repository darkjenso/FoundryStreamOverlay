// Enhanced dice roll handler with improved visibility and animation - FIXED VERSION with Error Handling
import { MODULE_ID } from '../core/constants.js';
import { triggerDiceAnimation } from './element-creation.js';
import OverlayData from '../../data-storage.js';

/**
 * Handles dice roll detection and triggers appropriate animations
 * @param {Roll} roll - The Foundry roll object
 * @param {ChatMessage} message - The chat message containing the roll
 * @param {string} userId - The ID of the user who made the roll
 */
export async function handleDiceRoll(roll, message, userId) {
  console.log(`${MODULE_ID} | ========== PROCESSING DICE ROLL ==========`);
  console.log(`${MODULE_ID} | User: ${userId}`);
  console.log(`${MODULE_ID} | Roll object:`, roll);
  console.log(`${MODULE_ID} | Roll properties:`, {
    constructor: roll?.constructor?.name,
    hasTerms: !!(roll?.terms),
    termsLength: roll?.terms?.length,
    hasFormula: !!(roll?.formula),
    formula: roll?.formula,
    hasTotal: !!(roll?.total),
    total: roll?.total,
    keys: roll ? Object.keys(roll) : []
  });
  console.log(`${MODULE_ID} | Message object:`, message);
  console.log(`${MODULE_ID} | Message flags:`, message?.flags);

  // FIXED: Add validation for roll object
  if (!roll) {
    console.warn(`${MODULE_ID} | No roll object provided`);
    return;
  }

  // FIXED: Validate roll object structure
  if (!roll.terms && !roll.formula && !roll.total) {
    console.warn(`${MODULE_ID} | Invalid roll object structure - missing terms, formula, and total:`, roll);
    return;
  }

  // Extract comprehensive roll information
  const rollData = extractEnhancedRollData(roll, message);

  console.log(`${MODULE_ID} | Extracted roll data:`, rollData);

  // Only proceed if we got valid roll data
  if (!rollData || !rollData.diceType) {
    console.warn(`${MODULE_ID} | Could not extract valid roll data`);
    console.log(`${MODULE_ID} | ========== END DICE ROLL PROCESSING ==========`);
    return;
  }

  console.log(`${MODULE_ID} | Valid roll data found, proceeding with animation`);

  // Update dice items with the last roll data first so elements exist
  await updateDiceItemsWithRoll(rollData, userId);

  // Then trigger the animations on the freshly rendered elements
  checkAndTriggerDiceAnimations(rollData, userId);
  
  console.log(`${MODULE_ID} | ========== END DICE ROLL PROCESSING ==========`);
}

/**
 * FIXED: Enhanced roll data extraction with comprehensive error handling
 */
function extractEnhancedRollData(roll, message) {
  console.log(`${MODULE_ID} | Roll analysis:`, {
    roll: roll,
    hasTerms: !!(roll.terms),
    hasFormula: !!(roll.formula),
    hasTotal: !!(roll.total),
    formula: roll.formula,
    total: roll.total,
    termsLength: roll.terms?.length,
    terms: roll.terms
  });

  // FIXED: Initialize with safe defaults
  const rollData = {
    total: roll.total || 0,
    formula: roll.formula || "unknown",
    terms: roll.terms || [],
    baseRoll: null,
    diceType: null,
    modifiers: [],
    rollType: "unknown",
    isCritical: false,
    isFumble: false,
    diceResults: [],
    chatMessage: message
  };
  
  
  // FIXED: Check if terms exist and is an array
  if (!roll.terms || !Array.isArray(roll.terms)) {
    console.warn(`${MODULE_ID} | Roll object has no valid terms array:`, roll);
    
    // Try to extract basic info from the roll if possible
    if (roll.total && roll.formula) {
      
      // Try to guess dice type from formula - enhanced patterns
      const dicePatterns = [
        /(\d*d\d+)/i,           // Standard: 1d20, d20, 2d6
        /d(\d+)/i,              // Just d20, d6, etc.
        /(\d+)d(\d+)/i          // 1d20, 2d6, etc.
      ];
      
      let diceMatch = null;
      for (const pattern of dicePatterns) {
        diceMatch = roll.formula.match(pattern);
        if (diceMatch) {
          break;
        }
      }
      
      if (diceMatch) {
        let diceType;
        if (diceMatch[1].startsWith('d')) {
          diceType = diceMatch[1];
        } else if (diceMatch[1].includes('d')) {
          diceType = diceMatch[1].replace(/^\d+/, ''); // Remove leading number, keep d20
        } else {
          diceType = `d${diceMatch[1]}`; // Add d prefix
        }
        
        rollData.diceType = diceType.toLowerCase();
        rollData.baseRoll = roll.total; // Use total as fallback
        
        
        // Check for d20 critical/fumble
        if (diceType.includes('20')) {
          rollData.isCritical = roll.total >= 20;
          rollData.isFumble = roll.total <= 1;
        }
        
        console.log(`${MODULE_ID} | Extracted basic roll data from formula:`, {
          diceType: rollData.diceType,
          baseRoll: rollData.baseRoll,
          total: rollData.total,
          isCritical: rollData.isCritical,
          isFumble: rollData.isFumble
        });
        
        return rollData;
      } else {
        console.warn(`${MODULE_ID} | Could not extract dice type from formula: "${roll.formula}"`);
      }
    } else {
      console.warn(`${MODULE_ID} | Roll missing both terms and formula/total`, {
        hasTotal: !!roll.total,
        hasFormula: !!roll.formula,
        total: roll.total,
        formula: roll.formula
      });
    }
    
    return null; // Could not extract any useful data
  }
  
  // Find the main die roll and extract modifiers
  let runningTotal = 0;
  
  try {
    
    roll.terms.forEach((term, index) => {
      if (!term) {
        return; // Skip null/undefined terms
      }
      
      console.log(`${MODULE_ID} | Processing term ${index}:`, {
        constructor: term.constructor.name,
        term: term
      });
      
      // FIXED: Check for any die-type object (D20Die, D6Die, Die, etc.)
      if (term.constructor.name.includes("Die") || (term.faces && term.results)) {
        console.log(`${MODULE_ID} | Found Die term:`, {
          constructor: term.constructor.name,
          faces: term.faces,
          results: term.results
        });
        
        const diceType = `d${term.faces}`;
        
        // FIXED: Check if results exist and is an array
        if (term.results && Array.isArray(term.results)) {
          // Get the actual rolled values
          const diceResults = term.results
            .filter(result => result && result.active)
            .map(result => result.result);
          
          
          if (diceResults.length > 0) {
            rollData.diceResults.push({
              type: diceType,
              results: diceResults,
              total: diceResults.reduce((sum, val) => sum + val, 0)
            });
            
            // Set primary dice info for d20 or first significant die
            if (!rollData.baseRoll || term.faces === 20) {
              rollData.baseRoll = diceResults[0]; // Just the first die result
              rollData.diceType = diceType;
              runningTotal = rollData.baseRoll;
              
              console.log(`${MODULE_ID} | Set primary dice info:`, {
                baseRoll: rollData.baseRoll,
                diceType: rollData.diceType
              });
              
              // Check for critical/fumble on d20
              if (term.faces === 20) {
                rollData.isCritical = diceResults[0] === 20;
                rollData.isFumble = diceResults[0] === 1;
              }
            }
          } else {
            console.warn(`${MODULE_ID} | Die term has no active results:`, term.results);
          }
        } else {
          console.warn(`${MODULE_ID} | Die term has no valid results array:`, term);
        }
      } else if (term.constructor.name === "NumericTerm") {
        
        // This is a modifier
        const prevTerm = roll.terms[index - 1];
        if (prevTerm && prevTerm.constructor.name === "OperatorTerm") {
          const modifierValue = prevTerm.operator === "+" ? term.number : -term.number;
          
          
          // Try to determine what this modifier represents
          const modifierLabel = determineModifierLabel(modifierValue, message, rollData);
          
          rollData.modifiers.push({
            value: modifierValue,
            label: modifierLabel,
            runningTotal: runningTotal + modifierValue
          });
          
          runningTotal += modifierValue;
        }
      } else if (term.constructor.name === "OperatorTerm") {
      } else {
      }
    });
    
    console.log(`${MODULE_ID} | Final extraction results:`, {
      baseRoll: rollData.baseRoll,
      diceType: rollData.diceType,
      modifiers: rollData.modifiers,
      diceResults: rollData.diceResults
    });
    
  } catch (error) {
    console.error(`${MODULE_ID} | Error processing roll terms:`, error);
    // Continue with what we have
  }
  
  // Enhanced modifier extraction with better D&D 5e support
  try {
    rollData.modifiers = extractEnhancedModifiers(roll, message);
  } catch (error) {
    console.warn(`${MODULE_ID} | Error extracting enhanced modifiers:`, error);
    // Keep the basic modifiers we already found
  }
  
  // Try to extract more detailed modifier info from D&D 5e system
  if (game.system.id === "dnd5e" && message && message.flags?.dnd5e) {
    try {
      rollData.modifiers = enhanceD5eModifiers(rollData.modifiers, message.flags.dnd5e, rollData);
    } catch (error) {
      console.warn(`${MODULE_ID} | Error enhancing D&D 5e modifiers:`, error);
    }
  }
  
  console.log(`${MODULE_ID} | Extracted roll data:`, {
    baseRoll: rollData.baseRoll,
    diceType: rollData.diceType,
    total: rollData.total,
    modifiers: rollData.modifiers,
    isCritical: rollData.isCritical,
    isFumble: rollData.isFumble
  });
  
  return rollData;
}

/**
 * Enhanced modifier extraction with better D&D 5e specific knowledge
 * @param {Roll} roll - The Foundry roll object
 * @param {ChatMessage} message - The chat message
 * @returns {Array} Array of modifier objects with enhanced labels
 */
export function extractEnhancedModifiers(roll, message) {
  const modifiers = [];
  
  try {
    // FIXED: Validate roll.terms exists
    if (!roll.terms || !Array.isArray(roll.terms)) {
      console.warn(`${MODULE_ID} | Cannot extract modifiers - no valid terms array`);
      return modifiers;
    }
    
    const terms = roll.terms;
    
    // First pass: Extract all numeric modifiers
    terms.forEach((term, index) => {
      if (!term) return; // Skip null/undefined terms
      
      if (term.constructor.name === "NumericTerm" && index > 0) {
        const prevTerm = terms[index - 1];
        if (prevTerm && prevTerm.constructor.name === "OperatorTerm") {
          const value = prevTerm.operator === "+" ? term.number : -term.number;
          
          modifiers.push({
            value: value,
            label: null, // We'll determine this later
            term: term,
            identified: false
          });
        }
      }
    });

    // Enhanced D&D 5e modifier identification
    if (game.system.id === "dnd5e" && message) {
      identifyDnD5eModifiers(modifiers, message, roll);
    }
    
    // Final pass: Label any remaining unidentified modifiers
    modifiers.forEach((modifier, index) => {
      if (!modifier.identified) {
        modifier.label = determineGenericModifierLabel(modifier.value, message, roll, index, modifiers);
      }
      delete modifier.identified; // Clean up the temporary property
    });
    
  } catch (error) {
    console.warn(`${MODULE_ID} | Error extracting enhanced modifiers:`, error);
  }
  
  return modifiers;
}

/**
 * Enhanced D&D 5e specific modifier identification
 */
function identifyDnD5eModifiers(modifiers, message, roll) {
  if (!message) return;
  
  const flavor = message.flavor?.toLowerCase() || "";
  const content = message.content?.toLowerCase() || "";
  
  // ENHANCED: Detect spell attacks
  const isSpellAttack = flavor.includes("spell attack") || 
                       flavor.includes("cantrip") ||
                       content.includes("spell attack") ||
                       (message.flags?.dnd5e?.use?.type === "spell") ||
                       (message.flags?.dnd5e?.item?.type === "spell");
  
  console.log(`${MODULE_ID} | Roll type detection:`, {
    isSpellAttack: isSpellAttack,
    flavor: flavor,
    flags: message.flags?.dnd5e
  });
  
  // Try to get D&D 5e specific data
  let abilityMod = null;
  let proficiencyBonus = null;
  let abilityName = null;
  
  // Extract from D&D 5e flags if available
  if (message.flags?.dnd5e?.roll) {
    const rollData = message.flags.dnd5e.roll;
    abilityMod = rollData.abilityMod;
    proficiencyBonus = rollData.prof;
    abilityName = rollData.ability;
  }

  // Also try to extract from flavor text patterns
  const rollTypeContext = determineRollTypeFromFlavor(flavor, content);
  
  // If we don't have ability from flags, try to extract from flavor
  if (!abilityName) {
    abilityName = extractAbilityFromFlavor(flavor, content);
  }

  // ENHANCED: Special handling for spell attacks
  if (isSpellAttack && abilityMod !== null && proficiencyBonus !== null) {
    
    // Find the ability modifier and proficiency bonus
    const abilityModifier = modifiers.find(m => m.value === abilityMod && !m.identified);
    const proficiencyModifier = modifiers.find(m => m.value === proficiencyBonus && !m.identified);
    
    if (abilityModifier && proficiencyModifier) {
      // Mark both as identified so they don't get processed separately
      abilityModifier.identified = true;
      proficiencyModifier.identified = true;
      
      // Create a combined spell attack modifier
      const combinedValue = abilityMod + proficiencyBonus;
      const spellAttackModifier = {
        value: combinedValue,
        label: "Spell Attack",
        identified: true,
        combined: true // Flag to indicate this is a combined modifier
      };
      
      // Replace the ability modifier with the combined one, remove proficiency
      const abilityIndex = modifiers.indexOf(abilityModifier);
      modifiers[abilityIndex] = spellAttackModifier;
      
      const proficiencyIndex = modifiers.indexOf(proficiencyModifier);
      modifiers.splice(proficiencyIndex, 1);
      
      return; // Skip the rest of the normal processing
    }
  }

  // Strategy: Match modifiers by value and context (normal processing for non-spell attacks)
  const sortedModifiers = [...modifiers].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  
  // First, try to identify ability modifier (usually smaller positive values -5 to +5)
  if (abilityMod !== null && abilityMod !== undefined) {
    const abilityModifier = modifiers.find(m => m.value === abilityMod && !m.identified);
    if (abilityModifier) {
      abilityModifier.label = getAbilityDisplayName(abilityName || "Ability");
      abilityModifier.identified = true;
    }
  } else {
    // Try to guess ability modifier (typically -5 to +5 range)
    const likelyAbilityMod = modifiers.find(m => 
      m.value >= -5 && m.value <= 5 && !m.identified
    );
    if (likelyAbilityMod) {
      likelyAbilityMod.label = getAbilityDisplayName(abilityName || extractAbilityFromFlavor(flavor, content) || "Ability");
      likelyAbilityMod.identified = true;
    }
  }

  // Second, try to identify proficiency bonus
  if (proficiencyBonus !== null && proficiencyBonus !== undefined && proficiencyBonus !== 0) {
    const profModifier = modifiers.find(m => m.value === proficiencyBonus && !m.identified);
    if (profModifier) {
      // Check if this might be expertise (double proficiency)
      if (flavor.includes("expertise") || content.includes("expertise")) {
        profModifier.label = "Expertise";
      } else {
        profModifier.label = "Proficiency";
      }
      profModifier.identified = true;
    }
  } else {
    // Try to guess proficiency bonus (common values: 2, 3, 4, 5, 6)
    const proficiencyValues = [2, 3, 4, 5, 6];
    const likelyProfMod = modifiers.find(m => 
      proficiencyValues.includes(Math.abs(m.value)) && !m.identified
    );
    if (likelyProfMod) {
      if (flavor.includes("expertise") || content.includes("expertise")) {
        likelyProfMod.label = "Expertise";
      } else {
        likelyProfMod.label = "Proficiency";
      }
      likelyProfMod.identified = true;
    }
  }

  // Third, identify common spell/effect bonuses
  modifiers.forEach(modifier => {
    if (modifier.identified) return;
    
    const value = Math.abs(modifier.value);
    
    // Check flavor for specific spell/effect mentions
    if (flavor.includes("guidance") && value >= 1 && value <= 4) {
      modifier.label = "Guidance";
      modifier.identified = true;
    } else if (flavor.includes("inspiration") || flavor.includes("bardic")) {
      modifier.label = "Inspiration";
      modifier.identified = true;
    } else if (flavor.includes("bless") && value >= 1 && value <= 4) {
      modifier.label = "Blessing";
      modifier.identified = true;
    } else if (flavor.includes("magic weapon") || flavor.includes("enhancement")) {
      modifier.label = "Enhancement";
      modifier.identified = true;
    } else if (rollTypeContext.isAttack && value >= 1 && value <= 3) {
      modifier.label = "Magic Weapon";
      modifier.identified = true;
    }
  });

  // Fourth, handle situational modifiers based on roll type
  modifiers.forEach(modifier => {
    if (modifier.identified) return;
    
    const value = modifier.value;
    
    if (rollTypeContext.isSave) {
      if (value > 0 && value <= 5) {
        modifier.label = "Save Bonus";
      } else if (value < 0) {
        modifier.label = "Save Penalty";
      }
      modifier.identified = true;
    } else if (rollTypeContext.isSkill) {
      if (value > 0 && value <= 4) {
        modifier.label = "Skill Bonus";
      } else if (value < 0) {
        modifier.label = "Skill Penalty";
      }
      modifier.identified = true;
    }
  });
}

/**
 * Determine roll type from flavor text
 */
function determineRollTypeFromFlavor(flavor, content) {
  return {
    isAttack: flavor.includes("attack") || content.includes("attack"),
    isDamage: flavor.includes("damage") || content.includes("damage"),
    isSave: flavor.includes("saving throw") || flavor.includes("save") || content.includes("save"),
    isSkill: flavor.includes("skill") || flavor.includes("check") && !flavor.includes("ability"),
    isAbility: flavor.includes("ability check"),
    isInitiative: flavor.includes("initiative")
  };
}

/**
 * Extract ability name from flavor text
 */
function extractAbilityFromFlavor(flavor, content) {
  const text = `${flavor} ${content}`.toLowerCase();
  
  if (text.includes("strength") || text.includes("str")) return "strength";
  if (text.includes("dexterity") || text.includes("dex")) return "dexterity";
  if (text.includes("constitution") || text.includes("con")) return "constitution";
  if (text.includes("intelligence") || text.includes("int")) return "intelligence";
  if (text.includes("wisdom") || text.includes("wis")) return "wisdom";
  if (text.includes("charisma") || text.includes("cha")) return "charisma";
  
  return null;
}

/**
 * Get display name for abilities
 */
function getAbilityDisplayName(abilityName) {
  if (!abilityName) return "Ability";
  
  const displayNames = {
    "str": "Strength",
    "dex": "Dexterity", 
    "con": "Constitution",
    "int": "Intelligence",
    "wis": "Wisdom",
    "cha": "Charisma",
    "strength": "Strength",
    "dexterity": "Dexterity",
    "constitution": "Constitution", 
    "intelligence": "Intelligence",
    "wisdom": "Wisdom",
    "charisma": "Charisma"
  };
  
  return displayNames[abilityName.toLowerCase()] || abilityName.charAt(0).toUpperCase() + abilityName.slice(1);
}

/**
 * Fallback labeling for unidentified modifiers
 */
function determineGenericModifierLabel(value, message, roll, index, allModifiers) {
  const flavor = message?.flavor?.toLowerCase() || "";
  
  // If this is a small positive bonus and we haven't identified it yet
  if (value > 0 && value <= 4) {
    // Check if any other modifier was already labeled as guidance/inspiration
    const hasGuidance = allModifiers.some(m => m.label === "Guidance" && m.identified);
    const hasInspiration = allModifiers.some(m => m.label === "Inspiration" && m.identified);
    
    if (!hasGuidance && (value >= 1 && value <= 4)) {
      return "Guidance";
    } else if (!hasInspiration && (value >= 1 && value <= 12)) {
      return "Inspiration";
    }
    
    return `Bonus${index > 0 ? ` ${index + 1}` : ""}`;
  } else if (value < 0) {
    return `Penalty${index > 0 ? ` ${index + 1}` : ""}`;
  }
  
  return `Modifier${index > 0 ? ` ${index + 1}` : ""}`;
}

/**
 * ENHANCED: Better modifier label determination (legacy fallback)
 */
function determineModifierLabel(value, message, rollData) {
  // D&D 5e specific modifier detection
  if (game.system.id === "dnd5e") {
    const flavor = message?.flavor?.toLowerCase() || "";
    const content = message?.content?.toLowerCase() || "";
    
    // Common D&D 5e modifier values and their likely meanings
    const proficiencyValues = [2, 3, 4, 5, 6]; // Levels 1-20 proficiency bonuses
    const abilityModValues = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]; // Common ability modifiers
    
    // Check for specific mentions in flavor text
    if (flavor.includes("strength") || content.includes("strength")) return "Strength";
    if (flavor.includes("dexterity") || content.includes("dexterity")) return "Dexterity";
    if (flavor.includes("constitution") || content.includes("constitution")) return "Constitution";
    if (flavor.includes("intelligence") || content.includes("intelligence")) return "Intelligence";
    if (flavor.includes("wisdom") || content.includes("wisdom")) return "Wisdom";
    if (flavor.includes("charisma") || content.includes("charisma")) return "Charisma";
    
    if (flavor.includes("proficiency") || content.includes("proficiency")) return "Proficiency";
    if (flavor.includes("expertise") || content.includes("expertise")) return "Expertise";
    if (flavor.includes("guidance") || content.includes("guidance")) return "Guidance";
    if (flavor.includes("inspiration") || content.includes("inspiration")) return "Inspiration";
    if (flavor.includes("bless") || content.includes("bless")) return "Bless";
    
    // Guess based on common values
    if (proficiencyValues.includes(Math.abs(value))) {
      return "Proficiency";
    } else if (abilityModValues.includes(value)) {
      return "Ability";
    } else if (value >= 1 && value <= 4) {
      return "Guidance"; // Common spell bonus
    }
  }
  
  // Generic fallback
  return value > 0 ? "Bonus" : "Penalty";
}

/**
 * ENHANCED: Improves D&D 5e modifier detection (legacy function)
 */
function enhanceD5eModifiers(existingModifiers, dnd5eFlags, rollData) {
  const enhancedModifiers = [...existingModifiers];
  
  try {
    if (dnd5eFlags.roll) {
      const rollInfo = dnd5eFlags.roll;
      
      // Update existing modifiers with better labels if we have more specific info
      enhancedModifiers.forEach((modifier, index) => {
        if (rollInfo.abilityMod !== undefined && modifier.value === rollInfo.abilityMod) {
          modifier.label = `${rollInfo.ability?.toUpperCase() || 'Ability'} Modifier`;
        } else if (rollInfo.prof !== undefined && modifier.value === rollInfo.prof) {
          modifier.label = "Proficiency";
        }
      });
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Error enhancing D&D 5e modifiers:`, error);
  }
  
  return enhancedModifiers;
}

/**
 * FIXED: Improved dice animation triggering with proper window handling
 */
function checkAndTriggerDiceAnimations(rollData, userId) {
  
  // Check main overlay window
  if (window.overlayWindow && !window.overlayWindow.closed) {
    triggerDiceAnimationsInWindow(window.overlayWindow, rollData, userId, "main");
  }
  
  // Check additional overlay windows
  if (window.overlayWindows) {
    Object.entries(window.overlayWindows).forEach(([windowId, overlayWindow]) => {
      if (overlayWindow && !overlayWindow.closed) {
        triggerDiceAnimationsInWindow(overlayWindow, rollData, userId, windowId);
      }
    });
  }
}

/**
 * FIXED: Triggers dice animations in a specific window with improved element matching
 */
function triggerDiceAnimationsInWindow(overlayWindow, rollData, userId, windowId) {
  // Get the current layout for this window
  const windows = OverlayData.getOverlayWindows();
  const windowConfig = windows[windowId] || windows.main;
  const layouts = OverlayData.getLayouts();
  const activeLayout = windowConfig.activeLayout || "Default";
  const layoutItems = layouts[activeLayout] || [];
  
  // Find dice items that match this roll
  const matchingDiceItems = layoutItems.filter(item => 
    item.type === "dice" && 
    item.diceType === rollData.diceType &&
    shouldTriggerDiceAnimation(item, rollData, userId)
  );
  
  
  if (matchingDiceItems.length === 0) return;
  
  // Find the corresponding DOM elements
  const container = overlayWindow.document.getElementById("overlay-container");
  if (!container) {
    console.error(`${MODULE_ID} | No overlay container found in window ${windowId}`);
    return;
  }
  
  const allDiceElements = Array.from(container.querySelectorAll('.dice-item'));
  
  matchingDiceItems.forEach((diceItem, itemIndex) => {
    // IMPROVED: Better element matching using multiple criteria
    const matchingElement = allDiceElements.find(el => {
      const elTop = parseInt(el.style.top) || 0;
      const elLeft = parseInt(el.style.left) || 0;
      const elDiceType = el.dataset.diceType;
      
      return Math.abs(elTop - (diceItem.top || 0)) < 10 && 
             Math.abs(elLeft - (diceItem.left || 0)) < 10 &&
             elDiceType === diceItem.diceType;
    });
    
    if (matchingElement) {
      triggerDiceAnimation(matchingElement, rollData, overlayWindow);
    } else {
      console.warn(`${MODULE_ID} | Could not find DOM element for dice item`, diceItem);
    }
  });
}

/**
 * Determines if a dice item should animate for a given roll
 */
function shouldTriggerDiceAnimation(diceConfig, rollData, userId) {
  // Check dice type match
  if (diceConfig.diceType !== rollData.diceType) {
    return false;
  }
  
  // Check user targeting
  if (diceConfig.targetUsers && diceConfig.targetUsers.length > 0) {
    if (!diceConfig.targetUsers.includes(userId)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Determines the type of roll from the chat message
 */
function determineRollType(message) {
  if (!message || !message.flavor) return "generic";
  
  const flavor = message.flavor.toLowerCase();
  
  if (flavor.includes("attack")) return "attack";
  if (flavor.includes("damage")) return "damage";
  if (flavor.includes("save") || flavor.includes("saving")) return "save";
  if (flavor.includes("check") || flavor.includes("ability")) return "check";
  if (flavor.includes("skill")) return "skill";
  if (flavor.includes("initiative")) return "initiative";
  
  return "generic";
}

/**
 * Updates dice items in storage with the latest roll data
 */
async function updateDiceItemsWithRoll(rollData, userId) {
  try {
    const layouts = OverlayData.getLayouts();
    let hasUpdates = false;
    
    // Update all layouts that contain matching dice items
    for (const [layoutName, items] of Object.entries(layouts)) {
      const updatedItems = items.map(item => {
        if (item.type === "dice" && 
            item.diceType === rollData.diceType &&
            shouldTriggerDiceAnimation(item, rollData, userId)) {
          
          // Store the last roll data
          item.lastRoll = {
            total: rollData.total,
            baseRoll: rollData.baseRoll,
            modifiers: rollData.modifiers,
            timestamp: Date.now(),
            userId: userId,
            isCritical: rollData.isCritical,
            isFumble: rollData.isFumble
          };
          
          hasUpdates = true;
        }
        return item;
      });
      
      if (hasUpdates) {
        await OverlayData.setLayout(layoutName, updatedItems);
      }
    }
    
    // Refresh overlay windows if updates were made
    if (hasUpdates) {
      const { updateOverlayWindow } = await import('./window-management.js');
      
      if (window.overlayWindow && !window.overlayWindow.closed) {
        updateOverlayWindow("main");
      }
      
      if (window.overlayWindows) {
        for (const [windowId, overlayWindow] of Object.entries(window.overlayWindows)) {
          if (overlayWindow && !overlayWindow.closed) {
            updateOverlayWindow(windowId);
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`${MODULE_ID} | Error updating dice items with roll data:`, error);
  }
}