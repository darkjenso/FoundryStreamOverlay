
import OverlayData from './data-storage.js';
const MODULE_ID = "foundrystreamoverlay";

const LAYOUT_TRANSITIONS = {
 
  "none": {
    execute: async (container, duration, nextContent) => {
      console.log("Executing none transition", { container, duration, nextContent });
      
      
      if (container && typeof container === 'object' && container.tagName) {
        container = container;
      } else {
        console.error("Cannot convert container to Element", { container });
        return Promise.resolve();
      }

      
      container.innerHTML = nextContent;
      return Promise.resolve();
    }
  },
  "fade": {
    execute: async (container, duration, nextContent) => {
      console.log("Executing fade transition", { 
        container, 
        containerType: typeof container, 
        containerIsElement: container instanceof Element,
        duration, 
        nextContent 
      });
      
      
      if (container && typeof container === 'object' && container.tagName) {
        container = container;
      } else {
        console.error("Cannot convert container to Element", { container });
        return Promise.resolve();
      }
      
      
      const doc = container.ownerDocument || window.overlayWindow.document;
      
      
      const oldOverlay = doc.createElement("div");
      const newOverlay = doc.createElement("div");
      
      
      const overlayStyle = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        transition: opacity ${duration}s ease-in-out;
      `;
      
      oldOverlay.style.cssText = `${overlayStyle}
        z-index: 10;
        opacity: 1;
      `;
      
      newOverlay.style.cssText = `${overlayStyle}
        z-index: 11;
        opacity: 0;
      `;
      
      
      oldOverlay.innerHTML = container.innerHTML;
      newOverlay.innerHTML = nextContent;
      
     
      container.innerHTML = '';
      container.appendChild(oldOverlay);
      container.appendChild(newOverlay);
      
      
      return new Promise((resolve) => {
        setTimeout(() => {
          oldOverlay.style.opacity = "0";
          newOverlay.style.opacity = "1";
          
         
          setTimeout(() => {
            container.innerHTML = nextContent;
            resolve();
          }, duration * 1000);
        }, 50);
      });
    }
  },
  "slide": {
    execute: async (container, duration, nextContent) => {
      console.log("Executing slide transition", { 
        container, 
        containerType: typeof container, 
        containerIsElement: container instanceof Element,
        duration, 
        nextContent 
      });
      
      if (container && typeof container === 'object' && container.tagName) {
        container = container;
      } else {
        console.error("Cannot convert container to Element", { container });
        return Promise.resolve();
      }
      
      const doc = container.ownerDocument || window.overlayWindow.document;
      
      const wrapper = doc.createElement('div');
      wrapper.style.cssText = `
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      `;

      const oldDiv = doc.createElement('div');
      oldDiv.innerHTML = container.innerHTML;
      oldDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        transition: transform ${duration}s ease-in-out;
      `;

      const newDiv = doc.createElement('div');
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
  },
  "flip": {
    execute: async (container, duration, nextContent) => {
      console.log("Executing flip transition", { 
        container, 
        containerType: typeof container, 
        containerIsElement: container instanceof Element,
        duration, 
        nextContent 
      });
      
      if (container && typeof container === 'object' && container.tagName) {
        container = container;
      } else {
        console.error("Cannot convert container to Element", { container });
        return Promise.resolve();
      }
      
      const doc = container.ownerDocument || window.overlayWindow.document;
      
      container.style.perspective = "1000px";
      container.style.transformStyle = "preserve-3d";
      
      container.style.transition = `transform ${duration}s ease-in-out`;
      
      await new Promise(resolve => {
        setTimeout(() => {
          container.style.transform = "rotateY(90deg)";
          setTimeout(() => {
            container.innerHTML = nextContent;
            resolve();
          }, duration * 1000);
        }, 50);
      });
      
      await new Promise(resolve => {
        setTimeout(() => {
          container.style.transform = "rotateY(0deg)";
          setTimeout(() => {
            container.style.transition = "";
            container.style.perspective = "";
            container.style.transformStyle = "";
            resolve();
          }, duration * 1000);
        }, 50);
      });
    }
  }
};
const POSSIBLE_DATA_PATHS = [
  { label: "Actor Name", path: "name" },
  { label: "Current HP", path: "system.attributes.hp.value" },
  { label: "Max HP", path: "system.attributes.hp.max" },
  { label: "HP / HP Max", path: "hp" },
  { label: "AC", path: "system.attributes.ac.value" },
  { label: "Level", path: "system.details.level" },
  { label: "Class", path: "system.details.class" },
  { label: "Race", path: "system.details.race" },
  { label: "STR Score", path: "system.abilities.str.value" },
  { label: "DEX Score", path: "system.abilities.dex.value" },
  { label: "CON Score", path: "system.abilities.con.value" },
  { label: "INT Score", path: "system.abilities.int.value" },
  { label: "WIS Score", path: "system.abilities.wis.value" },
  { label: "CHA Score", path: "system.abilities.cha.value" },
  { label: "Other/Custom Path...", path: "custom" }
];

function validateActivationKey(key) {
  if (!key || key.length !== 16 || !/^[A-F0-9]{16}$/.test(key)) {
    if (key !== "") {
      ui.notifications.error("Invalid activation key format.");
    }
    game.settings.set(MODULE_ID, "isPremium", false);
    return;
  }
  
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const charCode = parseInt(key[i], 16);
    sum = (sum + charCode) % 16;
  }
  
  const expectedChecksum = sum.toString(16).toUpperCase();
  const lastChar = key[15];
  
  const isValid = lastChar === expectedChecksum;
  
  game.settings.set(MODULE_ID, "isPremium", isValid);
  
  if (isValid) {
    ui.notifications.info("Premium features activated! Thank you for your support.");
  } else {
    ui.notifications.error("Invalid activation key.");
  }
}




