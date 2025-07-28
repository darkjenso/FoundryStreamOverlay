// Core constants and configuration for Foundry Stream Overlay - OPTIMIZED with Dice Support
export const MODULE_ID = "foundrystreamoverlay";

export const ANIMATION_TYPES = {
  CONTINUOUS: [
    { id: "none", name: "None" },
    { id: "hover", name: "Hover Up/Down" },
    { id: "pulse", name: "Pulse" },
    { id: "heartbeat", name: "Heartbeat" },
    { id: "rotate", name: "Rotate" },
    { id: "wiggle", name: "Wiggle" },
    { id: "slide", name: "Slide" },
    { id: "flash", name: "Flash" },
    { id: "shake", name: "Shake" },
    { id: "shimmer", name: "Shimmer" },
    { id: "breathe", name: "Breathe" },
    { id: "emphasis", name: "Emphasis" },
    { id: "jitter", name: "Jitter" },
    { id: "glitch", name: "Glitch" }
  ],
  
  ENTRANCE: [
    { id: "none", name: "None" },
    { id: "fadeIn", name: "Fade In" },
    { id: "slideInRight", name: "Slide In Right" },
    { id: "slideInLeft", name: "Slide In Left" },
    { id: "slideInUp", name: "Slide Up" },
    { id: "slideInDown", name: "Slide Down" },
    { id: "bounceIn", name: "Bounce In" },
    { id: "zoomIn", name: "Zoom In" },
    { id: "flipIn", name: "Flip In" }
  ],
  
  TRIGGER: [
    { id: "none", name: "None" },
    { id: "hpDamage", name: "HP Damage" },
    { id: "hpHealing", name: "HP Healing" },
    { id: "hover", name: "Hover Up/Down" },
    { id: "pulse", name: "Pulse" },
    { id: "shake", name: "Shake" },
    { id: "flash", name: "Flash" }
  ],
  
  DICE: [
    { id: "diceFlip", name: "Dice Flip (Baldur's Gate Style)" },
    { id: "diceRoll", name: "Rolling Dice" },
    { id: "diceSparkle", name: "Sparkle Effect" },
    { id: "dicePulse", name: "Pulse on Roll" },
    { id: "modifierFlyIn", name: "Modifier Fly-In Animation" }
  ]
};

export const DATA_PATHS = [
  { label: "Actor Name", path: "name" },
  { label: "Current HP", path: "system.attributes.hp.value" },
  { label: "Max HP", path: "system.attributes.hp.max" },
  { label: "HP / HP Max", path: "hp" },
  { label: "AC", path: "system.attributes.ac.value" },
  { label: "Level", path: "system.details.level" },
  { label: "Race", path: "system.details.race" },
  { label: "STR Score", path: "system.abilities.str.value" },
  { label: "DEX Score", path: "system.abilities.dex.value" },
  { label: "CON Score", path: "system.abilities.con.value" },
  { label: "INT Score", path: "system.abilities.int.value" },
  { label: "WIS Score", path: "system.abilities.wis.value" },
  { label: "CHA Score", path: "system.abilities.cha.value" },
  // Pathfinder 2e specifics
  { label: "Hero Points", path: "system.resources.heroPoints.value" },
  { label: "Hero Points / Max", path: "heroPoints" },
  { label: "Other/Custom Path...", path: "custom" }
];

// OPTIMIZED: Reduced from 80+ fonts to 20 essential ones
export const FONT_FAMILIES = [
  // Essential Sans-serif (web safe)
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Helvetica, sans-serif", label: "Helvetica" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "Calibri, sans-serif", label: "Calibri" },
  { value: "Segoe UI, sans-serif", label: "Segoe UI" },
  
  // Gaming/Streaming favorites
  { value: "Impact, sans-serif", label: "Impact (Bold Headlines)" },
  { value: "Oswald, sans-serif", label: "Oswald (Modern)" },
  
  // Readable serif
  { value: "Times New Roman, serif", label: "Times New Roman" },
  { value: "Georgia, serif", label: "Georgia" },
  
  // Monospace for numbers/data
  { value: "Courier New, monospace", label: "Courier New (Fixed Width)" },
  { value: "Consolas, monospace", label: "Consolas (Clean Numbers)" },
  
  // Fantasy/Gaming themes
  { value: "Cinzel, serif", label: "Cinzel (Fantasy)" },
  { value: "Old English Text MT, fantasy", label: "Old English (Medieval)" },
  
  // Modern web fonts (commonly available)
  { value: "Roboto, sans-serif", label: "Roboto" },
  { value: "Open Sans, sans-serif", label: "Open Sans" },
  { value: "Lato, sans-serif", label: "Lato" },
  
  // Fun options
  { value: "Comic Sans MS, cursive", label: "Comic Sans" },
  
  // Custom font option
  { value: "custom", label: "Custom Font..." }
];

