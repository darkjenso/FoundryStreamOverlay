// Enhanced Foundry hooks registration with comprehensive dice roll detection
import { MODULE_ID } from './constants.js';

// Track processed chat messages to avoid duplicate dice animations
const processedMessages = new Set();

/**
 * Registers all Foundry hooks for the module including enhanced dice detection
 */
export function registerHooks() {

  // Hook for actor updates to trigger animations
  Hooks.on("updateActor", async (actor, update, options, userId) => {
    // Handle HP changes
    if (foundry.utils.hasProperty(update, "system.attributes.hp")) {
      const oldValue = actor._source.system.attributes.hp.value || 0;
      const newValue = actor.system.attributes.hp.value || 0;
      
      
      // Import animation system dynamically
      const { triggerAnimationsByEvent } = await import('../overlay/animation-system.js');
      
      triggerAnimationsByEvent(actor.id, "hpChange", {
        oldValue: oldValue,
        newValue: newValue,
        dataPath: "system.attributes.hp.value"
      });
    }

    // Handle level changes
    if (foundry.utils.hasProperty(update, "system.details.level")) {
      const oldValue = actor._source.system.details.level || 0;
      const newValue = actor.system.details.level || 0;
            
      // Import animation system dynamically
      const { triggerAnimationsByEvent } = await import('../overlay/animation-system.js');
      
      triggerAnimationsByEvent(actor.id, "levelUp", {
        oldValue: oldValue,
        newValue: newValue,
        dataPath: "system.details.level"
      });
    }
    
    // Update overlay windows
    const { updateOverlayWindow } = await import('../overlay/window-management.js');
    updateOverlayWindow();
  });

  // FIXED: Enhanced hook for comprehensive dice roll detection
  Hooks.on("createChatMessage", async (message, options, userId) => {

    if (processedMessages.has(message.id)) {
      return;
    }

    // Check if this message contains a dice roll
    let rolls = message.rolls;
    console.log(`${MODULE_ID} | Initial rolls check:`, {
      hasRolls: !!rolls,
      rollsLength: rolls?.length || 0,
      rolls: rolls
    });

    // ENHANCED: Better roll reconstruction for D&D 5e with multiple flag locations
    if ((!rolls || rolls.length === 0)) {
      
      // Try multiple D&D 5e flag locations
      let rollData = null;
      
      // Standard skill checks and saves
      if (message.flags?.dnd5e?.roll?.formula) {
        rollData = message.flags.dnd5e.roll;
      }
      // Attack rolls (stored differently)
      else if (message.flags?.dnd5e?.attack?.roll) {
        rollData = message.flags.dnd5e.attack.roll;
      }
      // Damage rolls
      else if (message.flags?.dnd5e?.damage?.roll) {
        rollData = message.flags.dnd5e.damage.roll;
      }
      // Alternative attack roll storage
      else if (message.flags?.dnd5e?.attackRoll) {
        rollData = message.flags.dnd5e.attackRoll;
      }
      // Try to extract from roll data array
      else if (message.flags?.dnd5e?.rolls && message.flags.dnd5e.rolls.length > 0) {
        rollData = message.flags.dnd5e.rolls[0];
      }

      // Reconstruct roll if we found data
      if (rollData && rollData.formula) {
        try {
          const RollClass = foundry?.dice?.Roll || Roll;
          const formula = rollData.formula;
          const data = rollData.data || {};
          const roll = new RollClass(formula, data).evaluate({async: false});
          rolls = [roll];
        } catch (err) {
        }
      } else {
      }
    }

    // ENHANCED: Also check for rolls in message.content inline rolls
    if ((!rolls || rolls.length === 0) && message.content) {
      
      const inlineRollRegex = /\[\[([^\]]+)\]\]/g;
      const inlineMatches = message.content.match(inlineRollRegex);
      
      if (inlineMatches && inlineMatches.length > 0) {
        try {
          // Try to extract the first inline roll
          const firstRoll = inlineMatches[0].replace(/\[\[|\]\]/g, '');
          const RollClass = foundry?.dice?.Roll || Roll;
          const roll = new RollClass(firstRoll).evaluate({async: false});
          rolls = [roll];
        } catch (err) {
        }
      }
    }

    if (rolls && rolls.length > 0) {
      
      // Import dice animation system dynamically
      const { handleDiceRoll } = await import('../overlay/dice-roll-handler.js');
      
      // Process each roll in the message sequentially so animations aren't overwritten
      for (const [index, roll] of rolls.entries()) {
        console.log(`${MODULE_ID} | Processing roll ${index + 1}:`, {
          formula: roll.formula,
          total: roll.total,
          terms: roll.terms
        });

        await handleDiceRoll(roll, message, userId);
      }
      processedMessages.add(message.id);
    } else {
      // ENHANCED: Better debugging for missed rolls
      console.log(`${MODULE_ID} | No rolls found in message. Message structure:`, {
        hasRolls: !!message.rolls,
        rollsLength: message.rolls?.length || 0,
        flags: message.flags,
        content: message.content?.substring(0, 100) + "...",
        type: message.type,
        speaker: message.speaker,
        flavor: message.flavor
      });
    }
    
  });

  // REMOVED: The dnd5e.rollAttack hook signature has changed and no longer passes Roll objects
  // Instead, we'll rely on the chat message creation and dice-so-nice hooks

  // ENHANCED: Hook for dice rolls from dice-so-nice or other dice modules
  Hooks.on("diceSoNiceRollComplete", async (messageId) => {


    // Find the corresponding chat message
    const message = game.messages.get(messageId);
    
    if (message && !processedMessages.has(message.id)) {
      console.log(`${MODULE_ID} | Message details:`, {
        id: message.id,
        hasRolls: !!(message.rolls),
        rollsLength: message.rolls?.length || 0,
        rolls: message.rolls,
        flags: message.flags,
        content: message.content,
        flavor: message.flavor
      });
      
      // Check for rolls in the message
      let rollsToProcess = message.rolls || [];
      
      // If no rolls found, try to get them from various sources
      if (rollsToProcess.length === 0) {        
        // Try reconstructing from D&D 5e flags
        let rollData = null;
        if (message.flags?.dnd5e?.roll?.formula) {
          rollData = message.flags.dnd5e.roll;
        } else if (message.flags?.dnd5e?.attack?.roll) {
          rollData = message.flags.dnd5e.attack.roll;
        } else if (message.flags?.dnd5e?.damage?.roll) {
          rollData = message.flags.dnd5e.damage.roll;
        } else {
        }
        
        if (rollData && rollData.formula) {
          try {
            const RollClass = foundry?.dice?.Roll || Roll;
            const formula = rollData.formula;
            const data = rollData.data || {};
            const roll = new RollClass(formula, data).evaluate({async: false});
            rollsToProcess = [roll];
          } catch (err) {
          }
        }
      } else {
      }
      
      if (rollsToProcess.length > 0) {
        const { handleDiceRoll } = await import('../overlay/dice-roll-handler.js');

        for (const roll of rollsToProcess) {
          console.log(`${MODULE_ID} | Processing dice-so-nice roll:`, {
            roll: roll,
            formula: roll.formula,
            total: roll.total,
            hasTerms: !!(roll.terms && roll.terms.length > 0),
            terms: roll.terms
          });
          await handleDiceRoll(roll, message, message.author?.id || game.user.id);
        }
        processedMessages.add(message.id);
      } else {
        console.warn(`${MODULE_ID} | No rolls found for dice-so-nice message ${messageId}`);
      }
    } else if (!message) {
      console.warn(`${MODULE_ID} | Could not find message ${messageId} for dice-so-nice roll`);
    } else {
    }
    
  });

  // Hook for D&D Beyond dice rolls (if using D&D Beyond integration)
  Hooks.on("ddbRollRequested", async (rollData) => {
    // Handle D&D Beyond specific roll format if needed
  });

  // ENHANCED: Generic dice roll hook (catches other systems and delayed processing)
  Hooks.on("diceSoNiceRollStart", async (messageId, context) => {
    
    // This can catch rolls from other systems that don't use the standard hooks
    // Add a delay to ensure the message is fully processed
    setTimeout(async () => {
      const message = game.messages.get(messageId);
      if (message && !processedMessages.has(message.id)) {
        
        let rollsToProcess = message.rolls || [];
        
        // If still no rolls, try alternative detection methods
        if (rollsToProcess.length === 0) {
          
          let rollData = null;
          if (message.flags?.dnd5e?.roll?.formula) {
            rollData = message.flags.dnd5e.roll;
          } else if (message.flags?.dnd5e?.attack?.roll) {
            rollData = message.flags.dnd5e.attack.roll;
          } else if (message.flags?.dnd5e?.damage?.roll) {
            rollData = message.flags.dnd5e.damage.roll;
          }
          
          if (rollData && rollData.formula) {
            try {
              const RollClass = foundry?.dice?.Roll || Roll;
              const formula = rollData.formula;
              const data = rollData.data || {};
              const roll = new RollClass(formula, data).evaluate({async: false});
              rollsToProcess = [roll];
            } catch (err) {
            }
          }
        }
        
        if (rollsToProcess.length > 0) {
          const { handleDiceRoll } = await import('../overlay/dice-roll-handler.js');
          
          for (const roll of rollsToProcess) {
            await handleDiceRoll(roll, message, message.author?.id || game.user.id);
          }
          processedMessages.add(message.id);
        } else {
          console.warn(`${MODULE_ID} | No rolls found even in delayed processing for message ${messageId}`);
        }
      }
    }, 500); // 500ms delay to ensure full processing
  });

  // Hook for when layouts change
  Hooks.on(`${MODULE_ID}.dataUpdated`, async (data) => {
    
    // Update all overlay windows
    const { updateOverlayWindow } = await import('../overlay/window-management.js');
    updateOverlayWindow();
  });

  // Hook for cleanup when Foundry closes
  Hooks.on("ready", () => {
    // Store reference to cleanup slideshow on page unload
    window.addEventListener('beforeunload', () => {
      if (window.foundryStreamSlideshowTimeout) {
        clearTimeout(window.foundryStreamSlideshowTimeout);
      }
      window.foundryStreamSlideshowRunning = false;
    });
    
    // Initialize dice roll tracking
    initializeDiceRollTracking();
  });

  // Hook for token updates (might affect displayed data)
  Hooks.on("updateToken", async (token, update, options, userId) => {
    if (token.actor) {
      
      // Update overlay windows if actor data might have changed
      const { updateOverlayWindow } = await import('../overlay/window-management.js');
      updateOverlayWindow();
    }
  });

  // Hook for combat changes (for initiative and turn tracking)
  Hooks.on("updateCombat", async (combat, update, options, userId) => {
    if (update.turn !== undefined || update.round !== undefined) {
      
      // Could trigger special animations for turn changes
      // This could be expanded for initiative-based overlays
    }
  });

  // ENHANCED: Simple fallback hook to catch any rolls we might have missed
  Hooks.on("renderChatMessage", async (chatMessage, html, data) => {
    // Only process if we haven't already processed this message
    if (processedMessages.has(chatMessage.id)) return;
    
    // Check if this message has dice rolls that we might have missed
    if (chatMessage.rolls && chatMessage.rolls.length > 0) {
      
      // Add a small delay to avoid double-processing
      setTimeout(async () => {
        if (!processedMessages.has(chatMessage.id)) {
          const { handleDiceRoll } = await import('../overlay/dice-roll-handler.js');
          
          for (const roll of chatMessage.rolls) {
            await handleDiceRoll(roll, chatMessage, chatMessage.author?.id || game.user.id);
          }
          processedMessages.add(chatMessage.id);
        }
      }, 200);
    }
  });

  // Disable standalone app button in module settings until feature is ready