Hooks.once("init", () => {
  Handlebars.registerHelper("ifEquals", function(arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
  });


  Handlebars.registerHelper("eq", function(a, b) {
    return a === b;
  });


  Hooks.on("ready", () => {
    const isPremium = OverlayData.getSetting("isPremium") || false;
    const layouts = OverlayData.getLayouts();
    
    if (!layouts["Default"]) {
      layouts["Default"] = [];
      game.settings.set(MODULE_ID, "layouts", layouts);
    }
    
    if (!isPremium) {
      game.settings.set(MODULE_ID, "activeLayout", "Default");
    }
  });

  Handlebars.registerHelper("ifNotDefault", function(value, options) {
    if (value !== "Default") {
      return options.fn(this);
    }
    return "";
  });

  game.settings.register(MODULE_ID, "overlayWindows", {
    name: "Overlay Windows",
    hint: "Configurations for multiple overlay windows",
    scope: "client",
    config: false,
    type: Object,
    default: {
      "main": { 
        id: "main", 
        name: "Main Overlay",
        activeLayout: "Default",
        slideshowActive: false
      }
    }
  });

  game.settings.register(MODULE_ID, "backgroundColour", {
    name: "Background Colour",
    hint: "Chroma key colour for the overlay background.",
    scope: "client",
    type: String,
    default: "#00ff00",
    config: true,
    onChange: (value) => {
      if (window.overlayWindow && !window.overlayWindow.closed) {
        window.overlayWindow.document.body.style.backgroundColor = value;
      }
    }
  });

  // Add to module settings
game.settings.register(MODULE_ID, "enableTriggeredAnimations", {
  name: "Enable Triggered Animations",
  hint: "Automatically play animations when HP changes, etc.",
  scope: "client",
  config: true,
  type: Boolean,
  default: true
});



game.settings.register(MODULE_ID, "activationKey", {
  name: "Premium Activation Key",
  hint: "Enter your key from Patreon to unlock premium features.",
  scope: "client",
  config: true,
  type: String,
  default: "",
  onChange: value => validateActivationKey(value)
});

game.settings.register(MODULE_ID, "isPremium", {
  name: "Premium Status",
  scope: "client",
  config: false,
  type: Boolean,
  default: false
});



  game.settings.register(MODULE_ID, "activationKey", {
    name: "Premium Activation Key",
    hint: "Enter your key from Patreon to unlock premium features.",
    scope: "client",
    config: true,
    type: String,
    default: "",
    onChange: value => validateActivationKey(value)
  });

  game.settings.register(MODULE_ID, "isPremium", {
    name: "Premium Status",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  function validateActivationKey(key) {
    if (!key || key.length !== 16 || !/^[A-F0-9]{16}$/.test(key)) {
      if (key !== "") {
        ui.notifications.error("Invalid activation key format.");
      }
      game.settings.set(MODULE_ID, "isPremium", false);
      return;
    }
    
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      const charCode = parseInt(key[i], 16);
      sum = (sum + charCode) % 16;
    }
    
    const expectedChecksum = sum.toString(16).toUpperCase();
    const lastChar = key[15];
    
    const isValid = lastChar === expectedChecksum;
    
    game.settings.set(MODULE_ID, "isPremium", isValid);
    
    if (isValid) {
      ui.notifications.info("Premium features activated! Thank you for your support.");
    } else {
      ui.notifications.error("Invalid activation key.");
    }
  }

  
  game.settings.register(MODULE_ID, "layouts", {
    name: "Layouts",
    hint: "Stores all overlay layouts. Each key is a layout name and its value is an array of overlay items.",
    scope: "client",
    type: Object,
    default: { "Default": [] },
    config: false,
    onChange: () => {
      updateOverlayWindow();
    }
  });

  game.settings.register(MODULE_ID, "activeLayout", {
    name: "Active Layout",
    hint: "The layout that is currently in use.",
    scope: "client",
    type: String,
    default: "Default",
    config: false,
    onChange: () => {
      updateOverlayWindow();
    }
  });

  game.settings.registerMenu(MODULE_ID, "windowManager", {
    name: "Manage Overlay Windows",
    label: "Multiple Windows",
    hint: "Create and manage multiple overlay windows (Premium feature)",
    icon: "fas fa-desktop",
    type: OverlayWindowManager,
    restricted: false
  });

  game.settings.registerMenu(MODULE_ID, "overlayConfigMenu", {
    name: "Configure Overlay Items",
    label: "Configure Overlay",
    hint: "Edit overlay items for the active layout.",
    icon: "fas fa-bars",
    type: OverlayConfig,
    restricted: false
  });

  game.settings.registerMenu(MODULE_ID, "manageLayouts", {
    name: "Manage Layouts",
    label: "Manage Layouts",
    hint: "Create, rename, delete, export, or import overlay layouts.",
    icon: "fas fa-layer-group",
    type: ManageLayouts,
    restricted: false
  });

  game.settings.registerMenu(MODULE_ID, "openOverlayWindow", {
    name: "Open Overlay Window",
    label: "Open Overlay",
    hint: "Open the overlay in a separate pop-up window.",
    icon: "fas fa-external-link-alt",
    type: OverlayWindowOpener,
    restricted: false,
    config: true
  });

  game.settings.register(MODULE_ID, "slideshow", {
    name: "Slideshow Configuration",
    hint: "Stores the ordered list of layouts with durations for the slideshow.",
    scope: "client",
    type: Object,
    default: { 
      list: [], 
      random: false,
      transition: "none",
      transitionDuration: 0.5
    },
    config: false
  });

  game.settings.registerMenu(MODULE_ID, "slideshowSettings", {
    name: "Slideshow Settings",
    label: "Slideshow Settings",
    hint: "Configure a slideshow of overlay layouts.",
    icon: "fas fa-play",
    type: SlideshowConfig,
    restricted: false
  });

  console.log("Module settings registered.");
});

class FoundryStreamOverlay extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "foundry-stream-overlay",
      title: "Foundry Stream Overlay",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay.html`,
      width: 800,
      height: 600,
      resizable: true,
      minimisable: false,
      popOut: true,
      classes: ["foundry-stream-overlay", "no-header"]
    });
  }

  getData() {
    const backgroundColour = game.settings.get(MODULE_ID, "backgroundColour");
    const layouts = OverlayData.getLayouts();
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const isPremium = OverlayData.getSetting("isPremium") || false;
  
    const items = (layouts[activeLayout] || []).map(item => {
      const animation = item.animation || "none";
      const animationDelay = (item.animationDelay !== undefined) ? item.animationDelay : 0;
      const animationDuration = item.animationDuration || 1.5;
      const entranceAnimation = item.entranceAnimation || "none";
      const entranceDuration = item.entranceDuration || 0.5;
      const entranceDelay = item.entranceDelay || 0;
      
      if (item.type === "image") {
        return {
          type: "image",
          imagePath: item.imagePath || "",
          imageSize: item.imageSize || 100,
          top: item.top ?? 0,
          left: item.left ?? 0,
          hide: item.hide ?? false,
          order: item.order || 0,
          animation,
          animationDelay,
          animationDuration,
          entranceAnimation,
          entranceDuration,
          entranceDelay
        };
      } else if (item.type === "static") {
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
          order: item.order || 0,
          animation,
          animationDelay,
          animationDuration,
          entranceAnimation,
          entranceDuration,
          entranceDelay
        };
      } else {
        const actor = game.actors.get(item.actorId);
        if (!actor) return null;
        if (item.hide) return null;
        let textValue = (item.dataPath === "name")
          ? actor.name
          : foundry.utils.getProperty(actor, item.dataPath);
        if (textValue === null || textValue === undefined) textValue = "N/A";
        return {
          type: "data",
          actorId: item.actorId,
          dataPath: item.dataPath,
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
          fontStrokeWidth: item.fontStrokeWidth || 1,    
          order: item.order || 0,
          animation,
          animationDelay,
          animationDuration,
          entranceAnimation,
          entranceDuration,
          entranceDelay
        };
      }
    }).filter(Boolean);
  
    items.sort((a, b) => a.order - b.order);
    const max = items.length;
    items.forEach((item, index) => {
      item.renderOrder = max - index;
    });
  
    return {
      backgroundColour,
      items,
      isPremium   
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}



class PremiumStatusDialog extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Premium Status",
      id: "foundrystreamoverlay-premium-status",
      template: `modules/${MODULE_ID}/templates/premium-status.html`,
      width: 400,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const isPremium = OverlayData.getSetting("isPremium") || false;
    const activationKey = game.settings.get(MODULE_ID, "activationKey") || "";
    return { isPremium, activationKey };
  }

  activateListeners(html) {
    super.activateListeners(html);

    
    
    html.find("#activate-key-button").click(async (event) => {
      event.preventDefault();
      const key = html.find("#activation-key-input").val().trim();
      
      if (!key) {
        ui.notifications.warn("Please enter an activation key.");
        return;
      }
      
      await game.settings.set(MODULE_ID, "activationKey", key);
      this.render();
    });
  }

  async _updateObject(event, formData) {
  }
}

Hooks.once("init", () => {
  
  game.settings.register(MODULE_ID, "activationKey", {
    name: "Premium Activation Key",
    hint: "Enter your key from Patreon to unlock premium features.",
    scope: "client",
    config: true,
    type: String,
    default: "",
    onChange: value => validateActivationKey(value)
  });

  game.settings.register(MODULE_ID, "isPremium", {
    name: "Premium Status",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });
  
  game.settings.registerMenu(MODULE_ID, "premiumStatus", {
    name: "Premium Status",
    label: "Premium Status",
    hint: "Check your premium status or activate with a key.",
    icon: "fas fa-gem",
    type: PremiumStatusDialog,
    restricted: false
  });
  
});



class OverlayConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Configure Active Layout Items",
      id: "foundrystreamoverlay-config",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-config.html`,
      width: 800,
      height: "auto",
      closeOnSubmit: false
    });
  }

  _injectStyles() {
    const styleId = "foundrystreamoverlay-config-styles";
    if (document.getElementById(styleId)) return;
    
    const styleElem = document.createElement('style');
    styleElem.id = styleId;
    styleElem.textContent = `
      .overlay-config-container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 120px);
        max-height: 800px;
      }
      
      .overlay-config-header {
        flex: 0 0 auto;
        margin-bottom: 1em;
      }
      
      .overlay-config-items {
        flex: 1 1 auto;
        overflow-y: auto;
        margin-bottom: 1em;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 0 4px;
      }
      
      .overlay-config-footer {
        flex: 0 0 auto;
        border-top: 1px solid #ddd;
        padding-top: 1em;
        margin-top: 1em;
        position: sticky;
        bottom: 0;
        background: var(--color-bg, white);
        padding-bottom: 0.5em;
      }
      
      .overlay-config-buttons {
        display: flex;
        justify-content: space-between;
        margin-top: 1em;
      }
      
      .overlay-config-buttons .left-buttons {
        display: flex;
        gap: 0.5em;
      }
      
      .overlay-config-buttons .right-buttons {
        display: flex;
        gap: 0.5em;
      }
      
      .auto-save-feedback {
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 100, 0, 0.7);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .animation-indicator {
        display: inline-block;
        margin-left: 5px;
        color: #4CAF50;
      }
      
      .manage-animations {
        width: 100%;
        text-align: center;
      }
      
      .custom-path-input {
        margin-top: 5px;
        padding: 5px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 3px;
      }
      
      .custom-path-input input {
        width: 100%;
        margin-bottom: 4px;
      }
      
      .custom-path-input small {
        display: block;
        font-style: italic;
        color: #666;
      }
      
      .custom-path-help {
        display: inline-block;
        margin-left: 5px;
        position: relative;
      }
      
      .data-path-examples {
        margin-top: 8px;
        font-size: 0.9em;
        color: #555;
      }
      
      .data-path-examples code {
        background: rgba(0,0,0,0.05);
        padding: 2px 4px;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(styleElem);
  }
  
  async _render(force, options) {
    await super._render(force, options);
    this._injectStyles();
  }



  _populateSystemExamples(html) {
    const gameSystem = game.system.id;
    const examplesContainer = html.find('.system-examples-container');
    
    if (!examplesContainer.length) return;
    
    let examples = [];
    
    // Add system-specific examples
    switch (gameSystem) {
      case "dnd5e":
        examples = [
          { label: "Current HP", path: "system.attributes.hp.value" },
          { label: "Max HP", path: "system.attributes.hp.max" },
          { label: "Spell Slots (Level 1)", path: "system.spells.spell1.value" },
          { label: "Spell Slots (Level 2)", path: "system.spells.spell2.value" },
          { label: "Class Levels", path: "system.details.level" },
          { label: "XP", path: "system.details.xp.value" },
          { label: "Proficiency Bonus", path: "system.attributes.prof" }
        ];
        break;
      case "pf2e":
        examples = [
          { label: "Hero Points", path: "system.resources.heroPoints.value" },
          { label: "Focus Points", path: "system.resources.focus.value" },
          { label: "Speed", path: "system.attributes.speed.value" },
          { label: "Stamina Points", path: "system.attributes.sp.value" },
          { label: "Resolve Points", path: "system.attributes.rp.value" }
        ];
        break;
      case "wfrp4e":
        examples = [
          { label: "Wounds", path: "system.status.wounds.value" },
          { label: "Fate", path: "system.status.fate.value" },
          { label: "Fortune", path: "system.status.fortune.value" },
          { label: "Advantage", path: "system.status.advantage.value" }
        ];
        break;
      case "tormenta20":
        examples = [
          { label: "Pontos de Mana", path: "system.attributes.mana.value" },
          { label: "Exp", path: "system.attributes.exp.value" }
        ];
        break;
      default:
        // Generic examples for all systems
        examples = [
          { label: "Name", path: "name" },
          { label: "Current HP", path: "system.attributes.hp.value" },
          { label: "Look for 'system.attributes', 'system.resources', etc.", path: "" }
        ];
    }
    
    // Only show if we have examples
    if (examples.length) {
      let html = `<div class="data-path-examples">
                    <h4>Common Data Paths for ${game.system.title || gameSystem}:</h4>
                    <ul>`;
      
      examples.forEach(example => {
        if (example.path) {
          html += `<li><strong>${example.label}:</strong> <code>${example.path}</code></li>`;
        } else {
          html += `<li>${example.label}</li>`;
        }
      });
      
      html += `</ul>
              <p><em>Tip: To explore an actor's data structure, right-click on the token and select "Export Data" to view all available paths.</em></p>
              </div>`;
      
      examplesContainer.html(html).show();
    }
  }

  getData() {
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const rows = (layouts[activeLayout] || []).map((item, idx) => {
      // Check if this item has animations configured
      const hasAnimations = !!(item.animations && item.animations.length > 0);
      
      return {
        idx,
        type: item.type || "data", 
        actorId: item.actorId || "",
        dataPath: item.dataPath || "name",
        customPath: item.customPath || "", // Make sure custom path is included
        content: item.content || "",
        top: item.top || 0,
        left: item.left || 0,
        hide: item.hide || false,
        fontSize: item.fontSize || 16,
        bold: item.bold || false,
        fontFamily: item.fontFamily || "Arial, sans-serif",
        fontColor: item.fontColor || "#000000",
        fontStroke: item.fontStroke || false,           
        fontStrokeColor: item.fontStrokeColor || "#000000",
        fontStrokeWidth: item.fontStrokeWidth || 1,     
        addLabel: item.addLabel || false, 
        imagePath: item.imagePath || "",
        imageSize: item.imageSize || 100,
        order: item.order || idx,
        animation: item.animation || "none",
        animationDelay: (item.animationDelay !== undefined) ? item.animationDelay : 0,
        animationDuration: item.animationDuration || 1.5,
        entranceAnimation: item.entranceAnimation || "none",
        entranceDuration: item.entranceDuration || 0.5,
        entranceDelay: item.entranceDelay || 0,
        hasAnimations 
      };
    });
    const dataPathChoices = POSSIBLE_DATA_PATHS;
    const allActors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
    
    // Add helpful examples for the most common game systems
    const gameSystem = game.system.id;
    let systemExamples = [];
    
    switch (gameSystem) {
      case "dnd5e":
        systemExamples = [
          { label: "Spell Slots", path: "system.spells.spell1.value" },
          { label: "Proficiency Bonus", path: "system.attributes.prof" },
          { label: "Initiative", path: "system.attributes.init.total" }
        ];
        break;
      case "pf2e":
        systemExamples = [
          { label: "Hero Points", path: "system.resources.heroPoints.value" },
          { label: "Focus Points", path: "system.resources.focus.value" },
          { label: "Speed", path: "system.attributes.speed.value" }
        ];
        break;
      case "swade":
        systemExamples = [
          { label: "Bennies", path: "system.bennies.value" },
          { label: "Wild Die", path: "system.wildDie" },
          { label: "Wounds", path: "system.wounds.value" }
        ];
        break;
      case "wfrp4e":
        systemExamples = [
          { label: "Wounds", path: "system.status.wounds.value" },
          { label: "Fate", path: "system.status.fate.value" },
          { label: "Fortune", path: "system.status.fortune.value" }
        ];
        break;
    }
    
    return { 
      rows, 
      allActors, 
      dataPathChoices, 
      activeLayout, 
      layouts,
      gameSystem,
      systemExamples
    };
  }

  
  activateListeners(html) {
    super.activateListeners(html);
    
  
    html.find('select[name^="dataPath-"]').change(function() {
      const index = this.name.split('-')[1];
      const customPathInput = html.find(`.custom-path-input[data-index="${index}"]`);
      const isCustom = this.value === 'custom';
      
      if (isCustom) {
        customPathInput.slideDown(200);
        
        // Populate this specific field's examples
        populateSystemExamplesForField(html, index);
        
        // Show the examples container for this specific field
        customPathInput.find('.system-examples-container').slideDown(200);
        
        setTimeout(() => {
          customPathInput.find('input').focus();
        }, 210);
      } else {
        customPathInput.slideUp(200);
      }
    });
    
    html.find('select[name^="dataPath-"]').each(function() {
      const index = this.name.split('-')[1];
      const customPathInput = html.find(`.custom-path-input[data-index="${index}"]`);
      const isCustom = this.value === 'custom';
      
      if (isCustom) {
        customPathInput.show();
        populateSystemExamplesForField(html, index);
        customPathInput.find('.system-examples-container').show();
      } else {
        customPathInput.hide();
      }
    });

    setTimeout(() => {
      const hasCustomPath = html.find('select[name^="dataPath-"]').filter(function() {
        return $(this).val() === 'custom';
      }).length > 0;
    
      if (!hasCustomPath) {
        html.find('.system-examples-container').hide();
      } else {
        html.find('.system-examples-container').show();
      }
    }, 100);
    
    html.find(".debug-actor-data").click(this._onDebugActorData.bind(this));
    
    const isPremium = OverlayData.getSetting("isPremium") || false;
    
    html.find('input, select').on('change', this._onFieldChange.bind(this));
    
    if (!isPremium) {
      html.find(".manage-animations").prop('disabled', true);
      html.find(".manage-animations").after(
        '<div class="premium-note" style="color:#aa5555;font-size:0.8em;margin-top:5px;">Premium feature</div>'
      );
    
      
      html.find("select[name^='entranceAnimation-']").each(function() {
        $(this).find("option:not([value='none'])").prop("disabled", true);
        $(this).val("none");
      });
      
      html.find("input[name^='animationDelay-']").prop("disabled", true);
      html.find("input[name^='animationDuration-']").prop("disabled", true);
      html.find("input[name^='entranceDuration-']").prop("disabled", true);
      html.find("input[name^='entranceDelay-']").prop("disabled", true);
      
      html.find("select[name^='animation-']").closest("td").append(
        '<div class="premium-note" style="color:#aa5555;font-size:0.8em;margin-top:5px;">Premium feature</div>'
      );
      html.find("select[name^='entranceAnimation-']").closest("td").append(
        '<div class="premium-note" style="color:#aa5555;font-size:0.8em;margin-top:5px;">Premium feature</div>'
      );
    }
    
    html.find("#active-layout").change(async e => {
      e.preventDefault();
      const newLayout = html.find("#active-layout").val();
      await game.settings.set("foundrystreamoverlay", "activeLayout", newLayout);
      ui.notifications.info("Active layout set to " + newLayout);
      
      this.render();
    });
  
    html.find('.toggle-extras-column').click(function() {
      const $button = $(this);
      const $icon = $button.find('i');
      const $extrasColumns = html.find('.extras-column');
      
      if ($extrasColumns.first().find('.extras-content').is(':visible')) {
        $extrasColumns.find('.extras-content').slideUp(200);
        $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
      } else {
        $extrasColumns.find('.extras-content').slideDown(200);
        $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
      }
    });
    
    html.find(".add-row").click(this._onAddRow.bind(this));
    html.find(".add-image").click(this._onAddImage.bind(this));
    html.find(".add-static").click(this._onAddStatic.bind(this));
    html.on("click", ".remove-row", this._onRemoveRow.bind(this));
    html.find(".move-up").click(this._onMoveUp.bind(this));
    html.find(".move-down").click(this._onMoveDown.bind(this));
    
    html.find(".manage-animations").click(this._onManageAnimations.bind(this));
    
    html.find(".file-picker").off("click").click(e => {
      const idx = $(e.currentTarget).data("index");
      new FilePicker({
        type: "image",
        current: "",
        callback: path => {
          html.find(`input[name="imagePath-${idx}"]`).val(path);
          html.find(`input[name="imagePath-${idx}"]`).trigger('change');
        }
      }).render(true);
    });
    
    html.find("#open-overlay-from-config").click(e => {
      e.preventDefault();
      openOverlayWindow();
    });
    
    html.on("change", "input[name^='fontStroke-']", (event) => {
      const idx = event.currentTarget.name.split("-")[1];
      const isChecked = event.currentTarget.checked;
      const optionsDiv = html.find(`.stroke-options-${idx}`);
      
      if (isChecked) {
        optionsDiv.slideDown(200);
      } else {
        optionsDiv.slideUp(200);
      }
    });
  
    html.find('select[name^="dataPath-"]').change(function() {
      const index = this.name.split('-')[1];
      const customPathInput = html.find(`.custom-path-input[data-index="${index}"]`);
      const systemExamplesContainer = customPathInput.find('.system-examples-container');
      
      if (this.value === 'custom') {
        customPathInput.slideDown(200);
        systemExamplesContainer.slideDown(200);
        
        populateSystemExamplesForField(html, index);
        
        setTimeout(() => {
          customPathInput.find('input').focus();
        }, 210);
      } else {
        customPathInput.slideUp(200);
        systemExamplesContainer.slideUp(200);
      }
    });
    
    html.find('select[name^="dataPath-"]').each(function() {
      const index = this.name.split('-')[1];
      const customPathInput = html.find(`.custom-path-input[data-index="${index}"]`);
      
      if (this.value === 'custom') {
        customPathInput.show();
        
        populateSystemExamplesForField(html, index);
      } else {
        customPathInput.hide();
      }
    });
    
    
    html.find(".debug-actor-data").click(this._onDebugActorData.bind(this));
    
    setTimeout(() => {
      const hasCustomPath = html.find('select[name^="dataPath-"]').filter(function() {
        return $(this).val() === 'custom';
      }).length > 0;
  
      if (!hasCustomPath) {
        html.find('.system-examples-container').hide();
      }
    }, 100);
  }
  

  
  _onDebugActorData(event) {
    event.preventDefault();
    
    const row = $(event.currentTarget).closest('tr');
    
    const rowIndex = row.find('input[name^="type-"]').attr('name')?.split('-')[1];
    
    const actorSelect = row.find(`select[name="actorId-${rowIndex}"]`);
    const actorId = actorSelect.val();
    
    if (!actorId) {
      ui.notifications.warn("Please select an actor first.");
      return;
    }
    
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error("Unable to find the selected actor.");
      return;
    }
    
    const dataDisplay = this._formatActorData(actor);
    
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
  }
  
  _formatActorData(actor, prefix = "", indent = 0) {
    const indentStr = "  ".repeat(indent);
    let result = "";
    
    // Get a simplified version of the actor data for display
    const data = {
      name: actor.name,
      system: actor.system
    };
    
    // Format object recursively
    const formatObject = (obj, path = "", level = 0) => {
      const padding = "  ".repeat(level);
      let output = "";
      
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (typeof value === "object" && value !== null) {
          // Don't go too deep
          if (level < 5) {
            output += `${padding}${key}: {\n`;
            output += formatObject(value, fullPath, level + 1);
            output += `${padding}}\n`;
          } else {
            output += `${padding}${key}: { ... }\n`;
          }
        } else {
          // For primitive values, show the path and value
          output += `${padding}${key}: <span style="color:#4a6;">${value}</span> <span style="color:#999;">(Path: ${fullPath})</span>\n`;
        }
      }
      
      return output;
    };
    
    result = formatObject(data);
    return result;
  }

  _onManageAnimations(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = OverlayData.getLayouts();
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const item = layouts[activeLayout][index];
    
    if (!item.animations) {
      item.animations = [];
    }
    
    const manager = new AnimationManager(item, index, this);
    manager.render(true);
    
    console.log("Opening Animation Manager for item", item);
  }

  async _onFieldChange(event) {
    const form = $(event.currentTarget).closest('form');
    const formData = new FormDataExtended(form[0]).object;
    
    await this._updateObject(event, formData);
    
    this._updateAllWindows();
    
    this._showAutoSaveFeedback();
  }
  
  _updateAllWindows() {
    // Update all overlay windows
    const windows = game.settings.get(MODULE_ID, "overlayWindows") || {};
    
    if (window.overlayWindow && !window.overlayWindow.closed) {
      updateOverlayWindow("main");
    }
    
    if (window.overlayWindows) {
      for (const [windowId, windowConfig] of Object.entries(windows)) {
        if (window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
          updateOverlayWindow(windowId);
        }
      }
    }
  }
  
  _showAutoSaveFeedback() {
    $('.auto-save-feedback').remove();
    
    const flashFeedback = $(`<div class="auto-save-feedback">Auto-saved</div>`);
    $('body').append(flashFeedback);
    
    window.setTimeout(() => {
      flashFeedback.css('opacity', 1);
      window.setTimeout(() => {
        flashFeedback.css('opacity', 0);
        window.setTimeout(() => flashFeedback.remove(), 300);
      }, 1000);
    }, 10);
  }

  async _onAddRow(event) {
    event.preventDefault();
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const current = OverlayData.getLayout(activeLayout) || [];
    const newItem = {
      type: "data",
      actorId: "",
      dataPath: "name",
      customPath: "",  // Add customPath to the default item
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
      addLabel: false,
      order: 0,
      animation: "none",
      animationDelay: 0,
      animationDuration: 1.5,
      entranceAnimation: "none",
      entranceDuration: 0.5,
      entranceDelay: 0,
      animations: [] 
    };
  
    for (let i = 0; i < current.length; i++) {
      current[i].order = current[i].order + 1;
    }
  
    current.unshift(newItem);
  
    layouts[activeLayout] = current;
    await OverlayData.setLayout(layoutName, items);
    
    // Update all open windows
    this._updateAllWindows();
    
    this.render();
  }

  async _onAddImage(event) {
    event.preventDefault();
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const current = layouts[activeLayout] || [];
  
    const newItem = {
      type: "image",
      imagePath: "",
      imageSize: 100,
      top: 0,
      left: 0,
      hide: false,
      order: 0,
      animation: "none",
      animationDelay: 0,
      animationDuration: 1.5,
      entranceAnimation: "none",
      entranceDuration: 0.5,
      entranceDelay: 0,
      animations: [] 
    };
  
    for (let i = 0; i < current.length; i++) {
      current[i].order = current[i].order + 1;
    }
    
    current.unshift(newItem);
    
    layouts[activeLayout] = current;
    await OverlayData.setLayout(layoutName, items);
    
    // Update all open windows
    this._updateAllWindows();
    
    this.render();
  }

  async _onAddStatic(event) {
    event.preventDefault();
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const current = layouts[activeLayout] || [];
    const newItem = {
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
      fontStrokeWidth: 1,
      order: 0, 
      animation: "none",
      animationDelay: 0,
      animationDuration: 1.5,
      entranceAnimation: "none",
      entranceDuration: 0.5,
      entranceDelay: 0,
      animations: [] 
    };
    
    for (let i = 0; i < current.length; i++) {
      current[i].order = current[i].order + 1;
    }
  
    current.unshift(newItem);
    
    layouts[activeLayout] = current;
    await OverlayData.setLayout(layoutName, items);
    
    // Update all open windows
    this._updateAllWindows();
    
    this.render();
  }

  async _onRemoveRow(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const current = layouts[activeLayout] || [];
    current.splice(index, 1);
    layouts[activeLayout] = current;
    await OverlayData.setLayout(layoutName, items);
    
    // Update all open windows
    this._updateAllWindows();
    
    this.render();
  }

  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const current = layouts[activeLayout] || [];
    if (index > 0) {
      [current[index - 1], current[index]] = [current[index], current[index - 1]];
      layouts[activeLayout] = current;
      await OverlayData.setLayout(layoutName, items);
      
      // Update all open windows
      this._updateAllWindows();
      
      this.render();
    }
  }

  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const current = layouts[activeLayout] || [];
    if (index < current.length - 1) {
      [current[index], current[index + 1]] = [current[index + 1], current[index]];
      layouts[activeLayout] = current;
      await OverlayData.setLayout(layoutName, items);
      
      // Update all open windows
      this._updateAllWindows();
      
      this.render();
    }
  }

  async _updateObject(event, formData) {
    const isPremium = OverlayData.getSetting("isPremium") || false;
  
    if (!isPremium) {
      for (let key in formData) {
        if (key.startsWith("animation-") || key.startsWith("entranceAnimation-")) {
          formData[key] = "none";
        }
      }
    }
  
    const newItems = [];
    for (let [key, val] of Object.entries(formData)) {
      const parts = key.split("-");
      if (parts.length < 2) continue;
      
      const field = parts[0];
      const idx = parts[1];
      const rowIndex = Number(idx);
      
      if (!newItems[rowIndex]) {
        newItems[rowIndex] = {
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
          addLabel: false,
          imagePath: "",
          imageSize: 100,
          order: 0,
          animation: "none",
          animationDelay: 0,
          animationDuration: 1.5,
          entranceAnimation: "none",
          entranceDuration: 0.5,
          entranceDelay: 0,
          animations: [] 
        };
      }
      
      switch (field) {
        case "type": newItems[rowIndex].type = val; break;
        case "actorId": newItems[rowIndex].actorId = val; break;
        case "dataPath": 
          newItems[rowIndex].dataPath = val; 
          break;
        case "customPath": 
          newItems[rowIndex].customPath = val; 
          break;
        case "content": newItems[rowIndex].content = val; break;
        case "top": newItems[rowIndex].top = Number(val) || 0; break;
        case "left": newItems[rowIndex].left = Number(val) || 0; break;
        case "hide": newItems[rowIndex].hide = Boolean(val); break;
        case "fontSize": newItems[rowIndex].fontSize = Number(val) || 16; break;
        case "bold": newItems[rowIndex].bold = Boolean(val); break;
        case "fontFamily": newItems[rowIndex].fontFamily = val; break;
        case "fontColor": newItems[rowIndex].fontColor = val; break;
        case "fontStroke": newItems[rowIndex].fontStroke = Boolean(val); break;
        case "fontStrokeColor": newItems[rowIndex].fontStrokeColor = val; break;
        case "fontStrokeWidth": newItems[rowIndex].fontStrokeWidth = Number(val) || 1; break;
        case "addLabel": newItems[rowIndex].addLabel = Boolean(val); break;
        case "imagePath": newItems[rowIndex].imagePath = val; break;
        case "imageSize": newItems[rowIndex].imageSize = Number(val) || 100; break;
        case "order": newItems[rowIndex].order = Number(val) || 0; break;
        case "animation":
          newItems[rowIndex].animation = isPremium ? val : "none"; 
          break;
        case "animationDelay": newItems[rowIndex].animationDelay = Number(val) || 0; break;
        case "animationDuration": newItems[rowIndex].animationDuration = Number(val) || 1.5; break;
        case "entranceAnimation":
          newItems[rowIndex].entranceAnimation = isPremium ? val : "none"; 
          break;
        case "entranceDuration": newItems[rowIndex].entranceDuration = Number(val) || 0.5; break;
        case "entranceDelay": newItems[rowIndex].entranceDelay = Number(val) || 0; break;
        default: break;
      }
    }
    
    newItems.forEach(item => {
      if (item.dataPath === 'custom' && item.customPath) {
        item.customPath = item.customPath.trim();
        
        item.customPath = item.customPath.replace(/^["']|["']$/g, '');
      } else {
        item.customPath = '';
      }
    });
    
    const layouts = OverlayData.getLayouts();
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const currentItems = layouts[activeLayout] || [];
    
    newItems.forEach((item, index) => {
      if (currentItems[index] && currentItems[index].animations) {
        item.animations = currentItems[index].animations;
      }
    });
    
    // Add custom data debugging attributes to help users
    newItems.forEach(item => {
      if (item.type === 'data' && item.dataPath === 'custom') {
        item._lastUpdated = Date.now();
      }
    });
    
    layouts[activeLayout] = newItems;
    await OverlayData.setLayout(layoutName, items);
  }
}


class OverlayWindowOpener extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Open Overlay Window",
      id: "foundrystreamoverlay-open-overlay",
      template: `modules/${MODULE_ID}/templates/open-overlay-window.html`,
      width: 400
    });
  }

  getData(options) {
    return {};
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[name='open-overlay']").click(this._openOverlay.bind(this));
  }

  _openOverlay(event) {
    event.preventDefault();
    openOverlayWindow();
  }

  async _updateObject(event, formData) {

  }
}



function openOverlayWindow(windowId = "main") {
  window.overlayWindows = window.overlayWindows || {};

  if (window.overlayWindows && window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
    window.overlayWindows[windowId].close();
  }

  const windows = OverlayData.getOverlayWindows();
  const windowConfig = windows[windowId] || windows.main;
  
  // Get configured size or use defaults
  const width = windowConfig.width || 800;
  const height = windowConfig.height || 600;
  
  const overlayWindow = window.open(
    "",
    `FoundryStreamOverlay_${windowId}`,
    `width=${width},height=${height},resizable=yes`
  );
  
  if (!overlayWindow) {
    ui.notifications.warn("Popup blocked! Please allow popups for Foundry.");
    return;
  }
  
  
  const bg = game.settings.get(MODULE_ID, "backgroundColour");
  
  overlayWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Foundry Stream Overlay</title>
  <link rel="stylesheet" href="modules/${MODULE_ID}/foundrystreamoverlay.css">
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: ${bg};
    }
    
    #overlay-container {
      position: relative;
      width: 100vw;
      height: 100vh;
    }
    
    .overlay-item {
      position: absolute;
      background-color: transparent;
      color: inherit;
      padding: 4px 8px;
      border-radius: 4px;
      margin: 0;
      cursor: default;
      user-select: none;
    }
    
    /* Text stroke fallback for browsers that don't support paint-order */
    @supports not (paint-order: stroke) {
      .overlay-item.text-stroked {
        text-shadow: 
          -1px -1px 0 var(--stroke-color),  
           1px -1px 0 var(--stroke-color),
          -1px  1px 0 var(--stroke-color),
           1px  1px 0 var(--stroke-color);
      }
    }
  </style>
</head>
<body>
  <div id="overlay-container" data-window-id="${windowId}"></div>
</body>
</html>`);
  
  overlayWindow.document.close();
  
  window.overlayWindows[windowId] = overlayWindow;
  
  if (windowId === "main") {
    window.overlayWindow = overlayWindow;
  }
  
  updateOverlayWindow(windowId);
}