// Additional fonts for premium users (optional expansion)
export const PREMIUM_FONTS = [
  { value: "Montserrat, sans-serif", label: "Montserrat" },
  { value: "Playfair Display, serif", label: "Playfair Display" },
  { value: "Orbitron, sans-serif", label: "Orbitron (Sci-Fi)" },
  { value: "Creepster, fantasy", label: "Creepster (Horror)" },
  { value: "Bangers, cursive", label: "Bangers (Comic)" }
];

// Dice types for dice roll items
export const DICE_TYPES = [
  { value: "d4", label: "d4", min: 1, max: 4 },
  { value: "d6", label: "d6", min: 1, max: 6 },
  { value: "d8", label: "d8", min: 1, max: 8 },
  { value: "d10", label: "d10", min: 1, max: 10 },
  { value: "d12", label: "d12", min: 1, max: 12 },
  { value: "d20", label: "d20", min: 1, max: 20 },
  { value: "d100", label: "d100", min: 1, max: 100 }
];

// Animation styles for dice
export const DICE_ANIMATION_STYLES = [
  { value: "baldursgate", label: "Baldur's Gate 3 Style (Advanced)" },
  { value: "simple", label: "Simple Number Change" },
  { value: "flip", label: "Quick Flip Animation" },
  { value: "none", label: "No Animation" }
];

export const LAYOUT_TRANSITIONS = {
  "none": {
    execute: async (container, duration, nextContent) => {
      if (!container?.tagName) {
        console.error("Invalid container for transition");
        return Promise.resolve();
      }
      container.innerHTML = nextContent;
      return Promise.resolve();
    }
  },
  
  "fade": {
    execute: async (container, duration, nextContent) => {
      if (!container?.tagName) return Promise.resolve();
      
      const doc = container.ownerDocument || window.overlayWindow?.document;
      if (!doc) return Promise.resolve();
      
      container.style.transition = `opacity ${duration}s ease-in-out`;
      container.style.opacity = "0";
      
      return new Promise((resolve) => {
        setTimeout(() => {
          container.innerHTML = nextContent;
          container.style.opacity = "1";
          
          setTimeout(() => {
            container.style.transition = "";
            resolve();
          }, duration * 1000);
        }, duration * 1000);
      });
    }
  },
  
  "slide": {
    execute: async (container, duration, nextContent) => {
      if (!container?.tagName) return Promise.resolve();
      
      const wrapper = container.ownerDocument.createElement('div');
      wrapper.style.cssText = `
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      `;

      const oldDiv = container.ownerDocument.createElement('div');
      oldDiv.innerHTML = container.innerHTML;
      oldDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        transition: transform ${duration}s ease-in-out;
      `;

      const newDiv = container.ownerDocument.createElement('div');
      newDiv.innerHTML = nextContent;
      newDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 100%;
        width: 100%;
        height: 100%;
        transition: transform ${duration}s ease-in-out;
      `;

      wrapper.appendChild(oldDiv);
      wrapper.appendChild(newDiv);
      container.innerHTML = '';
      container.appendChild(wrapper);

      return new Promise((resolve) => {
        setTimeout(() => {
          oldDiv.style.transform = 'translateX(-100%)';
          newDiv.style.transform = 'translateX(-100%)';

          setTimeout(() => {
            container.innerHTML = nextContent;
            resolve();
          }, duration * 1000);
        }, 50);
      });
    }
  }
};