Hooks.on("renderSettingsConfig", (app, html, data) => {
  // Ensure html is a jQuery object
  const $html = html instanceof jQuery ? html : $(html);
  
  // Check if this is our module's settings
  const moduleSettings = $html.find(`[data-setting-id*="${MODULE_ID}"]`);
  
  if (moduleSettings.length > 0) {
    // Add any custom styling or modifications to module settings here
    console.log(`${MODULE_ID} | Settings rendered`);
    
    // Example: Add coming soon styling to standalone app setting
    const standaloneAppSetting = $html.find(`[data-setting-id="${MODULE_ID}.standaloneApp"]`);
    if (standaloneAppSetting.length > 0) {
      // Add coming soon styling
      standaloneAppSetting.find('button').prop('disabled', true);
      standaloneAppSetting.find('label').append(' <em style="color: #666;">(Coming Soon)</em>');
    }
  }
});

}

/**
 * Initialize enhanced dice roll tracking systems
 */
function initializeDiceRollTracking() {
  
  // Create global dice roll tracking object
  if (!window.foundryStreamOverlayDice) {
    window.foundryStreamOverlayDice = {
      recentRolls: [],
      rollHistory: [],
      criticalHits: 0,
      fumbles: 0,
      sessionStats: {
        totalRolls: 0,
        highestRoll: 0,
        lowestRoll: 21,
        averageRoll: 0
      }
    };
  }
  
  // Set up dice roll event listener for additional detection
  document.addEventListener('click', (event) => {
    // Detect dice rolling from various UI elements
    if (event.target.closest('.dice-roll') || 
        event.target.closest('[data-action="rollDamage"]') || 
        event.target.closest('[data-action="rollAttack"]') ||
        event.target.closest('.rollable')) {
      
      // Could pre-prepare dice elements for incoming rolls
    }
  });
  
}