function populateSystemExamplesForField(html, index) {
  const gameSystem = game.system.id;
  const examplesContainer = html.find(`.system-examples-container[data-index="${index}"]`);
  
  if (!examplesContainer.length) return;
  
  let examples = [];
  
  // Add system-specific examples based on game system
  switch (gameSystem) {
    case "dnd5e":
      examples = [
        { label: "Current HP", path: "system.attributes.hp.value" },
        { label: "Max HP", path: "system.attributes.hp.max" },
        { label: "Spell Slots (Level 1)", path: "system.spells.spell1.value" },
        { label: "Spell Slots (Level 2)", path: "system.spells.spell2.value" },
        { label: "Class Levels", path: "system.details.level" },
        { label: "XP", path: "system.details.xp.value" },
        { label: "Proficiency Bonus", path: "system.attributes.prof" }
      ];
      break;
    case "pf2e":
      examples = [
        { label: "Hero Points", path: "system.resources.heroPoints.value" },
        { label: "Focus Points", path: "system.resources.focus.value" },
        { label: "Speed", path: "system.attributes.speed.value" },
        { label: "Stamina Points", path: "system.attributes.sp.value" },
        { label: "Resolve Points", path: "system.attributes.rp.value" }
      ];
      break;
    case "wfrp4e":
      examples = [
        { label: "Wounds", path: "system.status.wounds.value" },
        { label: "Fate", path: "system.status.fate.value" },
        { label: "Fortune", path: "system.status.fortune.value" },
        { label: "Advantage", path: "system.status.advantage.value" }
      ];
      break;
    case "tormenta20":
      examples = [
        { label: "Pontos de Mana", path: "system.attributes.mana.value" },
        { label: "Exp", path: "system.attributes.exp.value" }
      ];
      break;
    default:
      // Generic examples for all systems
      examples = [
        { label: "Name", path: "name" },
        { label: "Current HP", path: "system.attributes.hp.value" },
        { label: "Look for 'system.attributes', 'system.resources', etc.", path: "" }
      ];
  }
  
  // Only show if we have examples
  if (examples.length) {
    let html = `<div class="data-path-examples">
                  <h4>Common Data Paths for ${game.system.title || gameSystem}:</h4>
                  <ul>`;
    
    examples.forEach(example => {
      if (example.path) {
        html += `<li><strong>${example.label}:</strong> <code>${example.path}</code></li>`;
      } else {
        html += `<li>${example.label}</li>`;
      }
    });
    
    html += `</ul>
            <p><em>Tip: To explore an actor's data structure, right-click on the token and select "Export Data" to view all available paths.</em></p>
            </div>`;
    
    examplesContainer.html(html);
  }
}