// System-specific data path examples (reduced)
export const SYSTEM_EXAMPLES = {
  "dnd5e": [
    { label: "Current HP", path: "system.attributes.hp.value" },
    { label: "Max HP", path: "system.attributes.hp.max" },
    { label: "Spell Slots (Level 1)", path: "system.spells.spell1.value" },
    { label: "AC", path: "system.attributes.ac.value" },
    { label: "Proficiency Bonus", path: "system.attributes.prof" },
    { label: "Class", path: "system.details.class" },
    { label: "Race", path: "system.details.race" },
    { label: "STR", path: "system.abilities.str.value" },
    { label: "DEX", path: "system.abilities.dex.value" },
    { label: "CON", path: "system.abilities.con.value" },
    { label: "INT", path: "system.abilities.int.value" },
    { label: "WIS", path: "system.abilities.wis.value" },
    { label: "CHA", path: "system.abilities.cha.value" }
  ],
  "pf2e": [
    { label: "Current HP", path: "system.attributes.hp.value" },
    { label: "Max HP", path: "system.attributes.hp.max" },
    { label: "Temp HP", path: "system.attributes.hp.temp" },
    { label: "AC", path: "system.attributes.ac.value" },
    { label: "Perception", path: "system.attributes.perception.value" },
    { label: "Level", path: "system.details.level.value" },
    { label: "XP", path: "system.details.xp.value" },
    { label: "Max XP", path: "system.details.xp.max" },
    { label: "Hero Points", path: "system.resources.heroPoints.value" },
    { label: "Hero Points / Max", path: "heroPoints" },
    { label: "Max Hero Points", path: "system.resources.heroPoints.max" },
    { label: "Focus Points", path: "system.resources.focus.value" },
    { label: "Speed", path: "system.attributes.speed.value" },
    { label: "STR", path: "system.abilities.str.value" },
    { label: "DEX", path: "system.abilities.dex.value" },
    { label: "CON", path: "system.abilities.con.value" },
    { label: "INT", path: "system.abilities.int.value" },
    { label: "WIS", path: "system.abilities.wis.value" },
    { label: "CHA", path: "system.abilities.cha.value" },
    { label: "Fortitude Save", path: "system.saves.fortitude.value" },
    { label: "Reflex Save", path: "system.saves.reflex.value" },
    { label: "Will Save", path: "system.saves.will.value" }
  ],
  "pf1": [
    { label: "Current HP", path: "system.attributes.hp.value" },
    { label: "Max HP", path: "system.attributes.hp.max" },
    { label: "AC", path: "system.attributes.ac.value" },
    { label: "Level", path: "system.details.level" },
    { label: "STR", path: "system.abilities.str.value" },
    { label: "DEX", path: "system.abilities.dex.value" },
    { label: "CON", path: "system.abilities.con.value" },
    { label: "INT", path: "system.abilities.int.value" },
    { label: "WIS", path: "system.abilities.wis.value" },
    { label: "CHA", path: "system.abilities.cha.value" },
    { label: "Perception Skill", path: "system.skills.per.total" }
  ],
  "coc7": [
    { label: "Name", path: "name" },
    { label: "STR", path: "system.characteristics.strength.value" },
    { label: "CON", path: "system.characteristics.constitution.value" },
    { label: "DEX", path: "system.characteristics.dexterity.value" },
    { label: "SIZ", path: "system.characteristics.size.value" },
    { label: "INT", path: "system.characteristics.intelligence.value" },
    { label: "POW", path: "system.characteristics.power.value" },
    { label: "APP", path: "system.characteristics.appearance.value" },
    { label: "EDU", path: "system.characteristics.education.value" },
    { label: "HP", path: "system.attribs.hp.value" },
    { label: "Max HP", path: "system.attribs.hp.max" },
    { label: "MP", path: "system.attribs.mp.value" },
    { label: "Sanity", path: "system.attribs.san.value" },
    { label: "Max Sanity", path: "system.attribs.san.max" },
    { label: "Luck", path: "system.attribs.lck.value" },
    { label: "Movement", path: "system.attribs.mov.value" },
    { label: "Damage Bonus", path: "system.attribs.db.value" },
    { label: "Occupation", path: "system.infos.occupation" },
    { label: "Age", path: "system.infos.age" },
    { label: "Residence", path: "system.infos.residence" }
  ],
  "swade": [
    { label: "Name", path: "name" },
    { label: "Species", path: "data.details.species.name" },
    { label: "Bennies", path: "data.bennies.max" },
    { label: "Agility Die", path: "data.attributes.agility.die.sides" },
    { label: "Agility Mod", path: "data.attributes.agility.modifier" },
    { label: "Smarts Die", path: "data.attributes.smarts.die.sides" },
    { label: "Smarts Mod", path: "data.attributes.smarts.modifier" },
    { label: "Might Die", path: "data.attributes.might.die.sides" },
    { label: "Might Mod", path: "data.attributes.might.modifier" },
    { label: "Spirit Die", path: "data.attributes.spirit.die.sides" },
    { label: "Spirit Mod", path: "data.attributes.spirit.modifier" },
    { label: "Vigor Die", path: "data.attributes.vigor.die.sides" },
    { label: "Vigor Mod", path: "data.attributes.vigor.modifier" },
    { label: "Speed", path: "data.stats.speed.adjusted" },
    { label: "Parry", path: "data.stats.parry.value" },
    { label: "Toughness", path: "data.stats.toughness.value" },
    { label: "Armor", path: "data.stats.toughness.armor" }
  ],
  "sfrpg": [
    { label: "Name", path: "name" },
    { label: "Current HP", path: "system.attributes.hp.value" },
    { label: "Max HP", path: "system.attributes.hp.max" },
    { label: "Level", path: "system.details.level" },
    { label: "STR", path: "system.abilities.str.value" },
    { label: "DEX", path: "system.abilities.dex.value" },
    { label: "CON", path: "system.abilities.con.value" },
    { label: "INT", path: "system.abilities.int.value" },
    { label: "WIS", path: "system.abilities.wis.value" },
    { label: "CHA", path: "system.abilities.cha.value" },
    { label: "Perception", path: "system.skills.perception.total" }
  ],
  "alienrpg": [
    { label: "Name", path: "name" },
    { label: "Current HP", path: "system.header.health.value" },
    { label: "Max HP", path: "system.header.health.max" },
    { label: "Stress", path: "system.header.stress.value" },
    { label: "AGL", path: "system.attributes.agl.value" },
    { label: "EMP", path: "system.attributes.emp.value" },
    { label: "STR", path: "system.attributes.str.value" },
    { label: "WIT", path: "system.attributes.wit.value" },
    { label: "Career", path: "system.general.career.value" },
    { label: "Cash", path: "system.general.cash.value" },
    { label: "Air", path: "system.consumables.air.value" },
    { label: "Food", path: "system.consumables.food.value" },
    { label: "Water", path: "system.consumables.water.value" },
    { label: "Power", path: "system.consumables.power.value" },
    { label: "Close Combat", path: "system.skills.closeCbt.value" },
    { label: "Ranged Combat", path: "system.skills.rangedCbt.value" },
    { label: "Medical Aid", path: "system.skills.medicalAid.value" },
    { label: "STR", path: "system.abilities.str.mod" },
    { label: "DEX", path: "system.abilities.dex.mod" },
    { label: "CON", path: "system.abilities.con.mod" },
    { label: "INT", path: "system.abilities.int.mod" },
    { label: "WIS", path: "system.abilities.wis.mod" },
    { label: "CHA", path: "system.abilities.cha.mod" }
  ],
  "wfrp4e": [
    { label: "Wounds", path: "system.status.wounds.value" },
    { label: "Fate", path: "system.status.fate.value" },
    { label: "Fortune", path: "system.status.fortune.value" }
  ]
};

