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
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
  
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
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
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
    `;
    document.head.appendChild(styleElem);
  }
  
  async _render(force, options) {
    await super._render(force, options);
    this._injectStyles();
  }

  getData() {
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const rows = (layouts[activeLayout] || []).map((item, idx) => {
      // Check if this item has animations configured
      const hasAnimations = !!(item.animations && item.animations.length > 0);
      
      return {
        idx,
        type: item.type || "data", 
        actorId: item.actorId || "",
        dataPath: item.dataPath || "name",
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
        hasAnimations // Add this flag for the template
      };
    });
    const dataPathChoices = POSSIBLE_DATA_PATHS;
    const allActors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
    return { rows, allActors, dataPathChoices, activeLayout, layouts };
  }


  
  activateListeners(html) {
    super.activateListeners(html);
    
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
    
    // Add auto-save functionality to all inputs, selects, and checkboxes
    html.find('input, select').on('change', this._onFieldChange.bind(this));
    
    if (!isPremium) {
      // Disable animations manager button
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
        // Hide extras
        $extrasColumns.find('.extras-content').slideUp(200);
        $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
      } else {
        // Show extras
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
    
    // Add this line to handle the animation manager button clicks
    html.find(".manage-animations").click(this._onManageAnimations.bind(this));
    
    html.find(".file-picker").off("click").click(e => {
      const idx = $(e.currentTarget).data("index");
      new FilePicker({
        type: "image",
        current: "",
        callback: path => {
          html.find(`input[name="imagePath-${idx}"]`).val(path);
          // Trigger auto-save after file selection
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
      
      if (this.value === 'custom') {
        customPathInput.slideDown(200);
      } else {
        customPathInput.slideUp(200);
      }
    });
  }

  // Add this method to handle opening the animation manager
  _onManageAnimations(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const item = layouts[activeLayout][index];
    
    // Initialize animations array if it doesn't exist
    if (!item.animations) {
      item.animations = [];
    }
    
    // Create and render the animation manager
    const manager = new AnimationManager(item, index, this);
    manager.render(true);
    
    console.log("Opening Animation Manager for item", item);
  }

  // New method to handle auto-saving on field changes
  async _onFieldChange(event) {
    // Get form data
    const form = $(event.currentTarget).closest('form');
    const formData = new FormDataExtended(form[0]).object;
    
    // Call _updateObject to save changes
    await this._updateObject(event, formData);
    
    // Update the overlay window if it's open
    if (window.overlayWindow && !window.overlayWindow.closed) {
      updateOverlayWindow();
    }
    
    // Show brief feedback
    this._showAutoSaveFeedback();
  }
  
  _showAutoSaveFeedback() {
    // Remove existing feedback if present
    $('.auto-save-feedback').remove();
    
    const flashFeedback = $(`<div class="auto-save-feedback">Auto-saved</div>`);
    $('body').append(flashFeedback);
    
    // Show and hide with animation
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
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const current = layouts[activeLayout] || [];
    const newItem = {
      type: "data",
      actorId: "",
      dataPath: "name",
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
      animations: [] // Initialize empty animations array
    };

    for (let i = 0; i < current.length; i++) {
      current[i].order = current[i].order + 1;
    }

    current.unshift(newItem);

    layouts[activeLayout] = current;
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onAddImage(event) {
    event.preventDefault();
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
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
      animations: [] // Initialize empty animations array
    };

    for (let i = 0; i < current.length; i++) {
      current[i].order = current[i].order + 1;
    }
    
    current.unshift(newItem);
    
    layouts[activeLayout] = current;
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onAddStatic(event) {
    event.preventDefault();
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
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
      animations: [] // Initialize empty animations array
    };
    
    for (let i = 0; i < current.length; i++) {
      current[i].order = current[i].order + 1;
    }

    current.unshift(newItem);
    
    layouts[activeLayout] = current;
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onRemoveRow(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const current = layouts[activeLayout] || [];
    current.splice(index, 1);
    layouts[activeLayout] = current;
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const current = layouts[activeLayout] || [];
    if (index > 0) {
      [current[index - 1], current[index]] = [current[index], current[index - 1]];
      layouts[activeLayout] = current;
      await game.settings.set(MODULE_ID, "layouts", layouts);
      this.render();
    }
  }

  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const current = layouts[activeLayout] || [];
    if (index < current.length - 1) {
      [current[index], current[index + 1]] = [current[index + 1], current[index]];
      layouts[activeLayout] = current;
      await game.settings.set(MODULE_ID, "layouts", layouts);
      this.render();
    }
  }

  async _updateObject(event, formData) {
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
  
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
          customPath: "",  // Add default customPath property
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
          animations: [] // Initialize empty animations array
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
    
    // Special handling after all fields are processed
    newItems.forEach(item => {
      // If this is a custom path, get the data from the customPath field
      if (item.dataPath === 'custom' && item.customPath) {
        // Store the custom path but keep dataPath as 'custom' for the UI
        item.customPath = item.customPath.trim();
      } else {
        // Clear customPath if not using a custom data path
        item.customPath = '';
      }
    });
    
    // Preserve existing animations from items
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const currentItems = layouts[activeLayout] || [];
    
    // Copy animations from existing items to new items
    newItems.forEach((item, index) => {
      if (currentItems[index] && currentItems[index].animations) {
        item.animations = currentItems[index].animations;
      }
    });
    
    layouts[activeLayout] = newItems;
    await game.settings.set(MODULE_ID, "layouts", layouts);
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
  // Store window references globally
  window.overlayWindows = window.overlayWindows || {};

  // Close existing window if open
  if (window.overlayWindows && window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
    window.overlayWindows[windowId].close();
  }

  const windows = game.settings.get(MODULE_ID, "overlayWindows");
  const windowConfig = windows[windowId] || windows.main;
  
  const overlayWindow = window.open(
    "",
    `FoundryStreamOverlay_${windowId}`,
    "width=800,height=600,resizable=yes"
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
  
  // Store reference to this specific window
  window.overlayWindows[windowId] = overlayWindow;
  
  // For backward compatibility, also set the legacy global reference
  if (windowId === "main") {
    window.overlayWindow = overlayWindow;
  }
  
  updateOverlayWindow(windowId);
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
  const layouts = game.settings.get(MODULE_ID, "layouts") || {};
  const activeLayout = windowConfig.activeLayout || "Default";
  const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
  
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
      if (item.dataPath === "name") {
        textValue = actor.name;
      } else if (item.dataPath === "hp") {
        const currentHP = foundry.utils.getProperty(actor, 'system.attributes.hp.value');
        const maxHP = foundry.utils.getProperty(actor, 'system.attributes.hp.max');
        textValue = `${currentHP} / ${maxHP}`;
      } else if (item.dataPath === "system.details.class") {
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

      }else if (item.dataPath === "custom" && item.customPath) {
        textValue = foundry.utils.getProperty(actor, item.customPath);
        if (textValue === null || textValue === undefined) textValue = "N/A";
      }
       else {
        textValue = foundry.utils.getProperty(actor, item.dataPath);
      }
      
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
          "system.abilities.cha.value": "CHA"
        };
      
        const label = labelMap[item.dataPath] || '';
        textValue = label ? `${label}: ${textValue}` : textValue;
      }
      
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
  // Check for relevant changes to trigger animations
  if (foundry.utils.hasProperty(update, "system.attributes.hp")) {
    triggerAnimationsByEvent(actor.id, "hpChange", {
      oldValue: actor._source.system.attributes.hp.value,
      newValue: actor.system.attributes.hp.value
    });
  }
  
  // Always update overlay window
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

  getData() {
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
    
    return { 
      layouts, 
      activeLayout,
      isPremium
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".create-new-layout").click(this._onCreateNewLayout.bind(this));
    html.find(".activate-layout").click(this._onActivate.bind(this));
    html.find(".rename-layout").click(this._onRename.bind(this));
    html.find(".duplicate-layout").click(this._onDuplicate.bind(this));
    html.find(".delete-layout").click(this._onDelete.bind(this));
    html.find(".export-layout").click(this._onExport.bind(this));
    html.find(".import-layout").click(this._onImport.bind(this));
  }

  async _onCreateNewLayout(event) {
    event.preventDefault();
    
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const layoutCount = Object.keys(layouts).length;
    
    if (!isPremium && layoutCount > 0) {
      // Create a dialog to inform about premium feature
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
    
    // Continue with creating a new layout
    const layoutName = prompt("Enter a new layout name:");
    if (!layoutName) return;

    const maxNameLength = 50; // Adjust this value as needed
    if (layoutName.length > maxNameLength) {
      ui.notifications.error(`Layout name too long. Maximum length is ${maxNameLength} characters.`);
      return;
    }
    
    if (layouts[layoutName]) {
      ui.notifications.warn("That layout already exists.");
      return;
    }
    
    layouts[layoutName] = [];
    await game.settings.set(MODULE_ID, "layouts", layouts);
    ui.notifications.info(`Layout "${layoutName}" created.`);
    this.render();
  }
  async _onActivate(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    await game.settings.set(MODULE_ID, "activeLayout", layoutName);
    ui.notifications.info(`Activated layout: ${layoutName}`);
    updateOverlayWindow();
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
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    if (layouts[newName]) {
      ui.notifications.warn("A layout with that name already exists.");
      return;
    }
    layouts[newName] = layouts[oldName];
    delete layouts[oldName];
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout");
    if (activeLayout === oldName) {
      await game.settings.set(MODULE_ID, "activeLayout", newName);
    }
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onDelete(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    console.log("Deleting layout:", layoutName); // Debug logging
    
    if (layoutName === "Default") {
      ui.notifications.warn("Cannot delete the Default layout.");
      return;
    }
    
    if (!confirm(`Are you sure you want to delete layout: ${layoutName}?`)) return;
    
    try {
      const layouts = game.settings.get(MODULE_ID, "layouts") || {};
      
      if (!layouts[layoutName]) {
        ui.notifications.warn(`Layout "${layoutName}" not found.`);
        return;
      }
      
      delete layouts[layoutName];
      
      // Check if this was the active layout and reset to Default if needed
      const activeLayout = game.settings.get(MODULE_ID, "activeLayout");
      if (activeLayout === layoutName) {
        await game.settings.set(MODULE_ID, "activeLayout", "Default");
        ui.notifications.info(`Active layout reset to Default.`);
      }
      
      await game.settings.set(MODULE_ID, "layouts", layouts);
      ui.notifications.info(`Layout "${layoutName}" deleted.`);
      this.render();
    } catch (error) {
      console.error("Failed to delete layout:", error);
      ui.notifications.error(`Failed to delete layout: ${error.message}`);
    }
  }

  async _onExport(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    
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
              // Create blob and trigger download
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
    
    // Create a text area for pasting the JSON to handle special characters better
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
              
              // Normalize the JSON string by removing any potential invisible characters
              const normalizedJson = json
                .replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u0600-\u0604\u070F\u17B4\u17B5\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\uFFF0-\uFFFF]/g, "")
                .replace(/\\"/g, '"')  // Handle escaped quotes that might be double-escaped
                .replace(/\\\\/g, '\\'); // Handle double backslashes
              
              // Try to parse the JSON
              let importedLayout;
              try {
                importedLayout = JSON.parse(normalizedJson);
              } catch (parseError) {
                console.error("Parse error:", parseError);
                // Try a more lenient approach if strict parsing fails
                importedLayout = eval('(' + normalizedJson + ')');
              }
              
              // Validate that we got an array
              if (!Array.isArray(importedLayout)) {
                throw new Error("Imported JSON is not a valid layout array");
              }
              
              // Update the layouts
              const layouts = game.settings.get(MODULE_ID, "layouts") || {};
              layouts[layoutName] = importedLayout;
              await game.settings.set(MODULE_ID, "layouts", layouts);
              ui.notifications.info(`Imported layout: ${layoutName}`);
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
    const originalLayoutName = event.currentTarget.dataset.layout;
    console.log("Duplicating layout:", originalLayoutName); // Debug logging
    
    try {
      const layouts = game.settings.get(MODULE_ID, "layouts") || {};
      
      if (!layouts[originalLayoutName]) {
        ui.notifications.error(`Layout "${originalLayoutName}" not found.`);
        return;
      }
      
      // Generate a new name for the duplicated layout
      let baseName = originalLayoutName;
      let copyNumber = 1;
      let newLayoutName = `${baseName} (Copy)`;
      
      // Check if the name already exists and increment the copy number if needed
      while (layouts[newLayoutName]) {
        copyNumber++;
        newLayoutName = `${baseName} (Copy ${copyNumber})`;
      }
      
      // Allow the user to customize the name
      const customName = prompt("Enter a name for the duplicated layout:", newLayoutName);
      if (!customName) return; // User canceled

      const maxNameLength = 50; // Adjust this value as needed
      if (customName.length > maxNameLength) {
        ui.notifications.error(`Layout name too long. Maximum length is ${maxNameLength} characters.`);
        return;
      }
      
      if (layouts[customName]) {
        ui.notifications.warn("A layout with that name already exists.");
        return;
      }
      
      // Create a deep copy of the layout to avoid reference issues
      layouts[customName] = JSON.parse(JSON.stringify(layouts[originalLayoutName]));
      
      // Save the new layout
      await game.settings.set(MODULE_ID, "layouts", layouts);
      ui.notifications.info(`Layout "${originalLayoutName}" duplicated as "${customName}".`);
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
    const slideshow = game.settings.get(MODULE_ID, "slideshow") || { 
      list: [], 
      random: false,
      transition: "none",
      transitionDuration: 0.5,
      targetWindow: "main"
    };
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const availableLayouts = Object.keys(layouts);
    
    const windows = game.settings.get(MODULE_ID, "overlayWindows") || {
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
    const data = game.settings.get(MODULE_ID, "slideshow") || { 
      list: [], 
      random: false,
      targetWindow: "main" 
    };
    data.list.push({ layout: selectedLayout, duration: 10 });
    await game.settings.set(MODULE_ID, "slideshow", data);
    this.render();
  }

  async _onRemoveItem(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const data = game.settings.get(MODULE_ID, "slideshow") || { 
      list: [], 
      random: false,
      targetWindow: "main" 
    };
    data.list.splice(index, 1);
    await game.settings.set(MODULE_ID, "slideshow", data);
    this.render();
  }

  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const data = game.settings.get(MODULE_ID, "slideshow") || { 
      list: [], 
      random: false,
      targetWindow: "main" 
    };
    if (index > 0) {
      [data.list[index - 1], data.list[index]] = [data.list[index], data.list[index - 1]];
      await game.settings.set(MODULE_ID, "slideshow", data);
      this.render();
    }
  }

  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const data = game.settings.get(MODULE_ID, "slideshow") || { 
      list: [], 
      random: false,
      targetWindow: "main" 
    };
    if (index < data.list.length - 1) {
      [data.list[index], data.list[index + 1]] = [data.list[index + 1], data.list[index]];
      await game.settings.set(MODULE_ID, "slideshow", data);
      this.render();
    }
  }

  async _onStartSlideshow(event) {
    event.preventDefault();

    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
    if (!isPremium) {
      ui.notifications.warn("Slideshow feature requires premium activation. Please consider supporting on Patreon.");
      return;
    }
      
    const slideshow = game.settings.get(MODULE_ID, "slideshow") || { 
      list: [], 
      random: false,
      transition: "none",
      transitionDuration: 0.5,
      targetWindow: "main"
    };
    
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
        
        const currentSlideshow = game.settings.get(MODULE_ID, "slideshow") || { 
          list: [], 
          random: false,
          transition: "none",
          transitionDuration: 0.5,
          targetWindow: "main"
        };
        
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
          const windows = game.settings.get(MODULE_ID, "overlayWindows");
          const windowConfig = windows[windowId] || windows.main;
          const currentLayoutName = windowConfig.activeLayout;
          const nextLayoutName = currentItem.layout;
          
          console.log(`Transitioning from ${currentLayoutName} to ${nextLayoutName} in window ${windowId}`);
          
          if (currentLayoutName !== nextLayoutName) {
            windows[windowId].activeLayout = nextLayoutName;
            await game.settings.set(MODULE_ID, "overlayWindows", windows);
            
            updateOverlayWindow(windowId);
            
            const tempDiv = overlayWindow.document.createElement('div');
            tempDiv.innerHTML = container.innerHTML;
            
            console.log("Generated content:", tempDiv.innerHTML);
            
            windows[windowId].activeLayout = currentLayoutName;
            await game.settings.set(MODULE_ID, "overlayWindows", windows);
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
            
            windows[windowId].activeLayout = nextLayoutName;
            await game.settings.set(MODULE_ID, "overlayWindows", windows);
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
    
    const data = { 
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
        data.list.push({
          layout: temp[key].layout,
          duration: Number(temp[key].duration) || 10
        });
      }
    }
    
    data.random = formData.random === "on";
    data.transition = formData.transition || "none";
    data.transitionDuration = Number(formData.transitionDuration) || 0.5;
    
    console.log("Processed slideshow data:", data);
    
    await game.settings.set(MODULE_ID, "slideshow", data);
    ui.notifications.info("Slideshow configuration saved.");
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
    // Log the context data being passed to the template
    console.log("Animation Manager template data:", data);
    console.log("Actors available:", data.allActors?.length || 0);
    if (data.allActors?.length > 0) {
      console.log("First actor:", data.allActors[0]);
    } else {
      console.log("No actors found in data");
    }
    
    // Continue with normal rendering
    return super._renderInner(data);
  }


  constructor(item, itemIndex, parentConfig) {
    super();
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
    
    if (!isPremium) {
      // Show a dialog explaining premium features
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
      
      // Prevent further initialization
      return null;
    }
    
    this.item = item;
    this.itemIndex = itemIndex;
    this.parentConfig = parentConfig;
  }
  
  getData() {
    // Get all actors for the target actor dropdown
    const allActors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
    
    // Animation options separated by type
    return {
      item: this.item,
      allActors: allActors, // Add actors list for the dropdown
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
        // Add all the continuous animations as options too
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
      isPremium: game.settings.get(MODULE_ID, "isPremium") || false
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
      
      // Get all actors
      const actors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
      
      // Add actor options
      actors.forEach(actor => {
        actorDropdown.append(new Option(actor.name, actor.id));
      });
      
      console.log(`Added ${actors.length} actors to dropdown`);
    } else {
      console.error("Actor dropdown not found in template!");
    }
    
    // Use the provided html parameter, not a global variable
    html.find(".add-animation").click(this._onAddAnimation.bind(this));
    html.find(".remove-animation").click(this._onRemoveAnimation.bind(this));
    
    html.find("#set-entrance-animation").click(this._onSetEntranceAnimation.bind(this));
  
    // Handle tab changes
    html.find('.tabs .item').click(ev => {
      const tab = $(ev.currentTarget).data('tab');
      this._tabs[0].activate(tab);
    });
    
    // Handle condition type changes
    html.find("#trigger-event").change(this._onTriggerEventChange.bind(this, html));
    html.find("#hp-comparison").change(this._onHPComparisonChange.bind(this, html));
    
    // Show/hide custom stat path field
    html.find("#trigger-stat").change(function() {
      if ($(this).val() === "custom") {
        html.find("#custom-stat-path").slideDown(200);
      } else {
        html.find("#custom-stat-path").slideUp(200);
      }
    });
  
    
    // Use the provided html parameter, not a global variable
    html.find(".add-animation").click(this._onAddAnimation.bind(this));
    html.find(".remove-animation").click(this._onRemoveAnimation.bind(this));
    
    html.find("#set-entrance-animation").click(this._onSetEntranceAnimation.bind(this));

    // Handle tab changes
    html.find('.tabs .item').click(ev => {
      const tab = $(ev.currentTarget).data('tab');
      this._tabs[0].activate(tab);
    });
    
    // Handle condition type changes
    html.find("#trigger-event").change(this._onTriggerEventChange.bind(this, html));
    html.find("#hp-comparison").change(this._onHPComparisonChange.bind(this, html));
    
    // Show/hide custom stat path field
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
    
    // Hide all trigger-specific conditions
    html.find('.trigger-condition').hide();
    
    // Show the specific condition for this event type
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
    
    // Update the item directly
    this.item.entranceAnimation = animation;
    this.item.entranceDuration = duration;
    this.item.entranceDelay = delay;
    
    // Save the changes
    await this._saveItemAnimations();
    
    // Provide feedback
    ui.notifications.info("Entrance animation updated");
    
    // Re-render the form
    this.render();
  }
  
  async _onAddAnimation(event) {
    event.preventDefault();
    
    // Get the html element where the form is located
    const html = $(event.currentTarget).closest('form');
    
    // Get the animation type based on which tab/button was clicked
    const type = $(event.currentTarget).data('type');
    
    // Get the selected animation based on the type
    const animation = html.find(`#${type}-animation`).val();
    
    if (!animation || animation === "none") return;
    
    let triggerCondition = null;
    if (type === "trigger") {
      const eventType = html.find("#trigger-event").val();
      const targetActor = html.find("#trigger-actor").val() || null;  // Get the target actor
      const targetStat = html.find("#trigger-stat").val();
      let dataPath = "";
      
      // Set the data path based on the selected stat
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
        targetActor: targetActor,  // Store the target actor
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
    
    // Create the new animation entry
    const newAnimation = {
      type: type,
      animation: animation,
      delay: 0,
      duration: Number(html.find(`#${type}-duration`).val()) || (type === "entrance" ? 0.5 : 1.5),
      triggerCondition: triggerCondition
    };
    
    // Add to the animations array
    const activeAnimations = this.item.animations || [];
    activeAnimations.push(newAnimation);
    
    // Update the item and re-render
    this.item.animations = activeAnimations;
    
    // Save to the module settings
    await this._saveItemAnimations();
    
    // Re-render the form
    this.render();
  }
  
  async _onRemoveAnimation(event) {
    event.preventDefault();
    const type = $(event.currentTarget).data('type');
    const index = Number($(event.currentTarget).data('index'));
    
    // Get all animations of the specified type
    const typeAnimations = this.item.animations.filter(a => a.type === type);
    
    // Find the overall index of the animation to remove
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
      // Remove the animation
      this.item.animations.splice(removeIndex, 1);
      
      // Save and re-render
      await this._saveItemAnimations();
      this.render();
    }
  }
  
  async _saveItemAnimations() {
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    
    // Update the item in the layout
    layouts[activeLayout][this.itemIndex].animations = this.item.animations;
    
    // Save to settings
    await game.settings.set(MODULE_ID, "layouts", layouts);
    
    // Update the parent if it exists
    if (this.parentConfig) {
      this.parentConfig.render();
    }
    
    // Update the overlay if it's open
    if (window.overlayWindow && !window.overlayWindow.closed) {
      updateOverlayWindow();
    }
  }
  
  async _updateObject(event, formData) {
    // Process form data to update animations
    // Extract animation durations and delays from form data
    for (const [key, value] of Object.entries(formData)) {
      const parts = key.split('.');
      if (parts.length === 3) {  // Format: type.index.property
        const type = parts[0];
        const index = Number(parts[1]);
        const property = parts[2];
        
        // Find the animation in our array
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
          // Update the property
          this.item.animations[targetIndex][property] = Number(value);
        }
      }
    }
    
    // Save changes
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
  
  // Multiple animations need a special approach
  if (animations.length > 1) {
    // Add a special attribute to track animations
    element.setAttribute('data-animations', JSON.stringify(animations.map(a => a.animation)));
    
    // For multi-element types, we need different animation handling
    if (element.tagName.toLowerCase() === 'img') {
      // For images
      applyMultipleImageAnimations(animations, element);
    } else {
      // For text and other elements
      applyMultipleTextAnimations(animations, element);
    }
  } else if (animations.length === 1) {
    // For a single animation, use the simpler approach
    const anim = animations[0];
    element.classList.add(anim.animation);
    element.style.animationDelay = `${anim.delay}s`;
    element.style.animationDuration = `${anim.duration}s`;
    element.style.animationIterationCount = "infinite";
  }
}