function updateOverlayWindow(windowId = "main") {
  window.overlayAnimatedElements = window.overlayAnimatedElements || {};
  
  const overlayWindow = window.overlayWindows?.[windowId];
  if (!overlayWindow || overlayWindow.closed) {
    return;
  }
  
  const windows = game.settings.get(MODULE_ID, "overlayWindows");
  const windowConfig = windows[windowId] || windows.main;
  
  const bg = game.settings.get(MODULE_ID, "backgroundColour");
  const layouts = OverlayData.getLayouts();
  const isPremium = OverlayData.getSetting("isPremium") || false;
  
  // Ensure free users always use the Default layout
  let activeLayout = windowConfig.activeLayout || "Default";
  if (!isPremium) {
    activeLayout = "Default";
  }
  
  overlayWindow.document.body.style.backgroundColor = bg;
  
  const container = overlayWindow.document.getElementById("overlay-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  const items = (layouts[activeLayout] || []).map(item => {
    let animation = isPremium ? (item.animation || "none") : "none";
    let entranceAnimation = isPremium ? (item.entranceAnimation || "none") : "none";
    
    const animationDelay = (item.animationDelay !== undefined) ? item.animationDelay : 0;
    const animationDuration = item.animationDuration || 1.5;
    const entranceDuration = item.entranceDuration || 0.5;
    const entranceDelay = item.entranceDelay || 0;
    
    const animations = isPremium ? (item.animations || []) : [];
    
    if (item.type === "image") {
      return {
        type: "image",
        imagePath: item.imagePath || "",
        imageSize: item.imageSize || 100,
        top: item.top ?? 0,
        left: item.left ?? 0,
        hide: item.hide ?? false,
        order: item.order || 0,
        animation,
        animationDelay,
        animationDuration,
        entranceAnimation,
        entranceDuration,
        entranceDelay,
        animations,
        actorId: item.actorId || null
      };
    } else if (item.type === "static") {
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
        order: item.order || 0,
        animation,
        animationDelay,
        animationDuration,
        entranceAnimation,
        entranceDuration,
        entranceDelay,
        animations,
        actorId: item.actorId || null
      };
    } else {
      const actor = game.actors.get(item.actorId);
      if (!actor) return null;
      if (item.hide) return null;
      
      let textValue;
      
      try {
        // Special case handling for common data paths
        if (item.dataPath === "name") {
          textValue = actor.name;
        } else if (item.dataPath === "hp") {
          const currentHP = foundry.utils.getProperty(actor, 'system.attributes.hp.value');
          const maxHP = foundry.utils.getProperty(actor, 'system.attributes.hp.max');
          textValue = `${currentHP} / ${maxHP}`;
        } else if (item.dataPath === "system.details.class") {
          // Complex class logic
          const classItems = actor.items?.filter(item => item.type === "class");
        
          if (classItems && classItems.length > 0) {
            if (classItems.length === 1) {
              textValue = classItems[0].name;
            } else {
              textValue = classItems.map(item => {
                const level = foundry.utils.getProperty(item, 'system.levels') || "";
                return `${item.name} ${level}`.trim();
              }).join('/');
            }
          } else {
            const classesVal = foundry.utils.getProperty(actor, 'system.classes');
            const detailClassesVal = foundry.utils.getProperty(actor, 'system.details.classes');
            const classVal = foundry.utils.getProperty(actor, 'system.details.class');
            const classNameVal = foundry.utils.getProperty(actor, 'system.details.className');
            
            if (classesVal && typeof classesVal === 'object') {
              const classEntries = Object.entries(classesVal);
              
              if (classEntries.length > 0) {
                if (classEntries.length === 1) {
                  textValue = classEntries[0][0];
                } else {
                  textValue = classEntries.map(([className, classData]) => {
                    const level = classData.levels || "";
                    return `${className} ${level}`.trim();
                  }).join('/');
                }
              } else {
                textValue = 'N/A';
              }
            } 
            else if (detailClassesVal && typeof detailClassesVal === 'object') {
              const classEntries = Object.entries(detailClassesVal);
              
              if (classEntries.length > 0) {
                if (classEntries.length === 1) {
                  textValue = classEntries[0][0];
                } else {
                  textValue = classEntries.map(([className, classData]) => {
                    const level = classData.levels || "";
                    return `${className} ${level}`.trim();
                  }).join('/');
                }
              } else {
                textValue = 'N/A';
              }
            } 
            else if (classVal) {
              textValue = classVal;
            } else if (classNameVal) {
              textValue = classNameVal;
            } else {
              textValue = 'N/A';
            }
          }
        } else if (item.dataPath === "system.details.race") {
          textValue = foundry.utils.getProperty(actor, 'system.details.race') || 
                     foundry.utils.getProperty(actor, 'system.race') || 'N/A';
        } else if (item.dataPath === "custom" && item.customPath) {
          // Handle custom data path
          const path = item.customPath.trim();
          try {
            // Better error handling for custom paths
            if (path) {
              console.log(`Getting custom path: ${path} for actor: ${actor.id}`);
              textValue = foundry.utils.getProperty(actor, path);
              console.log(`Retrieved value: ${textValue}`);
              
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
              console.warn(`Empty custom path for actor: ${actor.id}`);
              textValue = 'N/A (Empty Path)';
            }
          } catch (error) {
            console.error(`Error getting data for custom path "${path}":`, error);
            textValue = `Error: ${error.message}`;
          }
          
          // Ensure undefined or null values become 'N/A'
          if (textValue === null || textValue === undefined) {
            textValue = 'N/A';
          }
        
        } else {
          // Standard data path handling
          textValue = foundry.utils.getProperty(actor, item.dataPath);
        }
      } catch (error) {
        console.error(`Error getting data for ${item.dataPath || item.customPath}:`, error);
        textValue = 'Error';
      }
      
      // Add label if configured
      if (item.addLabel) {
        const labelMap = {
          "name": "Name",
          "system.attributes.hp.value": "HP",
          "system.attributes.hp.max": "Max HP",
          "hp": "HP",
          "system.attributes.ac.value": "AC",
          "system.details.level": "Level",
          "system.details.class": "Class",
          "system.details.race": "Race",
          "system.abilities.str.value": "STR",
          "system.abilities.dex.value": "DEX",
          "system.abilities.con.value": "CON",
          "system.abilities.int.value": "INT",
          "system.abilities.wis.value": "WIS",
          "system.abilities.cha.value": "CHA",
          "custom": item.customPath || "Custom"
        };
      
        const label = labelMap[item.dataPath] || '';
        textValue = label ? `${label}: ${textValue}` : textValue;
      }
      
      // Final check for null values
      if (textValue === null || textValue === undefined) textValue = "N/A";
      
      // Convert to string if necessary
      if (typeof textValue !== 'string') {
        textValue = String(textValue);
      }

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
        fontStrokeWidth: item.fontStrokeWidth || 1,
        order: item.order || 0,
        animation,
        animationDelay,
        animationDuration,
        entranceAnimation,
        entranceDuration,
        entranceDelay,
        animations
      };
    }
  }).filter(Boolean);
  
  items.sort((a, b) => a.order - b.order);
  const max = items.length;
  items.forEach((item, index) => {
    item.renderOrder = max - index;
  });
  
  for (const item of items) {
    let element;
    
    if (item.type === "image") {
      const img = overlayWindow.document.createElement("img");
      
      img.className = "overlay-item";
      img.src = item.imagePath;
      
      img.style.cssText = `
        position: absolute;
        top: ${item.top}px;
        left: ${item.left}px;
        width: ${item.imageSize}px;
        z-index: ${item.renderOrder};
      `;
      
      element = img;
      
      if (isPremium && item.animations && item.animations.length > 0) {
        renderItemWithAnimations(item, img, overlayWindow);
      } 
      else if (isPremium) {
        const hasEntrance = item.entranceAnimation !== "none";
        const hasContinuous = item.animation !== "none";
        
        if (hasEntrance) {
          img.classList.add(item.entranceAnimation);
          img.style.animationDelay = `${item.entranceDelay}s`;
          img.style.animationDuration = `${item.entranceDuration}s`;
          
          if (hasContinuous) {
            img.addEventListener('animationend', () => {
              img.className = "overlay-item";
              
              void img.offsetWidth;
              
              const imgAnimation = overlayWindow.document.querySelector(`.img-${item.animation}`) ? 
                               `img-${item.animation}` : item.animation;
              
              img.className = `overlay-item ${item.animation}`;
              
              img.style.animationDelay = `${item.animationDelay}s`;
              img.style.animationDuration = `${item.animationDuration}s`;
            }, {once: true});
          }
        } else if (hasContinuous) {
          img.classList.add(item.animation);
          img.style.animationDelay = `${item.animationDelay}s`;
          img.style.animationDuration = `${item.animationDuration}s`;
        }
      }
      
      container.appendChild(img);
    } else {
      const div = overlayWindow.document.createElement("div");
      
      div.className = "overlay-item";
      
      if (item.fontStroke) {
        div.classList.add('text-stroked');
        div.style.setProperty('--stroke-color', item.fontStrokeColor);
      }
      
      let styleText = `
        position: absolute;
        top: ${item.top}px;
        left: ${item.left}px;
        font-size: ${item.fontSize}px;
        font-family: ${item.fontFamily};
        color: ${item.fontColor};
        z-index: ${item.renderOrder};
        ${item.bold ? 'font-weight: bold;' : ''}
        text-align: center;
        min-width: 80px;
        transform-origin: center;
        transform: translateX(-50%);
      `;
      
      if (item.fontStroke) {
        styleText += `
          -webkit-text-stroke: ${item.fontStrokeWidth}px ${item.fontStrokeColor};
          text-stroke: ${item.fontStrokeWidth}px ${item.fontStrokeColor};
          paint-order: stroke fill;
        `;
      }
      
      div.style.cssText = styleText;
      div.textContent = item.type === "static" ? item.content : item.data;
      
      // Store data path for debugging purposes
      if (item.type === "data") {
        div.dataset.path = item.dataPath === "custom" ? item.customPath : item.dataPath;
      }
      
      element = div;
      
      if (isPremium && item.animations && item.animations.length > 0) {
        renderItemWithAnimations(item, div, overlayWindow);
      } 
      else if (isPremium) {
        const hasEntrance = item.entranceAnimation !== "none";
        const hasContinuous = item.animation !== "none";
        
        if (hasEntrance) {
          div.classList.add(item.entranceAnimation);
          div.style.animationDelay = `${item.entranceDelay}s`;
          div.style.animationDuration = `${item.entranceDuration}s`;
          
          if (hasContinuous) {
            div.addEventListener('animationend', () => {
              div.className = "overlay-item";
              if (item.fontStroke) {
                div.classList.add('text-stroked');
              }
              
              void div.offsetWidth;
              
              div.className = `overlay-item ${item.animation}`;
              if (item.fontStroke) {
                div.classList.add('text-stroked');
              }
              
              div.style.animationDelay = `${item.animationDelay}s`;
              div.style.animationDuration = `${item.animationDuration}s`;
            }, {once: true});
          }
        } else if (hasContinuous) {
          div.classList.add(item.animation);
          div.style.animationDelay = `${item.animationDelay}s`;
          div.style.animationDuration = `${item.animationDuration}s`;
        }
      }
      
      container.appendChild(div);
    }
    
    if (item.actorId) {
      if (!window.overlayAnimatedElements[item.actorId]) {
        window.overlayAnimatedElements[item.actorId] = [];
      }
      window.overlayAnimatedElements[item.actorId].push({
        element: element,
        item: item,
        windowId: windowId
      });
    }
  }
  
  if (!isPremium) {
    const promoFooter = overlayWindow.document.createElement("div");
    promoFooter.style.cssText = `
      position: absolute;
      bottom: 5px;
      right: 10px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      font-family: Arial, sans-serif;
      z-index: 9999;
    `;
    promoFooter.innerHTML = `Made by Jen. <a href="https://www.patreon.com/c/jenzelta" target="_blank" style="color:#FF424D;">Support on Patreon for premium features</a>`;
    container.appendChild(promoFooter);
  }
  
  if (windowId === "main" && window.overlayWindow) {
    window.overlayWindow.document.body.style.backgroundColor = bg;
  }
}