// UPDATED: Item templates including dice
export const ITEM_TEMPLATES = {
  data: {
    type: "data",
    actorId: "",
    dataPath: "name",
    customPath: "",
    top: 0,
    left: 0,
    hide: false,
    fontSize: 16,
    bold: false,
    fontFamily: "Arial, sans-serif",
    fontColor: "#000000",
    fontStroke: false,
    fontStrokeColor: "#000000",
    fontStrokeWidth: 1,
    dropShadow: false,
    addLabel: false,
    order: 0,
    animations: []
  },
  
  static: {
    type: "static",
    content: "Static text",
    top: 0,
    left: 0,
    hide: false,
    fontSize: 16,
    bold: false,
    fontFamily: "Arial, sans-serif",
    fontColor: "#000000",
    fontStroke: false,
    fontStrokeColor: "#000000",
    dropShadow: false,
    fontStrokeWidth: 1,
    order: 0,
    animations: []
  },
  
  image: {
    type: "image",
    imagePath: "",
    imageSize: 100,
    dynamicImage: false,
    dynamicRules: [],
    top: 0,
    left: 0,
    hide: false,
    order: 0,
    animations: []
  },
  
  // NEW: Dice roll item template
  dice: {
    type: "dice",
    diceType: "d20",
    alwaysVisible: false,
    targetUsers: [], // Array of user IDs to listen for
    style: "diceOnly",
    top: 0,
    left: 0,
    hide: false,
    fontSize: 24,
    bold: true,
    fontFamily: "Impact, sans-serif",
    fontColor: "#ffffff",
    fontStroke: true,
    fontStrokeColor: "#000000",
    fontStrokeWidth: 2,
    dropShadow: false,
    rollAnimation: false,
    rollDuration: 1000,
    rollSpeed: 10,
    lastRoll: null, // Stores the last roll data
    order: 0,
    animations: []
      },

  hpBar: {
    type: "hpBar",
    actorId: "",
    barWidth: 200,
    barHeight: 20,
    orientation: "ltr",
    rounded: true,
    outline: false,
    cornerRadius: 4,
    outlineWidth: 1,
    outlineColor: "#000000",
    dropShadow: false,
    gradient: true,
    startColor: "#0094ff",
    endColor: "#ff0000",
    singleColor: "#0094ff",
    backgroundColor: "transparent",
    showBackground: false,
    backgroundColor: "#000000",
    top: 0,
    left: 0,
    hide: false,
    order: 0,
    animations: []
  }
};

// Common CSS class names (for consistency)
export const CSS_CLASSES = {
  OVERLAY_ITEM: 'fso-overlay-item',
  SCENE_MANAGER: 'fso-scene-manager',
  ITEM_CARD: 'fso-item-card',
  PREMIUM_NOTICE: 'fso-premium-notice',
  CONFIG_SECTION: 'fso-config-section',
  ADD_BUTTON: 'fso-add-button',
  ACTION_BUTTON: 'fso-action-button'
};