function applyMultipleTextAnimations(animations, element) {
  // Insert a style element in the overlay window for this specific element
  const styleId = `style-${Math.random().toString(36).substring(2, 9)}`;
  element.setAttribute('data-style-id', styleId);
  
  const styleEl = window.overlayWindow.document.createElement('style');
  styleEl.id = styleId;
  
  // Create keyframes that combine all animations
  let transformProperties = [];
  
  // Add effects based on the animation types
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
  
  // Create a custom animation for this element
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
  // Insert a style element in the overlay window for this specific element
  const styleId = `style-${Math.random().toString(36).substring(2, 9)}`;
  element.setAttribute('data-style-id', styleId);
  
  const styleEl = window.overlayWindow.document.createElement('style');
  styleEl.id = styleId;
  
  // Create keyframes that combine all animations
  let transformProperties = [];
  
  // Add effects based on the animation types
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
  
  // Create a custom animation for this element - no translateX(-50%) for images
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
function applyAllContinuousAnimations(animations, element) {
  if (!animations.length) return;
  
  // For multiple animations, we need to create custom animation properties
  if (animations.length > 1) {
    // Add all animation classes
    animations.forEach(anim => {
      element.classList.add(anim.animation);
    });
    
    // Build a combined animation property
    const animationNames = animations.map(anim => anim.animation).join(", ");
    const animationDurations = animations.map(anim => `${anim.duration}s`).join(", ");
    const animationDelays = animations.map(anim => `${anim.delay}s`).join(", ");
    const animationIterationCounts = animations.map(() => "infinite").join(", ");
    
    // Apply combined animations
    element.style.animationName = animationNames;
    element.style.animationDuration = animationDurations;
    element.style.animationDelay = animationDelays;
    element.style.animationIterationCount = animationIterationCounts;
    element.style.animationFillMode = "forwards";
  } else if (animations.length === 1) {
    // For a single animation, use the simpler approach
    const anim = animations[0];
    element.classList.add(anim.animation);
    element.style.animationDelay = `${anim.delay}s`;
    element.style.animationDuration = `${anim.duration}s`;
  }
}

function triggerHPAnimation(actorId, animationType, oldValue, newValue) {
  if (!window.overlayWindow || window.overlayWindow.closed) return;
  
  const container = window.overlayWindow.document.getElementById("overlay-container");
  if (!container) return;
  
  // Find HP elements associated with this actor
  const layouts = game.settings.get(MODULE_ID, "layouts") || {};
  const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
  const items = layouts[activeLayout] || [];
  
  // Find HP items for this actor
  const hpItems = items.filter(item => 
    item.type === "data" && 
    item.actorId === actorId && 
    (item.dataPath.includes("hp") || item.dataPath === "system.attributes.hp.value")
  );
  
  if (!hpItems.length) return;
  
  // Apply temporary animation class to these elements
  const doc = window.overlayWindow.document;
  const elements = Array.from(doc.querySelectorAll(".overlay-item"));
  
  hpItems.forEach(hpItem => {
    // Find matching element in the DOM
    const matchingElement = elements.find(el => {
      // Compare position or other attributes to identify the right element
      return el.style.top === `${hpItem.top}px` && 
             el.style.left === `${hpItem.left}px` &&
             el.textContent.includes(String(newValue));
    });
    
    if (matchingElement) {
      // Remove any existing triggered animations
      matchingElement.classList.remove("hp-damage", "hp-healing");
      
      // Force reflow
      void matchingElement.offsetWidth;
      
      // Add new animation class
      matchingElement.classList.add(`hp-${animationType}`);
      
      // Add data for potential effects based on damage amount
      const changeAmount = Math.abs(newValue - oldValue);
      matchingElement.dataset.changeAmount = changeAmount;
      
      // Remove the class after animation completes
      setTimeout(() => {
        matchingElement.classList.remove(`hp-${animationType}`);
        delete matchingElement.dataset.changeAmount;
      }, 2000); // Adjust based on animation duration
    }
  });
}

// Updated triggerAnimationsByEvent function
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

// Improved version of evaluateTriggerCondition
function evaluateTriggerCondition(condition, context) {
  console.log("Evaluating trigger condition", condition, "with context", context);
  
  if (!condition) return false;
  
  // Map of event types to their condition checks
  const conditionChecks = {
    "hpChange": () => {
      if (condition.comparison === "decrease" && context.newValue < context.oldValue) return true;
      if (condition.comparison === "increase" && context.newValue > context.oldValue) return true;
      if (condition.comparison === "threshold" && context.newValue <= condition.threshold) return true;
      return false;
    },
    
    "statChange": () => {
      // For future implementation of general stat changes
      const oldValue = context.oldValue || 0;
      const newValue = context.newValue || 0;
      
      if (condition.comparison === "decrease" && newValue < oldValue) return true;
      if (condition.comparison === "increase" && newValue > oldValue) return true;
      if (condition.comparison === "threshold" && newValue <= (condition.threshold || 0)) return true;
      return false;
    },
    
    "levelUp": () => {
      return (context.newValue > context.oldValue);
    },
    
    "criticalHit": () => {
      return context.isCritical === true;
    },
    
    "statusEffect": () => {
      return context.statusEffect !== undefined;
    }
  };
  
  // Use the appropriate check for this event type
  if (conditionChecks[condition.event]) {
    return conditionChecks[condition.event]();
  }
  
  return false;
}

// Enhanced applyTriggeredAnimation with support for all animation types
function applyTriggeredAnimation(element, animation) {
  console.log("Applying triggered animation", animation, "to element", element);
  
  // Store original properties to restore later
  const originalStyles = {
    color: element.style.color,
    animationName: element.style.animationName,
    animationDuration: element.style.animationDuration,
    animationDelay: element.style.animationDelay,
    animationIterationCount: element.style.animationIterationCount
  };
  
  // Keep track of added classes to remove later
  const addedClasses = [];
  
  // Remove any existing triggered animation classes
  element.classList.remove("hp-damage", "hp-healing");
  
  // Apply the specific animation class
  if (animation.animation) {
    element.classList.add(animation.animation);
    addedClasses.push(animation.animation);
  }
  
  // Animation-specific effects
  switch (animation.animation) {
    case "hpDamage":
      element.classList.add("hp-damage");
      element.style.color = "#ff3333"; // Red for damage
      addedClasses.push("hp-damage");
      break;
      
    case "hpHealing":
      element.classList.add("hp-healing");
      element.style.color = "#33ff33"; // Green for healing
      addedClasses.push("hp-healing");
      break;
      
    default:
      // For standard animations, set animation properties
      if (window.standardAnimations && window.standardAnimations.includes(animation.animation)) {
        // Set the animation to run only once with the specified duration
        element.style.animationName = animation.animation;
        element.style.animationDuration = `${animation.duration || 1.5}s`;
        element.style.animationDelay = "0s";
        element.style.animationIterationCount = "1";
        element.style.animationFillMode = "forwards";
      }
      break;
  }
  
  // Force a reflow to ensure animation plays
  void element.offsetWidth;
  
  // Schedule cleanup after animation duration
  const duration = animation.duration || 1.5;
  setTimeout(() => {
    // Remove added classes
    addedClasses.forEach(cls => element.classList.remove(cls));
    
    // Restore original styles
    for (const [prop, value] of Object.entries(originalStyles)) {
      if (value) element.style[prop] = value;
    }
    
    console.log("Animation complete, element restored");
  }, duration * 1000);
}

// Create standard animation list for reference
window.standardAnimations = [
  "hover", "glitch", "heartbeat", "rotate", "wiggle", "pulse", "slide",
  "flash", "shake", "shimmer", "floatSway", "textGlow", "breathe",
  "colorShift", "jitter", "emphasis", "ripple", "blinkingCursor", "backdropPulse"
];

// Update the actor hook to send more context in trigger events
Hooks.on("updateActor", (actor, update, options, userId) => {
  // Check for HP changes
  if (foundry.utils.hasProperty(update, "system.attributes.hp")) {
    const oldValue = actor._source.system.attributes.hp.value || 0;
    const newValue = actor.system.attributes.hp.value || 0;
    
    console.log(`HP changed for actor ${actor.id}: ${oldValue} → ${newValue}`);
    
    // Trigger animations based on HP change
    triggerAnimationsByEvent(actor.id, "hpChange", {
      oldValue: oldValue,
      newValue: newValue,
      dataPath: "system.attributes.hp.value"
    });
  }
  
  // Check for level changes
  if (foundry.utils.hasProperty(update, "system.details.level")) {
    const oldValue = actor._source.system.details.level || 0;
    const newValue = actor.system.details.level || 0;
    
    console.log(`Level changed for actor ${actor.id}: ${oldValue} → ${newValue}`);
    
    // Trigger animations based on level change
    triggerAnimationsByEvent(actor.id, "levelUp", {
      oldValue: oldValue,
      newValue: newValue,
      dataPath: "system.details.level"
    });
  }
  
  // Add more property checks here for other stats you want to monitor
  
  // Always update overlay window
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
      // For future implementation of general stat changes
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
  
  // Remove any existing animation classes from previous triggers
  element.classList.remove("hp-damage", "hp-healing");
  
  // Store original properties to restore later
  const originalColor = element.style.color;
  const originalClasses = [...element.classList];
  
  // Apply the specific animation class
  element.classList.add(animation.animation);
  
  // Animation-specific effects
  switch (animation.animation) {
    case "hpDamage":
      element.classList.add("hp-damage");
      element.style.color = "#ff3333"; // Red for damage
      break;
    case "hpHealing":
      element.classList.add("hp-healing");
      element.style.color = "#33ff33"; // Green for healing
      break;
    default:
      // If it's a standard animation from the continuous list, apply that
      if (window.standardAnimations && window.standardAnimations.includes(animation.animation)) {
        element.classList.add(animation.animation);
      }
      break;
  }
  
  // Force a reflow to ensure animation plays
  void element.offsetWidth;
  
  // Schedule cleanup after animation duration
  const duration = animation.duration || 1.5;
  setTimeout(() => {
    // Reset to original state
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
    
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
    const windows = game.settings.get(MODULE_ID, "overlayWindows");
    
    if (!isPremium && Object.keys(windows).length > 1) {
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
    
    // Close the window if it's open
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
    const windows = game.settings.get(MODULE_ID, "overlayWindows");
    const windowConfig = windows[this.windowId];
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const slideshows = this._getSlideshowOptions();
    
    return { 
      windowId: this.windowId,
      windowConfig, 
      layouts,
      slideshows,
      isPremium: game.settings.get(MODULE_ID, "isPremium")
    };
  }
  
  _getSlideshowOptions() {
    // Create fake slideshow options - you'll need to implement actual slideshow presets
    return [
      { id: "none", name: "No Slideshow" },
      { id: "main", name: "Main Slideshow" }
    ];
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    html.find("input, select").on("change", this._onSettingChange.bind(this));
    html.find(".open-window").click(this._onOpenWindow.bind(this));
  }
  
  async _onSettingChange(event) {
    const windows = game.settings.get(MODULE_ID, "overlayWindows");
    const field = event.currentTarget.name;
    const value = event.currentTarget.type === "checkbox" 
      ? event.currentTarget.checked 
      : event.currentTarget.value;
    
    windows[this.windowId][field] = value;
    await game.settings.set(MODULE_ID, "overlayWindows", windows);
    
    // Update the window if it's open
    if (window.overlayWindows && window.overlayWindows[this.windowId]) {
      updateOverlayWindow(this.windowId);
    }
  }
  
  async _onOpenWindow(event) {
    event.preventDefault();
    openOverlayWindow(this.windowId);
  }
}