Hooks.on("updateActor", (actor, update, options, userId) => {
  if (foundry.utils.hasProperty(update, "system.attributes.hp")) {
    triggerAnimationsByEvent(actor.id, "hpChange", {
      oldValue: actor._source.system.attributes.hp.value,
      newValue: actor.system.attributes.hp.value
    });
  }
  
  updateOverlayWindow();
});


class ManageLayouts extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Manage Layouts",
      id: "foundrystreamoverlay-manage-layouts",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-layouts.html`,
      width: 600,
      height: "auto",
      closeOnSubmit: true
    });
  }

  async _onActivate(event) {
    event.preventDefault();
    
    const isPremium = OverlayData.getSetting("isPremium") || false;
    if (!isPremium) {
      ui.notifications.warn("Free users can only use the Default layout. Upgrade to Premium for multiple layouts.");
      return;
    }
    
    const layoutName = event.currentTarget.dataset.layout;
    await game.settings.set(MODULE_ID, "activeLayout", layoutName);
    ui.notifications.info(`Activated layout: ${layoutName}`);
    this.render();
  }

  getData() {
    const layouts = OverlayData.getLayouts();
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const isPremium = OverlayData.getSetting("isPremium") || false;
    
    if (!isPremium && activeLayout !== "Default") {
      game.settings.set(MODULE_ID, "activeLayout", "Default");
    }
    
    return { 
      layouts, 
      activeLayout: isPremium ? activeLayout : "Default", 
      isPremium
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".create-new-layout").click(this._onCreateNewLayout.bind(this));
    html.find(".rename-layout").click(this._onRename.bind(this));
    html.find(".duplicate-layout").click(this._onDuplicate.bind(this));
    html.find(".delete-layout").click(this._onDelete.bind(this));
    html.find(".export-layout").click(this._onExport.bind(this));
    html.find(".import-layout").click(this._onImport.bind(this));
  }

  async _onCreateNewLayout(event) {
    event.preventDefault();
    
    const isPremium = OverlayData.getSetting("isPremium");
    const layouts = game.settings.get(MODULE_ID, "layouts");
    const layoutCount = Object.keys(layouts).length;
    
    if (!isPremium && layoutCount > 0) {
      new Dialog({
        title: "Premium Feature",
        content: `
          <h3><i class="fas fa-gem" style="color:#FF424D;"></i> Premium Feature Required</h3>
          <p>Multiple layouts require premium activation.</p>
          <p>With premium, you can create unlimited layouts, use animations, and access the slideshow feature!</p>
        `,
        buttons: {
          upgrade: {
            icon: '<i class="fab fa-patreon"></i>',
            label: "Upgrade on Patreon",
            callback: () => window.open("https://www.patreon.com/c/jenzelta", "_blank")
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Close"
          }
        },
        default: "cancel",
        width: 400
      }).render(true);
      return;
    }
    
    const layoutName = prompt("Enter a new layout name:");
    if (!layoutName) return;
  
    const maxNameLength = 50; 
    if (layoutName.length > maxNameLength) {
      ui.notifications.error(`Layout name too long. Maximum length is ${maxNameLength} characters.`);
      return;
    }
    
    if (layouts[layoutName]) {
      ui.notifications.warn("That layout already exists.");
      return;
    }
    
    layouts[layoutName] = [];
    await OverlayData.setLayout(layoutName, items);
    ui.notifications.info(`Layout "${layoutName}" created.`);
    
    for (const app of Object.values(ui.windows)) {
      if (app instanceof OverlayConfig) {
        app.render();
      }
    }
    
    this.render();
  }


  async _onRename(event) {
    event.preventDefault();
    const oldName = event.currentTarget.dataset.layout;
    let newName = prompt("Enter a new name for this layout:", oldName);
    if (!newName || newName === oldName) return;
  
    const maxNameLength = 50;
    if (newName.length > maxNameLength) {
      ui.notifications.error(`Layout name too long. Maximum length is ${maxNameLength} characters.`);
      return;
    }
    const layouts = OverlayData.getLayouts();
    if (layouts[newName]) {
      ui.notifications.warn("A layout with that name already exists.");
      return;
    }
    layouts[newName] = layouts[oldName];
    delete layouts[oldName];
    const activeLayout = OverlayData.getActiveLayout();
    if (activeLayout === oldName) {
      await game.settings.set(MODULE_ID, "activeLayout", newName);
    }
    await OverlayData.setLayout(layoutName, items);
    
    // Refresh any open config windows
    for (const app of Object.values(ui.windows)) {
      if (app instanceof OverlayConfig) {
        app.render();
      }
    }
    
    this.render();
  }
  async _onDelete(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    
    if (layoutName === "Default") {
      ui.notifications.warn("Cannot delete the Default layout.");
      return;
    }
    
    try {
      // Check if layout exists
      const layout = OverlayData.getLayout(layoutName);
      if (!layout) {
        ui.notifications.warn(`Layout "${layoutName}" not found.`);
        return;
      }
      
      // Check for windows using this layout
      const windows = OverlayData.getOverlayWindows();
      const usedByWindows = Object.values(windows)
        .filter(w => w.activeLayout === layoutName)
        .map(w => w.name);
      
      if (usedByWindows.length > 0) {
        // This layout is used by windows - warn the user
        const windowNames = usedByWindows.join('", "');
        const confirmation = await Dialog.confirm({
          title: "Layout In Use",
          content: `This layout is currently used by the following windows: "${windowNames}". If you delete it, these windows will revert to the Default layout. Continue?`,
          yes: () => true,
          no: () => false
        });
        
        if (!confirmation) return;
        
        // Update windows in OverlayData first - modify the stored configurations
        for (const windowId of Object.keys(windows)) {
          if (windows[windowId].activeLayout === layoutName) {
            // Make a copy of the window config and update it
            const updatedConfig = { ...windows[windowId], activeLayout: "Default" };
            await OverlayData.setOverlayWindow(windowId, updatedConfig);
          }
        }
      }
      
      // Final confirmation prompt
      if (!await Dialog.confirm({
        title: "Delete Layout",
        content: `Are you sure you want to delete layout: ${layoutName}?`,
        yes: () => true,
        no: () => false
      })) return;
      
      // Delete layout using OverlayData
      await OverlayData.deleteLayout(layoutName);
      ui.notifications.info(`Layout "${layoutName}" deleted.`);
      
      // Refresh any open config windows
      for (const app of Object.values(ui.windows)) {
        if (app instanceof OverlayConfig) {
          app.render();
        }
      }
      
      this.render();
    } catch (error) {
      console.error("Failed to delete layout:", error);
      ui.notifications.error(`Failed to delete layout: ${error.message}`);
    }
  }

  async _onExport(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    const layouts = OverlayData.getLayouts();
    
    try {
      // Create a clean copy of the layout data to avoid reference issues
      const layoutData = JSON.parse(JSON.stringify(layouts[layoutName]));
      
      // Generate formatted JSON with proper spacing
      const data = JSON.stringify(layoutData, null, 2);
      
      // Create a dialog to show the JSON with copy button
      const dialog = new Dialog({
        title: `Export Layout: ${layoutName}`,
        content: `
          <div>
            <p>Copy this JSON to save your layout or click "Download" to save as a file:</p>
            <textarea id="export-json" rows="15" style="width:100%; font-family: monospace; white-space: pre; overflow-x: auto;">${data}</textarea>
          </div>
        `,
        buttons: {
          copy: {
            icon: '<i class="fas fa-copy"></i>',
            label: "Copy to Clipboard",
            callback: () => {
              const textarea = document.getElementById('export-json');
              textarea.select();
              document.execCommand('copy');
              ui.notifications.info("Layout JSON copied to clipboard");
            }
          },
          download: {
            icon: '<i class="fas fa-download"></i>',
            label: "Download JSON",
            callback: () => {
              const blob = new Blob([data], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${layoutName}-layout.json`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }
          },
          close: {
            icon: '<i class="fas fa-times"></i>',
            label: "Close"
          }
        },
        default: "copy",
        width: 600,
        height: 400
      });
      
      dialog.render(true);
    } catch (error) {
      console.error("Export error:", error);
      ui.notifications.error(`Failed to export layout: ${error.message}`);
    }
  }

  async _onImport(event) {
    event.preventDefault();
    const layoutName = prompt("Enter the name for the imported layout:");
    if (!layoutName) return;
    
    const dialog = new Dialog({
      title: "Import Layout JSON",
      content: `
        <form>
          <div class="form-group">
            <label>Paste the JSON for the layout:</label>
            <textarea id="import-json" rows="10" style="width:100%"></textarea>
          </div>
        </form>
      `,
      buttons: {
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: "Import",
          callback: async (html) => {
            try {
              const json = html.find("#import-json").val().trim();
              
              const normalizedJson = json
                .replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u0600-\u0604\u070F\u17B4\u17B5\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\uFFF0-\uFFFF]/g, "")
                .replace(/\\"/g, '"') 
                .replace(/\\\\/g, '\\'); 
              
              let importedLayout;
              try {
                importedLayout = JSON.parse(normalizedJson);
              } catch (parseError) {
                console.error("Parse error:", parseError);
                importedLayout = eval('(' + normalizedJson + ')');
              }
              
              if (!Array.isArray(importedLayout)) {
                throw new Error("Imported JSON is not a valid layout array");
              }
              
              const layouts = OverlayData.getLayouts();
              layouts[layoutName] = importedLayout;
              await OverlayData.setLayout(layoutName, items);
              ui.notifications.info(`Imported layout: ${layoutName}`);
              
              // Refresh any open config windows
              for (const app of Object.values(ui.windows)) {
                if (app instanceof OverlayConfig) {
                  app.render();
                }
              }
              
              this.render();
            } catch (e) {
              console.error("Import error:", e);
              ui.notifications.error(`Import failed: ${e.message}`);
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "import",
      width: 400
    });
    
    dialog.render(true);
  }

  async _onDuplicate(event) {
    event.preventDefault();
    
    // Check if the user has premium access
    const isPremium = OverlayData.getSetting("isPremium") || false;
    
    // If not premium, show premium required dialog and return
    if (!isPremium) {
      new Dialog({
        title: "Premium Feature",
        content: `
          <h3><i class="fas fa-gem" style="color:#FF424D;"></i> Premium Feature Required</h3>
          <p>Multiple layouts require premium activation.</p>
          <p>With premium, you can create unlimited layouts, use animations, and access the slideshow feature!</p>
        `,
        buttons: {
          upgrade: {
            icon: '<i class="fab fa-patreon"></i>',
            label: "Upgrade on Patreon",
            callback: () => window.open("https://www.patreon.com/c/jenzelta", "_blank")
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Close"
          }
        },
        default: "cancel",
        width: 400
      }).render(true);
      return;
    }
    
    const originalLayoutName = event.currentTarget.dataset.layout;
    
    try {
      const layouts = OverlayData.getLayouts();
      
      if (!layouts[originalLayoutName]) {
        ui.notifications.error(`Layout "${originalLayoutName}" not found.`);
        return;
      }
      
      // Rest of the existing duplicate function code...
      let baseName = originalLayoutName;
      let copyNumber = 1;
      let newLayoutName = `${baseName} (Copy)`;
      
      while (layouts[newLayoutName]) {
        copyNumber++;
        newLayoutName = `${baseName} (Copy ${copyNumber})`;
      }
      
      const customName = prompt("Enter a name for the duplicated layout:", newLayoutName);
      if (!customName) return; 
  
      const maxNameLength = 50;
      if (customName.length > maxNameLength) {
        ui.notifications.error(`Layout name too long. Maximum length is ${maxNameLength} characters.`);
        return;
      }
      
      if (layouts[customName]) {
        ui.notifications.warn("A layout with that name already exists.");
        return;
      }
      
      layouts[customName] = JSON.parse(JSON.stringify(layouts[originalLayoutName]));
      
      await OverlayData.setLayout(layoutName, items);
      ui.notifications.info(`Layout "${originalLayoutName}" duplicated as "${customName}".`);
      
      // Refresh any open config windows
      for (const app of Object.values(ui.windows)) {
        if (app instanceof OverlayConfig) {
          app.render();
        }
      }
      
      this.render();
    } catch (error) {
      console.error("Duplication error:", error);
      ui.notifications.error(`Failed to duplicate layout: ${error.message}`);
    }
  }
}



class SlideshowConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Slideshow Settings",
      id: "foundrystreamoverlay-slideshow",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-slideshow.html`,
      width: 600,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const slideshow = OverlayData.getSlideshow();
    const layouts = OverlayData.getLayouts();
    const availableLayouts = Object.keys(layouts);
    
    const windows = OverlayData.getOverlayWindows() || {
      "main": { id: "main", name: "Main Overlay" }
    };
    
    return {
      slideshowItems: slideshow.list,
      availableLayouts,
      windows,
      random: slideshow.random,
      transition: slideshow.transition,
      transitionDuration: slideshow.transitionDuration,
      targetWindow: slideshow.targetWindow || "main"
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".add-selected-item").click(this._onAddSelectedItem.bind(this));
    html.find(".remove-item").click(this._onRemoveItem.bind(this));
    html.find(".move-up").click(this._onMoveUp.bind(this));
    html.find(".move-down").click(this._onMoveDown.bind(this));
    html.find(".start-slideshow").click(this._onStartSlideshow.bind(this));
    html.find(".stop-slideshow").click(this._onStopSlideshow.bind(this));
  }

  async _onAddSelectedItem(event) {
    event.preventDefault();
    const selectedLayout = $(event.currentTarget).closest("form").find("#new-layout-dropdown").val();
    const slideshow = OverlayData.getSlideshow();
    
    slideshow.list.push({ layout: selectedLayout, duration: 10 });
    await OverlayData.setSlideshow(slideshow);
    this.render();
  }

  async _onRemoveItem(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const slideshow = OverlayData.getSlideshow();
    
    slideshow.list.splice(index, 1);
    await OverlayData.setSlideshow(slideshow);
    this.render();
  }

  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const slideshow = OverlayData.getSlideshow();
    
    if (index > 0) {
      // Swap items in the slideshow list
      [slideshow.list[index - 1], slideshow.list[index]] = 
      [slideshow.list[index], slideshow.list[index - 1]];
      
      await OverlayData.setSlideshow(slideshow);
      
      // Update all open windows
      this._updateAllWindows();
      
      this.render();
    }
  }
  
  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const slideshow = OverlayData.getSlideshow();
    
    if (index < slideshow.list.length - 1) {
      // Swap items in the slideshow list
      [slideshow.list[index], slideshow.list[index + 1]] = 
      [slideshow.list[index + 1], slideshow.list[index]];
      
      await OverlayData.setSlideshow(slideshow);
      
      // Update all open windows
      this._updateAllWindows();
      
      this.render();
    }
  }

  async _onStartSlideshow(event) {
    event.preventDefault();

    const isPremium = OverlayData.getSetting("isPremium") || false;
    if (!isPremium) {
      ui.notifications.warn("Slideshow feature requires premium activation. Please consider supporting on Patreon.");
      return;
    }
      
    const slideshow = OverlayData.getSlideshow();
    
    console.log("Starting slideshow with settings:", slideshow);
    
    if (slideshow.list.length === 0) {
      ui.notifications.warn("No layouts in slideshow.");
      return;
    }
    
    const windowId = slideshow.targetWindow || "main";
    const targetWindow = window.overlayWindows?.[windowId];
    
    if (!targetWindow || targetWindow.closed) {
      openOverlayWindow(windowId);
    }
    
    const checkWindowValidity = () => {
      const windowValid = window.overlayWindows 
        && window.overlayWindows[windowId] 
        && !window.overlayWindows[windowId].closed 
        && window.overlayWindows[windowId].document;
      
      const containerValid = windowValid && window.overlayWindows[windowId].document.getElementById('overlay-container');
      
      if (!windowValid || !containerValid) {
        console.error("Window validity check failed:", {
          windowExists: !!window.overlayWindows && !!window.overlayWindows[windowId],
          windowClosed: window.overlayWindows?.[windowId]?.closed,
          documentExists: windowValid,
          containerExists: containerValid
        });
      }
      
      return windowValid && containerValid;
    };
    
    const waitForWindow = (timeout = 5000) => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (checkWindowValidity()) {
            clearInterval(checkInterval);
            resolve();
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(new Error("Failed to initialize overlay window"));
          }
        }, 100);
      });
    };
    
    try {
      await waitForWindow();
      
      this._onStopSlideshow(null);
      
      window.foundryStreamSlideshowRunning = true;
      window.foundryStreamSlideshowIndex = 0;
      window.foundryStreamSlideshowWindow = windowId;
      
      const runSlide = async () => {
        console.log("Slideshow run started", {
          running: window.foundryStreamSlideshowRunning,
          windowId: window.foundryStreamSlideshowWindow,
          windowValid: checkWindowValidity()
        });
        
        if (!window.foundryStreamSlideshowRunning || !checkWindowValidity()) {
          console.log("Slideshow stopped due to invalid window or stopped state");
          this._onStopSlideshow(null);
          return;
        }
        
        const currentSlideshow = OverlayData.getSlideshow();
        
        if (currentSlideshow.list.length === 0) {
          console.log("No layouts in slideshow");
          this._onStopSlideshow(null);
          return;
        }
        
        let currentItem;
        let nextIndex;
        
        if (currentSlideshow.random) {
          nextIndex = Math.floor(Math.random() * currentSlideshow.list.length);
          currentItem = currentSlideshow.list[nextIndex];
        } else {
          nextIndex = window.foundryStreamSlideshowIndex;
          currentItem = currentSlideshow.list[nextIndex];
          window.foundryStreamSlideshowIndex = 
            (window.foundryStreamSlideshowIndex + 1) % currentSlideshow.list.length;
        }
        
        const overlayWindow = window.overlayWindows[windowId];
        const container = overlayWindow.document.getElementById("overlay-container");
        if (!container) {
          console.error("Overlay container not found!");
          this._onStopSlideshow(null);
          return;
        }
        
        const transition = currentSlideshow.transition || "none";
        const transitionDuration = currentSlideshow.transitionDuration || 0.5;
        
        try {
          const windows = OverlayData.getOverlayWindows();
          const windowConfig = windows[windowId] || windows.main;
          const currentLayoutName = windowConfig.activeLayout;
          const nextLayoutName = currentItem.layout;
          
          console.log(`Transitioning from ${currentLayoutName} to ${nextLayoutName} in window ${windowId}`);
          
          if (currentLayoutName !== nextLayoutName) {
            // Update the window config with the new layout
            const updatedConfig = { ...windowConfig, activeLayout: nextLayoutName };
            await OverlayData.setOverlayWindow(windowId, updatedConfig);
            
            updateOverlayWindow(windowId);
            
            const tempDiv = overlayWindow.document.createElement('div');
            tempDiv.innerHTML = container.innerHTML;
            
            // Temporarily set window back to previous layout
            const revertConfig = { ...windowConfig, activeLayout: currentLayoutName };
            await OverlayData.setOverlayWindow(windowId, revertConfig);
            
            updateOverlayWindow(windowId);
            
            if (transition !== "none" && LAYOUT_TRANSITIONS[transition]) {
              try {
                console.log(`Executing ${transition} transition`);
                await LAYOUT_TRANSITIONS[transition].execute(container, transitionDuration, tempDiv.innerHTML);
              } catch (transitionError) {
                console.error("Transition error:", transitionError);
                container.innerHTML = tempDiv.innerHTML;
              }
            }
            
            // Set window to the new layout after transition
            await OverlayData.setOverlayWindow(windowId, updatedConfig);
            updateOverlayWindow(windowId);
          }
          
          window.foundryStreamSlideshowTimeout = setTimeout(
            () => runSlide(), 
            currentItem.duration * 1000
          );
        } catch (error) {
          console.error("Slideshow iteration error:", error);
          this._onStopSlideshow(null);
        }
      };
      
      await runSlide();
      
      ui.notifications.info(`Slideshow started on ${windowId === "main" ? "Main Window" : "Window " + windowId}!`);
    } catch (initError) {
      console.error("Slideshow initialization error:", initError);
      ui.notifications.error(`Failed to start slideshow. Please open window ${windowId} first.`);
      this._onStopSlideshow(null);
    }
  }

  _onStopSlideshow(event) {
    if (event) event.preventDefault();
    
    if (window.foundryStreamSlideshowTimeout) {
      clearTimeout(window.foundryStreamSlideshowTimeout);
      window.foundryStreamSlideshowTimeout = null;
    }
    
    window.foundryStreamSlideshowRunning = false;
    window.foundryStreamSlideshowIndex = 0;
    window.foundryStreamSlideshowWindow = null;
    
    if (event) {
      ui.notifications.info("Slideshow stopped.");
    }
  }

  async _updateObject(event, formData) {
    event.preventDefault();
    
    console.log("Slideshow form data:", formData);
    
    const slideshowData = { 
      list: [], 
      random: false,
      transition: "none",
      transitionDuration: 0.5,
      targetWindow: formData.targetWindow || "main"
    };
    const temp = {};
    
    for (let [key, value] of Object.entries(formData)) {
      const [field, index] = key.split("-");
      if (index !== undefined) {
        if (!temp[index]) temp[index] = {};
        temp[index][field] = value;
      }
    }
    
    for (let key in temp) {
      if (temp[key].layout) {
        slideshowData.list.push({
          layout: temp[key].layout,
          duration: Number(temp[key].duration) || 10
        });
      }
    }
    
    slideshowData.random = formData.random === "on";
    slideshowData.transition = formData.transition || "none";
    slideshowData.transitionDuration = Number(formData.transitionDuration) || 0.5;
    
    console.log("Processed slideshow data:", slideshowData);
    
    // Only save once with OverlayData
    await OverlayData.setSlideshow(slideshowData);
    ui.notifications.info("Slideshow configuration saved.");
  }

  _updateAllWindows() {
    if (window.overlayWindow && !window.overlayWindow.closed) {
      updateOverlayWindow("main");
    }
    
    const windows = OverlayData.getOverlayWindows() || {};
    if (window.overlayWindows) {
      for (const [windowId, windowConfig] of Object.entries(windows)) {
        if (window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
          updateOverlayWindow(windowId);
        }
      }
    }
  }
}

class AnimationManager extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Animation Manager",
      id: "foundrystreamoverlay-animation-manager",
      template: `modules/${MODULE_ID}/templates/animation-manager.html`,
      width: 700,
      height: "auto",
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "continuous"}]
    });
  }
  

  _renderInner(data) {
    console.log("Animation Manager template data:", data);
    console.log("Actors available:", data.allActors?.length || 0);
    if (data.allActors?.length > 0) {
      console.log("First actor:", data.allActors[0]);
    } else {
      console.log("No actors found in data");
    }
    
    return super._renderInner(data);
  }


  constructor(item, itemIndex, parentConfig) {
    super();
    const isPremium = OverlayData.getSetting("isPremium") || false;
    
    if (!isPremium) {
      new Dialog({
        title: "Premium Feature",
        content: `
          <h3><i class="fas fa-gem" style="color:#FF424D;"></i> Premium Feature</h3>
          <p>The Animation Manager is a premium feature.</p>
          <p>Unlock animations, entrance effects, and more by supporting on Patreon!</p>
        `,
        buttons: {
          patreon: {
            icon: '<i class="fab fa-patreon"></i>',
            label: "Support on Patreon",
            callback: () => window.open("https://www.patreon.com/c/jenzelta", "_blank")
          },
          close: {
            icon: '<i class="fas fa-times"></i>',
            label: "Close"
          }
        },
        default: "close"
      }).render(true);
      
      return null;
    }
    
    this.item = item;
    this.itemIndex = itemIndex;
    this.parentConfig = parentConfig;
  }
  
  getData() {
    const allActors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
    
    return {
      item: this.item,
      allActors: allActors, 
      continuousAnimations: [
        {id: "none", name: "None"},
        {id: "hover", name: "Hover Up/Down"},
        {id: "glitch", name: "Glitch"},
        {id: "heartbeat", name: "Heartbeat"},
        {id: "rotate", name: "Rotate"},
        {id: "wiggle", name: "Wiggle"},
        {id: "pulse", name: "Pulse"},
        {id: "slide", name: "Slide"},
        {id: "flash", name: "Flash"},
        {id: "shake", name: "Shake"},
        {id: "shimmer", name: "Shimmer"},
        {id: "floatSway", name: "Float Sway"},
        {id: "textGlow", name: "Text Glow"},
        {id: "breathe", name: "Breathe"},
        {id: "colorShift", name: "Color Shift"},
        {id: "jitter", name: "Jitter"},
        {id: "emphasis", name: "Emphasis"},
        {id: "ripple", name: "Ripple"},
        {id: "blinkingCursor", name: "Blinking Cursor"},
        {id: "backdropPulse", name: "Backdrop Pulse"}
      ],
      entranceAnimations: [
        {id: "none", name: "None"},
        {id: "fadeIn", name: "Fade In"},
        {id: "slideInRight", name: "Slide In Right"},
        {id: "slideInLeft", name: "Slide In Left"},
        {id: "slideInUp", name: "Slide Up"},
        {id: "slideInDown", name: "Slide Down"},
        {id: "bounceIn", name: "Bounce In"},
        {id: "flipIn", name: "Flip In"},
        {id: "zoomIn", name: "Zoom In"},
        {id: "typewriter", name: "Typewriter"},
        {id: "dropIn", name: "Drop In"},
        {id: "splitReveal", name: "Split Reveal"},
        {id: "fadeOutIn", name: "Fade Out-In"}
      ],
      triggerAnimations: [
        {id: "none", name: "None"},
        {id: "hpDamage", name: "HP Damage"},
        {id: "hpHealing", name: "HP Healing"},
        {id: "criticalHit", name: "Critical Hit"},
        {id: "levelUp", name: "Level Up"},
        {id: "hover", name: "Hover Up/Down"},
        {id: "glitch", name: "Glitch"},
        {id: "heartbeat", name: "Heartbeat"},
        {id: "rotate", name: "Rotate"},
        {id: "wiggle", name: "Wiggle"},
        {id: "pulse", name: "Pulse"},
        {id: "shake", name: "Shake"},
        {id: "shimmer", name: "Shimmer"},
        {id: "flash", name: "Flash"}
      ],
      activeAnimations: this.item.animations || [],
      isPremium: OverlayData.getSetting("isPremium") || false
    };
  }
  
  activateListeners(html) {
    super.activateListeners(html);

    console.log("Animation Manager activating listeners");
    console.log("Actor dropdown:", html.find('#trigger-actor').length > 0 ? "found" : "not found");
  
    const options = html.find('#trigger-actor option');
    console.log("Actor dropdown options:", options.length);
    options.each(function() {
      console.log(`Option: ${$(this).text()} (${$(this).val()})`);
    });

    const actorDropdown = html.find('#trigger-actor');
    if (actorDropdown.length) {
      console.log("Populating actor dropdown");
      
      const actors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
      
      actors.forEach(actor => {
        actorDropdown.append(new Option(actor.name, actor.id));
      });
      
      console.log(`Added ${actors.length} actors to dropdown`);
    } else {
      console.error("Actor dropdown not found in template!");
    }
    
    html.find(".add-animation").click(this._onAddAnimation.bind(this));
    html.find(".remove-animation").click(this._onRemoveAnimation.bind(this));
    
    html.find("#set-entrance-animation").click(this._onSetEntranceAnimation.bind(this));
  
    html.find('.tabs .item').click(ev => {
      const tab = $(ev.currentTarget).data('tab');
      this._tabs[0].activate(tab);
    });
    
    html.find("#trigger-event").change(this._onTriggerEventChange.bind(this, html));
    html.find("#hp-comparison").change(this._onHPComparisonChange.bind(this, html));
    
    html.find("#trigger-stat").change(function() {
      if ($(this).val() === "custom") {
        html.find("#custom-stat-path").slideDown(200);
      } else {
        html.find("#custom-stat-path").slideUp(200);
      }
    });
  
    
    html.find(".add-animation").click(this._onAddAnimation.bind(this));
    html.find(".remove-animation").click(this._onRemoveAnimation.bind(this));
    
    html.find("#set-entrance-animation").click(this._onSetEntranceAnimation.bind(this));

    html.find('.tabs .item').click(ev => {
      const tab = $(ev.currentTarget).data('tab');
      this._tabs[0].activate(tab);
    });
    
    html.find("#trigger-event").change(this._onTriggerEventChange.bind(this, html));
    html.find("#hp-comparison").change(this._onHPComparisonChange.bind(this, html));
    
    html.find("#trigger-stat").change(function() {
      if ($(this).val() === "custom") {
        html.find("#custom-stat-path").slideDown(200);
      } else {
        html.find("#custom-stat-path").slideUp(200);
      }
    });
  }
  
  _onTriggerEventChange(html, event) {
    const eventType = $(event.currentTarget).val();
    
    html.find('.trigger-condition').hide();
    
    html.find(`.${eventType}-condition`).show();
  }
  
  _onHPComparisonChange(html, event) {
    const comparison = $(event.currentTarget).val();
    if (comparison === "threshold") {
      html.find('.threshold-value').slideDown(200);
    } else {
      html.find('.threshold-value').slideUp(200);
    }
  }

  async _onSetEntranceAnimation(event) {
    event.preventDefault();
    const form = $(event.currentTarget).closest('form');
    
    const animation = form.find("#entrance-animation-select").val();
    const duration = Number(form.find("#entrance-duration").val()) || 0.5;
    const delay = Number(form.find("#entrance-delay").val()) || 0;
    
    this.item.entranceAnimation = animation;
    this.item.entranceDuration = duration;
    this.item.entranceDelay = delay;
    
    await this._saveItemAnimations();
    
    ui.notifications.info("Entrance animation updated");
    
    this.render();
  }
  
  async _onAddAnimation(event) {
    event.preventDefault();
    
    const html = $(event.currentTarget).closest('form');
    
    const type = $(event.currentTarget).data('type');
    
    const animation = html.find(`#${type}-animation`).val();
    
    if (!animation || animation === "none") return;
    
    let triggerCondition = null;
    if (type === "trigger") {
      const eventType = html.find("#trigger-event").val();
      const targetActor = html.find("#trigger-actor").val() || null;  
      const targetStat = html.find("#trigger-stat").val();
      let dataPath = "";
      
      switch (targetStat) {
        case "hp":
          dataPath = "system.attributes.hp.value";
          break;
        case "ac":
          dataPath = "system.attributes.ac.value";
          break;
        case "level":
          dataPath = "system.details.level";
          break;
        case "custom":
          dataPath = html.find("#custom-data-path").val();
          break;
      }
      
      triggerCondition = {
        event: eventType,
        targetActor: targetActor,  
        dataPath: dataPath
      };
      
      if (eventType === "hpChange") {
        const comparison = html.find("#hp-comparison").val();
        triggerCondition.comparison = comparison;
        
        if (comparison === "threshold") {
          triggerCondition.threshold = Number(html.find("#hp-threshold").val()) || 0;
        }
      }
    }
    
    const newAnimation = {
      type: type,
      animation: animation,
      delay: 0,
      duration: Number(html.find(`#${type}-duration`).val()) || (type === "entrance" ? 0.5 : 1.5),
      triggerCondition: triggerCondition
    };
    
    const activeAnimations = this.item.animations || [];
    activeAnimations.push(newAnimation);
    
    this.item.animations = activeAnimations;
    
    await this._saveItemAnimations();
    
    this.render();
  }
  
  async _onRemoveAnimation(event) {
    event.preventDefault();
    const type = $(event.currentTarget).data('type');
    const index = Number($(event.currentTarget).data('index'));
    
    const typeAnimations = this.item.animations.filter(a => a.type === type);
    
    const animations = this.item.animations;
    let removeIndex = -1;
    let typeCount = 0;
    
    for (let i = 0; i < animations.length; i++) {
      if (animations[i].type === type) {
        if (typeCount === index) {
          removeIndex = i;
          break;
        }
        typeCount++;
      }
    }
    
    if (removeIndex >= 0) {
      this.item.animations.splice(removeIndex, 1);
      
      await this._saveItemAnimations();
      this.render();
    }
  }
  
  async _saveItemAnimations() {
    const layouts = OverlayData.getLayouts();
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    
    layouts[activeLayout][this.itemIndex].animations = this.item.animations;
    
    await OverlayData.setLayout(layoutName, items);
    
    if (this.parentConfig) {
      this.parentConfig.render();
    }
    
    if (window.overlayWindow && !window.overlayWindow.closed) {
      updateOverlayWindow();
    }
  }
  
  async _updateObject(event, formData) {
    for (const [key, value] of Object.entries(formData)) {
      const parts = key.split('.');
      if (parts.length === 3) {  
        const type = parts[0];
        const index = Number(parts[1]);
        const property = parts[2];
        
        const animations = this.item.animations || [];
        let targetIndex = -1;
        let typeCount = 0;
        
        for (let i = 0; i < animations.length; i++) {
          if (animations[i].type === type) {
            if (typeCount === index) {
              targetIndex = i;
              break;
            }
            typeCount++;
          }
        }
        
        if (targetIndex >= 0) {
          this.item.animations[targetIndex][property] = Number(value);
        }
      }
    }
    
    await this._saveItemAnimations();
  }
}