/**
 * Enhanced dice roll data extraction for better compatibility
 * @param {Roll} roll - The Foundry roll object
 * @returns {Object} Enhanced roll data
 */
export function extractEnhancedRollData(roll) {
  const rollData = {
    total: roll.total,
    formula: roll.formula,
    terms: roll.terms,
    baseRoll: null,
    diceType: null,
    modifiers: [],
    rollType: "unknown",
    isCritical: false,
    isFumble: false,
    diceResults: []
  };
  
  // Extract all dice from the roll
  roll.terms.forEach(term => {
    if (term.constructor.name === "Die") {
      const diceType = `d${term.faces}`;
      
      term.results.forEach(result => {
        rollData.diceResults.push({
          type: diceType,
          result: result.result,
          active: result.active
        });
        
        // Set primary dice info for d20 or first die
        if (!rollData.baseRoll || term.faces === 20) {
          rollData.baseRoll = result.result;
          rollData.diceType = diceType;
          
          // Check for critical/fumble on d20
          if (term.faces === 20) {
            rollData.isCritical = result.result === 20;
            rollData.isFumble = result.result === 1;
          }
        }
      });
    }
  });
  
  // Track roll statistics
  if (window.foundryStreamOverlayDice && rollData.baseRoll) {
    const stats = window.foundryStreamOverlayDice.sessionStats;
    stats.totalRolls++;
    stats.highestRoll = Math.max(stats.highestRoll, rollData.baseRoll);
    stats.lowestRoll = Math.min(stats.lowestRoll, rollData.baseRoll);
    stats.averageRoll = ((stats.averageRoll * (stats.totalRolls - 1)) + rollData.baseRoll) / stats.totalRolls;
    
    if (rollData.isCritical) window.foundryStreamOverlayDice.criticalHits++;
    if (rollData.isFumble) window.foundryStreamOverlayDice.fumbles++;
    
    // Store recent rolls (keep last 10)
    window.foundryStreamOverlayDice.recentRolls.unshift({
      ...rollData,
      timestamp: Date.now()
    });
    
    if (window.foundryStreamOverlayDice.recentRolls.length > 10) {
      window.foundryStreamOverlayDice.recentRolls.pop();
    }
  }
  
  return rollData;
}