function renderItemWithAnimations(item, element) {
  const animations = item.animations || [];
  
  // Store reference to this element for the item's actorId
  if (item.actorId) {
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
    element.style.animationDelay = `${entranceAnim.delay}s`;
    element.style.animationDuration = `${entranceAnim.duration}s`;
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
}

function applyAllContinuousAnimations(animations, element) {
  if (!animations.length) return;
  
  console.log("Applying continuous animations:", animations);
  
  if (animations.length > 1) {
    element.setAttribute('data-animations', JSON.stringify(animations.map(a => a.animation)));
    
    if (element.tagName.toLowerCase() === 'img') {
      applyMultipleImageAnimations(animations, element);
    } else {
      applyMultipleTextAnimations(animations, element);
    }
  } else if (animations.length === 1) {
    const anim = animations[0];
    element.classList.add(anim.animation);
    element.style.animationDelay = `${anim.delay}s`;
    element.style.animationDuration = `${anim.duration}s`;
    element.style.animationIterationCount = "infinite";
  }
}

function applyMultipleTextAnimations(animations, element) {
  const styleId = `style-${Math.random().toString(36).substring(2, 9)}`;
  element.setAttribute('data-style-id', styleId);
  
  const styleEl = window.overlayWindow.document.createElement('style');
  styleEl.id = styleId;
  
  let transformProperties = [];
  
  if (animations.some(a => a.animation === 'hover')) {
    transformProperties.push('translateY(-5px)');
  }
  if (animations.some(a => a.animation === 'jitter')) {
    transformProperties.push('translate(1px, 1px)');
  }
  if (animations.some(a => a.animation === 'emphasis')) {
    transformProperties.push('scale(1.1)');
  }
  if (animations.some(a => a.animation === 'wiggle')) {
    transformProperties.push('rotate(3deg)');
  }
  
  styleEl.textContent = `
    @keyframes combined-${styleId} {
      0% { transform: translateX(-50%); }
      50% { transform: translateX(-50%) ${transformProperties.join(' ')}; }
      100% { transform: translateX(-50%); }
    }
    
    [data-style-id="${styleId}"] {
      animation: combined-${styleId} 2s infinite ease-in-out;
    }
  `;
  
  window.overlayWindow.document.head.appendChild(styleEl);
}

function applyMultipleImageAnimations(animations, element) {
  const styleId = `style-${Math.random().toString(36).substring(2, 9)}`;
  element.setAttribute('data-style-id', styleId);
  
  const styleEl = window.overlayWindow.document.createElement('style');
  styleEl.id = styleId;
  
  let transformProperties = [];
  
  if (animations.some(a => a.animation === 'hover')) {
    transformProperties.push('translateY(-5px)');
  }
  if (animations.some(a => a.animation === 'jitter')) {
    transformProperties.push('translate(1px, 1px)');
  }
  if (animations.some(a => a.animation === 'emphasis')) {
    transformProperties.push('scale(1.1)');
  }
  if (animations.some(a => a.animation === 'wiggle')) {
    transformProperties.push('rotate(3deg)');
  }
  
  styleEl.textContent = `
    @keyframes combined-${styleId} {
      0% { transform: translate(0, 0); }
      50% { transform: ${transformProperties.join(' ')}; }
      100% { transform: translate(0, 0); }
    }
    
    [data-style-id="${styleId}"] {
      animation: combined-${styleId} 2s infinite ease-in-out;
    }
  `;
  
  window.overlayWindow.document.head.appendChild(styleEl);
}


function triggerHPAnimation(actorId, animationType, oldValue, newValue) {
  if (!window.overlayWindow || window.overlayWindow.closed) return;
  
  const container = window.overlayWindow.document.getElementById("overlay-container");
  if (!container) return;
  
  const layouts = OverlayData.getLayouts();
  const activeLayout = OverlayData.getActiveLayout() || "Default";
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

function triggerAnimationsByEvent(actorId, eventType, context) {
  console.log("Attempting to trigger animations for event", eventType, "on actor", actorId, "context", context);
  
  // Use global event handling setting
  const enableTriggeredAnimations = game.settings.get(MODULE_ID, "enableTriggeredAnimations");
  if (!enableTriggeredAnimations) {
    console.log("Triggered animations are disabled in settings");
    return;
  }

  // Check if we have any animated elements at all
  if (!window.overlayAnimatedElements) {
    console.log("No animated elements found");
    return;
  }
  
  // Loop through all animated elements
  let animationsApplied = 0;
  
  // Process all items with animations
  // We need to check ALL elements, not just those for this actor
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
        console.log(`Found ${triggerAnims.length} matching trigger animations for actor ${actorId} on element:`, element);
      }
      
      // Apply matching animations
      triggerAnims.forEach(anim => {
        // Check if the trigger condition is met
        const meetsCondition = evaluateTriggerCondition(anim.triggerCondition, context);
        if (meetsCondition) {
          console.log("Condition met, applying animation", anim.animation);
          applyTriggeredAnimation(element, anim);
          animationsApplied++;
        } else {
          console.log("Condition not met for animation", anim.animation);
        }
      });
    });
  }
  
  console.log(`Applied ${animationsApplied} animations in total`);
  
  // Also trigger the HP-specific animation if this is an HP change (for backward compatibility)
  if (eventType === "hpChange") {
    const direction = context.newValue < context.oldValue ? "damage" : "healing";
    triggerHPAnimation(actorId, direction, context.oldValue, context.newValue);
  }
}





window.standardAnimations = [
  "hover", "glitch", "heartbeat", "rotate", "wiggle", "pulse", "slide",
  "flash", "shake", "shimmer", "floatSway", "textGlow", "breathe",
  "colorShift", "jitter", "emphasis", "ripple", "blinkingCursor", "backdropPulse"
];


Hooks.on("updateActor", (actor, update, options, userId) => {

  if (foundry.utils.hasProperty(update, "system.attributes.hp")) {
    const oldValue = actor._source.system.attributes.hp.value || 0;
    const newValue = actor.system.attributes.hp.value || 0;
    
    console.log(`HP changed for actor ${actor.id}: ${oldValue} → ${newValue}`);
    

    triggerAnimationsByEvent(actor.id, "hpChange", {
      oldValue: oldValue,
      newValue: newValue,
      dataPath: "system.attributes.hp.value"
    });
  }

  if (foundry.utils.hasProperty(update, "system.details.level")) {
    const oldValue = actor._source.system.details.level || 0;
    const newValue = actor.system.details.level || 0;
    
    console.log(`Level changed for actor ${actor.id}: ${oldValue} → ${newValue}`);
    
  
    triggerAnimationsByEvent(actor.id, "levelUp", {
      oldValue: oldValue,
      newValue: newValue,
      dataPath: "system.details.level"
    });
  }
  
 
  updateOverlayWindow();
});