/**
 * Enhanced modifier extraction with D&D 5e specific knowledge
 * @param {Roll} roll - The Foundry roll object
 * @param {ChatMessage} message - The chat message
 * @returns {Array} Array of modifier objects with enhanced labels
 */
export function extractEnhancedModifiers(roll, message) {
  const modifiers = [];
  
  try {
    const terms = roll.terms;
    
    // Look for numeric terms (modifiers)
    terms.forEach((term, index) => {
      if (term.constructor.name === "NumericTerm" && index > 0) {
        const prevTerm = terms[index - 1];
        if (prevTerm.constructor.name === "OperatorTerm") {
          const value = prevTerm.operator === "+" ? term.number : -term.number;
          
          // Enhanced modifier labeling
          const label = determineModifierLabel(value, message, roll);
          
          modifiers.push({
            value: value,
            label: label,
            term: term
          });
        }
      }
    });
    
    // For D&D 5e, extract known modifiers from the roll flavor or item data
    if (game.system.id === "dnd5e" && message.flags?.dnd5e) {
      const rollData = message.flags.dnd5e;
      
      // Extract ability modifier
      if (rollData.roll?.abilityMod !== undefined) {
        const abilityMod = rollData.roll.abilityMod;
        const ability = rollData.roll.ability;
        
        if (abilityMod !== 0) {
          const existingMod = modifiers.find(m => m.value === abilityMod);
          if (existingMod) {
            existingMod.label = `${ability?.toUpperCase() || 'Ability'} Modifier`;
          }
        }
      }
      
      // Extract proficiency bonus
      if (rollData.roll?.prof !== undefined) {
        const prof = rollData.roll.prof;
        if (prof !== 0) {
          const existingMod = modifiers.find(m => m.value === prof);
          if (existingMod) {
            existingMod.label = "Proficiency";
          }
        }
      }
    }
    
  } catch (error) {
    console.warn(`${MODULE_ID} | Error extracting enhanced modifiers:`, error);
  }
  
  return modifiers;
}

/**
 * Determine enhanced modifier labels with game system knowledge
 * @param {number} value - The modifier value
 * @param {ChatMessage} message - The chat message
 * @param {Roll} roll - The roll object
 * @returns {string} Enhanced label for the modifier
 */
function determineModifierLabel(value, message, roll) {
  // D&D 5e specific modifier detection
  if (game.system.id === "dnd5e") {
    const flavor = message.flavor?.toLowerCase() || "";
    const content = message.content?.toLowerCase() || "";
    
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