function evaluateTriggerCondition(condition, context) {
  console.log("Evaluating trigger condition", condition, "with context", context);
  
  if (!condition) return false;
  
  switch(condition.event) {
    case "hpChange":
      if (condition.comparison === "decrease" && context.newValue < context.oldValue) return true;
      if (condition.comparison === "increase" && context.newValue > context.oldValue) return true;
      if (condition.comparison === "threshold" && context.newValue <= condition.threshold) return true;
      break;
    
    case "statChange":
   
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
function applyTriggeredAnimation(element, animation) {
  console.log("Applying triggered animation", animation, "to element", element);
  
 
  element.classList.remove("hp-damage", "hp-healing");
  
 
  const originalColor = element.style.color;
  const originalClasses = [...element.classList];
  
  
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
      if (window.standardAnimations && window.standardAnimations.includes(animation.animation)) {
        element.classList.add(animation.animation);
      }
      break;
  }
  
  void element.offsetWidth;
  
  
  const duration = animation.duration || 1.5;
  setTimeout(() => {

    element.classList = originalClasses.join(' ');
    element.style.color = originalColor;
    
    console.log("Animation complete, element restored");
  }, duration * 1000);
}

class OverlayWindowManager extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Manage Overlay Windows",
      id: "foundrystreamoverlay-window-manager",
      template: `modules/${MODULE_ID}/templates/window-manager.html`,
      width: 600,
      height: "auto",
      closeOnSubmit: false
    });
  }
  
  getData() {
    const windows = game.settings.get(MODULE_ID, "overlayWindows");
    return { windows };
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".create-new-window").click(this._onCreateWindow.bind(this));
    html.find(".open-window").click(this._onOpenWindow.bind(this));
    html.find(".configure-window").click(this._onConfigureWindow.bind(this));
    html.find(".remove-window").click(this._onRemoveWindow.bind(this));
  }
  
  async _onCreateWindow(event) {
    event.preventDefault();
    
    const isPremium = OverlayData.getSetting("isPremium") || false;
    const windows = game.settings.get(MODULE_ID, "overlayWindows");
    
    // Check if non-premium user is trying to create a second window
    if (!isPremium && Object.keys(windows).length >= 1) {
      new Dialog({
        title: "Premium Feature",
        content: `
          <h3><i class="fas fa-gem" style="color:#FF424D;"></i> Premium Feature Required</h3>
          <p>Multiple overlay windows require premium activation.</p>
          <p>With premium, you can create multiple windows, each with their own layouts or slideshows!</p>
        `,
        buttons: {
          upgrade: {
            icon: '<i class="fab fa-patreon"></i>',
            label: "Upgrade on Patreon",
            callback: () => window.open("https://www.patreon.com/c/jenzelta", "_blank")
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Close"
          }
        },
        default: "cancel",
        width: 400
      }).render(true);
      return;
    }
    
    const windowName = await Dialog.prompt({
      title: "New Overlay Window",
      content: `<p>Enter a name for the new overlay window:</p>
                <input type="text" name="windowName" value="New Overlay" data-dtype="String">`,
      callback: html => html.find('input[name="windowName"]').val()
    });
    
    if (!windowName) return;
    
    const windowId = Date.now().toString(36);
    
    windows[windowId] = {
      id: windowId,
      name: windowName,
      activeLayout: "Default",
      slideshowActive: false
    };
    
    await game.settings.set(MODULE_ID, "overlayWindows", windows);
    this.render();
  }
  
  async _onOpenWindow(event) {
    event.preventDefault();
    const windowId = event.currentTarget.dataset.window;
    openOverlayWindow(windowId);
  }
  
  async _onConfigureWindow(event) {
    event.preventDefault();
    const windowId = event.currentTarget.dataset.window;
    new OverlayWindowConfig(windowId).render(true);
  }
  
  async _onRemoveWindow(event) {
    event.preventDefault();
    const windowId = event.currentTarget.dataset.window;
    
    if (windowId === "main") {
      ui.notifications.warn("Cannot remove the main overlay window");
      return;
    }
    
    const confirmed = await Dialog.confirm({
      title: "Remove Overlay Window",
      content: "Are you sure you want to remove this overlay window?"
    });
    
    if (!confirmed) return;
    
    const windows = game.settings.get(MODULE_ID, "overlayWindows");
    delete windows[windowId];
    await game.settings.set(MODULE_ID, "overlayWindows", windows);
    
 
    if (window.overlayWindows && window.overlayWindows[windowId]) {
      window.overlayWindows[windowId].close();
      delete window.overlayWindows[windowId];
    }
    
    this.render();
  }
}

class OverlayWindowConfig extends FormApplication {
  constructor(windowId) {
    super();
    this.windowId = windowId;
  }
  
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Configure Overlay Window",
      id: "foundrystreamoverlay-window-config",
      template: `modules/${MODULE_ID}/templates/window-config.html`,
      width: 500,
      height: "auto",
      closeOnSubmit: false
    });
  }
  
  getData() {
    const windows = OverlayData.getOverlayWindows();
    const windowConfig = windows[this.windowId];
    const layouts = OverlayData.getLayouts();
    const slideshows = this._getSlideshowOptions();
    
    // Check if window is currently open
    const isWindowOpen = window.overlayWindows?.[this.windowId] && 
                         !window.overlayWindows[this.windowId].closed;
    
    return { 
      windowId: this.windowId,
      windowConfig, 
      layouts,
      slideshows,
      isPremium: OverlayData.getSetting("isPremium"),
      isWindowOpen
    };
  }
  
  _getSlideshowOptions() {
    return [
      { id: "none", name: "No Slideshow" },
      { id: "main", name: "Main Slideshow" }
    ];
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    html.find("input, select").on("change", this._onSettingChange.bind(this));
    html.find(".open-window").click(this._onOpenWindow.bind(this));
    html.find("#save-current-size").click(this._onSaveCurrentSize.bind(this));
  }
  
  async _onSettingChange(event) {
    const windows = OverlayData.getOverlayWindows();
    const windowConfig = windows[this.windowId];
    const field = event.currentTarget.name;
    
    // Parse numeric values appropriately
    let value;
    if (event.currentTarget.type === "checkbox") {
      value = event.currentTarget.checked;
    } else if (field === "width" || field === "height") {
      value = parseInt(event.currentTarget.value) || (field === "width" ? 800 : 600);
    } else {
      value = event.currentTarget.value;
    }
    
    // Create updated config
    const updatedConfig = { 
      ...windowConfig,
      [field]: value 
    };
    
    await OverlayData.setOverlayWindow(this.windowId, updatedConfig);
    
    if (window.overlayWindows && window.overlayWindows[this.windowId]) {
      updateOverlayWindow(this.windowId);
    }
  }
  
  async _onSaveCurrentSize(event) {
    event.preventDefault();
    
    // Check if the window is open
    if (!window.overlayWindows?.[this.windowId] || window.overlayWindows[this.windowId].closed) {
      ui.notifications.warn("Window must be open to capture its current size");
      return;
    }
    
    try {
      const currentWindow = window.overlayWindows[this.windowId];
      
      // Get the window's current dimensions
      const width = currentWindow.outerWidth;
      const height = currentWindow.outerHeight;
      
      if (!width || !height) {
        ui.notifications.warn("Could not determine window dimensions");
        return;
      }
      
      // Update the form inputs to reflect the current size
      const form = $(event.currentTarget).closest('form');
      form.find('input[name="width"]').val(width);
      form.find('input[name="height"]').val(height);
      
      // Save the new dimensions
      const windows = OverlayData.getOverlayWindows();
      const windowConfig = windows[this.windowId];
      
      const updatedConfig = {
        ...windowConfig,
        width,
        height
      };
      
      await OverlayData.setOverlayWindow(this.windowId, updatedConfig);
      ui.notifications.info(`Saved current window size: ${width}×${height}`);
    } catch (error) {
      console.error("Error saving window size:", error);
      ui.notifications.error("Failed to save window size");
    }
  }
  
  async _onOpenWindow(event) {
    event.preventDefault();
    openOverlayWindow(this.windowId);
  }
  
  async _updateObject(event, formData) {
    try {
      // Get current window config
      const windows = OverlayData.getOverlayWindows();
      const windowConfig = windows[this.windowId];
      
      // Create updated config with form data
      const updatedConfig = { 
        ...windowConfig
      };
      
      // Update properties from form data
      for (const [key, value] of Object.entries(formData)) {
        if (key === "width" || key === "height") {
          updatedConfig[key] = parseInt(value) || (key === "width" ? 800 : 600);
        } else if (typeof value === "string" && value.match(/^(true|false)$/i)) {
          updatedConfig[key] = value.toLowerCase() === "true";
        } else {
          updatedConfig[key] = value;
        }
      }
      
      // Save changes through OverlayData
      await OverlayData.setOverlayWindow(this.windowId, updatedConfig);
      
      ui.notifications.info(`Window configuration saved.`);
      
      // Apply size changes to the window if it's open
      if (window.overlayWindows?.[this.windowId] && !window.overlayWindows[this.windowId].closed) {
        if (formData.width && formData.height) {
          const width = parseInt(formData.width) || 800;
          const height = parseInt(formData.height) || 600;
          window.overlayWindows[this.windowId].resizeTo(width, height);
          ui.notifications.info(`Applied new size: ${width}×${height}`);
        }
      }
      
      // Update the window content if it's open
      updateOverlayWindow(this.windowId);
      
      return true;
    } catch (error) {
      console.error("Failed to save window configuration:", error);
      ui.notifications.error("Failed to save window configuration.");
      return false;
    }
  }
}