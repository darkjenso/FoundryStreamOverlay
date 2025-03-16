const MODULE_ID = "foundrystreamoverlay";

const LAYOUT_TRANSITIONS = {
  // Keep fade and flip transitions exactly the same
  "none": {
    execute: async (container, duration, nextContent) => {
      console.log("Executing none transition", { container, duration, nextContent });
      
      // Force convert to Element if possible
      if (container && typeof container === 'object' && container.tagName) {
        container = container;
      } else {
        console.error("Cannot convert container to Element", { container });
        return Promise.resolve();
      }

      // No transition, just instant change
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
      
      // Force convert to Element if possible
      if (container && typeof container === 'object' && container.tagName) {
        container = container;
      } else {
        console.error("Cannot convert container to Element", { container });
        return Promise.resolve();
      }
      
      // Ensure we're working with the correct document
      const doc = container.ownerDocument || window.overlayWindow.document;
      
      // Create overlay containers for old and new content
      const oldOverlay = doc.createElement("div");
      const newOverlay = doc.createElement("div");
      
      // Style for overlay containers
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
      
      // Populate overlays
      oldOverlay.innerHTML = container.innerHTML;
      newOverlay.innerHTML = nextContent;
      
      // Clear container and add overlays
      container.innerHTML = '';
      container.appendChild(oldOverlay);
      container.appendChild(newOverlay);
      
      // Fade transition
      return new Promise((resolve) => {
        setTimeout(() => {
          oldOverlay.style.opacity = "0";
          newOverlay.style.opacity = "1";
          
          // Clean up after transition
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
      
      // Force convert to Element if possible
      if (container && typeof container === 'object' && container.tagName) {
        container = container;
      } else {
        console.error("Cannot convert container to Element", { container });
        return Promise.resolve();
      }
      
      // Ensure we're working with the correct document
      const doc = container.ownerDocument || window.overlayWindow.document;
      
      // Create a wrapper for sliding
      const wrapper = doc.createElement('div');
      wrapper.style.cssText = `
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      `;

      // Move existing content to old div
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

      // Create new div positioned off-screen
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

      // Setup wrapper
      wrapper.appendChild(oldDiv);
      wrapper.appendChild(newDiv);

      // Replace container contents with wrapper
      container.innerHTML = '';
      container.appendChild(wrapper);

      // Trigger slide animation
      return new Promise((resolve) => {
        setTimeout(() => {
          // Slide out old content to the left
          oldDiv.style.transform = 'translateX(-100%)';
          
          // Simultaneously slide in new content from the right
          newDiv.style.transform = 'translateX(-100%)';

          // Clean up after transition
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
      
      // Force convert to Element if possible
      if (container && typeof container === 'object' && container.tagName) {
        container = container;
      } else {
        console.error("Cannot convert container to Element", { container });
        return Promise.resolve();
      }
      
      // Ensure we're working with the correct document
      const doc = container.ownerDocument || window.overlayWindow.document;
      
      container.style.perspective = "1000px";
      container.style.transformStyle = "preserve-3d";
      
      // Set up transition
      container.style.transition = `transform ${duration}s ease-in-out`;
      
      // Flip out
      await new Promise(resolve => {
        setTimeout(() => {
          container.style.transform = "rotateY(90deg)";
          setTimeout(() => {
            // Change content when flipped away
            container.innerHTML = nextContent;
            resolve();
          }, duration * 1000);
        }, 50);
      });
      
      // Flip in
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
// Example data fields for D&D5e.
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
  { label: "CHA Score", path: "system.abilities.cha.value" }
];

// Validates activation keys for premium features
function validateActivationKey(key) {
  // Basic format validation
  if (!key || key.length !== 16 || !/^[A-F0-9]{16}$/.test(key)) {
    if (key !== "") {
      ui.notifications.error("Invalid activation key format.");
    }
    game.settings.set(MODULE_ID, "isPremium", false);
    return;
  }
  
  // Checksum validation
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    // Convert hex character to decimal
    const charCode = parseInt(key[i], 16);
    sum = (sum + charCode) % 16;
  }
  
  // Check if the last character is the checksum
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

// -----------------------------------------
// 1) Register Settings and Helpers
// -----------------------------------------
Hooks.once("init", () => {
  // Register our ifEquals helper.
  Handlebars.registerHelper("ifEquals", function(arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
  });

  // New helper: ifNotDefault – returns content only if value is not "Default"
  Handlebars.registerHelper("ifNotDefault", function(value, options) {
    if (value !== "Default") {
      return options.fn(this);
    }
    return "";
  });

  // Background colour.
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

// Register activation key and premium status
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
  // Basic format validation
  if (!key || key.length !== 16 || !/^[A-F0-9]{16}$/.test(key)) {
    if (key !== "") {
      ui.notifications.error("Invalid activation key format.");
    }
    game.settings.set(MODULE_ID, "isPremium", false);
    return;
  }
  
  // Checksum validation
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    // Convert hex character to decimal
    const charCode = parseInt(key[i], 16);
    sum = (sum + charCode) % 16;
  }
  
  // Check if the last character is the checksum
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

  // Register activation key and premium status settings
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

  // Key validation function
  function validateActivationKey(key) {
    // Basic format validation
    if (!key || key.length !== 16 || !/^[A-F0-9]{16}$/.test(key)) {
      if (key !== "") {
        ui.notifications.error("Invalid activation key format.");
      }
      game.settings.set(MODULE_ID, "isPremium", false);
      return;
    }
    
    // Checksum validation
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      // Convert hex character to decimal
      const charCode = parseInt(key[i], 16);
      sum = (sum + charCode) % 16;
    }
    
    // Check if the last character is the checksum
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

  
  // Layouts: an object mapping layout names to arrays of overlay items.
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

  // Active layout: which layout is currently in use.
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

  // Register the configuration menu (editing items for the active layout).
  game.settings.registerMenu(MODULE_ID, "overlayConfigMenu", {
    name: "Configure Overlay Items",
    label: "Configure Overlay",
    hint: "Edit overlay items for the active layout.",
    icon: "fas fa-bars",
    type: OverlayConfig,
    restricted: false
  });

  // Register the new Manage Layouts menu.
  game.settings.registerMenu(MODULE_ID, "manageLayouts", {
    name: "Manage Layouts",
    label: "Manage Layouts",
    hint: "Create, rename, delete, export, or import overlay layouts.",
    icon: "fas fa-layer-group",
    type: ManageLayouts,
    restricted: false
  });

  // Register the overlay window opener.
  game.settings.registerMenu(MODULE_ID, "openOverlayWindow", {
    name: "Open Overlay Window",
    label: "Open Overlay",
    hint: "Open the overlay in a separate pop-up window.",
    icon: "fas fa-external-link-alt",
    type: OverlayWindowOpener,
    restricted: false,
    config: true
  });

  // Register the Slideshow configuration (new!).
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

  // Register the Slideshow Settings menu.
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

// -----------------------------------------
// 2) Main Overlay Application
// -----------------------------------------
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
      // Include the animation timing properties.
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
          fontStroke: item.fontStroke || false,           // Add text stroke property
          fontStrokeColor: item.fontStrokeColor || "#000000", // Add stroke color
          fontStrokeWidth: item.fontStrokeWidth || 1,     // Add stroke width
          order: item.order || 0,
          animation,
          animationDelay,
          animationDuration,
          entranceAnimation,
          entranceDuration,
          entranceDelay
        };
      } else {
        // Dynamic data items.
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
          fontStroke: item.fontStroke || false,           // Add text stroke property
          fontStrokeColor: item.fontStrokeColor || "#000000", // Add stroke color
          fontStrokeWidth: item.fontStrokeWidth || 1,     // Add stroke width
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
  
    // Sort items in ascending order.
    items.sort((a, b) => a.order - b.order);
    // Compute renderOrder so that items at the top of the config list appear in front.
    const max = items.length;
    items.forEach((item, index) => {
      item.renderOrder = max - index;
    });
  
    return {
      backgroundColour,
      items,
      isPremium   // Pass the premium status to the template
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}


// -----------------------------------------
// Premium Status Dialog for Activation Keys
// -----------------------------------------
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
      // The key will be validated by the onChange handler
      this.render();
    });
  }

  async _updateObject(event, formData) {
    // Not used since we handle the activation via button click
  }
}

Hooks.once("init", () => {
  // Your existing registrations...
  
  // Register activation key and premium status
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
  
  // Register the Premium Status menu
  game.settings.registerMenu(MODULE_ID, "premiumStatus", {
    name: "Premium Status",
    label: "Premium Status",
    hint: "Check your premium status or activate with a key.",
    icon: "fas fa-gem",
    type: PremiumStatusDialog,
    restricted: false
  });
  
  // Your other registerMenu calls...
});

// -----------------------------------------
// 3) Overlay Config Form (Editing Active Layout Items)
// -----------------------------------------
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

  getData() {
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const rows = (layouts[activeLayout] || []).map((item, idx) => {
      return {
        idx,
        type: item.type || "data", // "data", "static", or "image"
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
        fontStroke: item.fontStroke || false,           // Add text stroke property
        fontStrokeColor: item.fontStrokeColor || "#000000", // Add stroke color
        fontStrokeWidth: item.fontStrokeWidth || 1,     // Add stroke width
        addLabel: item.addLabel || false, 
        imagePath: item.imagePath || "",
        imageSize: item.imageSize || 100,
        order: item.order || idx,
        animation: item.animation || "none",
        animationDelay: (item.animationDelay !== undefined) ? item.animationDelay : 0,
        animationDuration: item.animationDuration || 1.5,
        entranceAnimation: item.entranceAnimation || "none",
        entranceDuration: item.entranceDuration || 0.5,
        entranceDelay: item.entranceDelay || 0
      };
    });
    const dataPathChoices = POSSIBLE_DATA_PATHS;
    const allActors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
    return { rows, allActors, dataPathChoices, activeLayout, layouts };
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Check premium status
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
    
    // Disable animation controls for non-premium users
    if (!isPremium) {
      // Disable animation dropdowns except for "none" option
      html.find("select[name^='animation-']").each(function() {
        // First disable all options except "none"
        $(this).find("option:not([value='none'])").prop("disabled", true);
        // Then set value to "none"
        $(this).val("none");
      });
      
      // Disable entrance animation dropdowns except for "none" option
      html.find("select[name^='entranceAnimation-']").each(function() {
        // First disable all options except "none"
        $(this).find("option:not([value='none'])").prop("disabled", true);
        // Then set value to "none"
        $(this).val("none");
      });
      
      // Disable animation timing inputs
      html.find("input[name^='animationDelay-']").prop("disabled", true);
      html.find("input[name^='animationDuration-']").prop("disabled", true);
      html.find("input[name^='entranceDuration-']").prop("disabled", true);
      html.find("input[name^='entranceDelay-']").prop("disabled", true);
      
      // Add a premium note next to animation fields
      html.find("select[name^='animation-']").closest("td").append(
        '<div class="premium-note" style="color:#aa5555;font-size:0.8em;margin-top:5px;">Premium feature</div>'
      );
      html.find("select[name^='entranceAnimation-']").closest("td").append(
        '<div class="premium-note" style="color:#aa5555;font-size:0.8em;margin-top:5px;">Premium feature</div>'
      );
    }
    
    // Bind layout selection change to update active layout immediately.
    html.find("#active-layout").change(async e => {
      e.preventDefault();
      const newLayout = html.find("#active-layout").val();
      await game.settings.set("foundrystreamoverlay", "activeLayout", newLayout);
      ui.notifications.info("Active layout set to " + newLayout);
      
      // Refresh the configuration form
      this.render();
    });
    
    html.find(".add-row").click(this._onAddRow.bind(this));
    html.find(".add-image").click(this._onAddImage.bind(this));
    html.find(".add-static").click(this._onAddStatic.bind(this));
    html.on("click", ".remove-row", this._onRemoveRow.bind(this));
    html.find(".move-up").click(this._onMoveUp.bind(this));
    html.find(".move-down").click(this._onMoveDown.bind(this));
    
    // Bind file-picker for image path fields.
    html.find(".file-picker").off("click").click(e => {
      const idx = $(e.currentTarget).data("index");
      new FilePicker({
        type: "image",
        current: "",
        callback: path => {
          html.find(`input[name="imagePath-${idx}"]`).val(path);
        }
      }).render(true);
    });
    
    // Open Overlay button inside config.
    html.find("#open-overlay-from-config").click(e => {
      e.preventDefault();
      openOverlayWindow();
    });
    
    // Toggle text stroke options visibility
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
      fontStroke: false,           // Add text stroke property
      fontStrokeColor: "#000000",  // Add stroke color
      fontStrokeWidth: 1,          // Add stroke width
      addLabel: false,
      order: 0,
      animation: "none",
      animationDelay: 0,
      animationDuration: 1.5,
      entranceAnimation: "none",
      entranceDuration: 0.5,
      entranceDelay: 0
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
      addLabel: false, // Add this line
      order: 0,
      animation: "none",
      animationDelay: 0,
      animationDuration: 1.5,
      entranceAnimation: "none",
      entranceDuration: 0.5,
      entranceDelay: 0
    };

    // Increment the order of all existing items
    for (let i = 0; i < current.length; i++) {
      current[i].order = current[i].order + 1;
    }
    
    // Add the new item to the beginning of the array
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
      order: 0, // Set order to 0 (top of list)
      animation: "none",
      animationDelay: 0,
      animationDuration: 1.5,
      entranceAnimation: "none",
      entranceDuration: 0.5,
      entranceDelay: 0
    };
    
    // Increment the order of all existing items
    for (let i = 0; i < current.length; i++) {
      current[i].order = current[i].order + 1;
    }
    
    // Add the new item to the beginning of the array
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
  
    // For non-premium users, enforce "none" for all animations
    if (!isPremium) {
      for (let key in formData) {
        if (key.startsWith("animation-") || key.startsWith("entranceAnimation-")) {
          formData[key] = "none";
        }
      }
    }

    const newItems = [];
    for (let [key, val] of Object.entries(formData)) {
      const [field, idx] = key.split("-");
      if (!idx) continue;
      const rowIndex = Number(idx);
      if (!newItems[rowIndex]) {
        newItems[rowIndex] = {
          type: "data",
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
          addLabel: false, // Add this line
          imagePath: "",
          imageSize: 100,
          order: 0,
          animation: "none",
          animationDelay: 0,
          animationDuration: 1.5,
          entranceAnimation: "none",
          entranceDuration: 0.5,
          entranceDelay: 0
        };
      }
      switch (field) {
        case "type": newItems[rowIndex].type = val; break;
        case "actorId": newItems[rowIndex].actorId = val; break;
        case "dataPath": newItems[rowIndex].dataPath = val; break;
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
          // Override animation for non-premium users
          newItems[rowIndex].animation = isPremium ? val : "none"; 
          break;
        case "animationDelay": newItems[rowIndex].animationDelay = Number(val) || 0; break;
        case "animationDuration": newItems[rowIndex].animationDuration = Number(val) || 1.5; break;
        case "entranceAnimation":
          // Override entrance animation for non-premium users
          newItems[rowIndex].entranceAnimation = isPremium ? val : "none"; 
          break;
        case "entranceDuration": newItems[rowIndex].entranceDuration = Number(val) || 0.5; break;
        case "entranceDelay": newItems[rowIndex].entranceDelay = Number(val) || 0; break;
        default: break;
      }
    }
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    layouts[activeLayout] = newItems;
    await game.settings.set(MODULE_ID, "layouts", layouts);
  }
}


// -----------------------------------------
// 4) "Open Overlay" Button Form
// -----------------------------------------
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
    // Not used.
  }
}

// -----------------------------------------
// 5) openOverlayWindow() - Single-Click without Application framework
// -----------------------------------------
function openOverlayWindow() {
  // If a window is already open, close it
  if (window.overlayWindow && !window.overlayWindow.closed) {
    window.overlayWindow.close();
  }

  // Create a new window
  const overlayWindow = window.open(
    "",
    "FoundryStreamOverlayWindow",
    "width=800,height=600,resizable=yes"
  );
  
  if (!overlayWindow) {
    ui.notifications.warn("Popup blocked! Please allow popups for Foundry.");
    return;
  }
  
  const bg = game.settings.get(MODULE_ID, "backgroundColour");
  
  // Create the initial HTML structure with CSS for animations
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
  <div id="overlay-container"></div>
</body>
</html>`);
  
  overlayWindow.document.close();
  
  // Store window reference
  window.overlayWindow = overlayWindow;
  
  // Now update the content
  updateOverlayWindow();
}

// Function to update the overlay window content
function updateOverlayWindow() {
  if (!window.overlayWindow || window.overlayWindow.closed) {
    return;
  }
  
  const bg = game.settings.get(MODULE_ID, "backgroundColour");
  const layouts = game.settings.get(MODULE_ID, "layouts") || {};
  const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
  const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
  
  // Update background color
  window.overlayWindow.document.body.style.backgroundColor = bg;
  
  // Get the container
  const container = window.overlayWindow.document.getElementById("overlay-container");
  if (!container) return;
  
  // Clear existing content
  container.innerHTML = "";
  
  // Get the overlay data directly
  const items = (layouts[activeLayout] || []).map(item => {
    // Get animation properties - we'll handle them differently
    
    // For premium users, use the saved animation settings
    // For non-premium users, force animations to "none"
    let animation = isPremium ? (item.animation || "none") : "none";
    let entranceAnimation = isPremium ? (item.entranceAnimation || "none") : "none";
    
    const animationDelay = (item.animationDelay !== undefined) ? item.animationDelay : 0;
    const animationDuration = item.animationDuration || 1.5;
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
      // Dynamic data items
      const actor = game.actors.get(item.actorId);
      if (!actor) return null;
      if (item.hide) return null;
      
      // Enhanced data processing
      let textValue;
      if (item.dataPath === "name") {
        textValue = actor.name;
      } else if (item.dataPath === "hp") {
        const currentHP = foundry.utils.getProperty(actor, 'system.attributes.hp.value');
        const maxHP = foundry.utils.getProperty(actor, 'system.attributes.hp.max');
        textValue = `${currentHP} / ${maxHP}`;
      } else if (item.dataPath === "system.details.class") {
        // Let's try alternative paths that might contain class info
        const classVal = foundry.utils.getProperty(actor, 'system.details.class');
        const classNameVal = foundry.utils.getProperty(actor, 'system.details.className');
        const classesVal = foundry.utils.getProperty(actor, 'system.details.classes');
        
        if (classVal) {
          textValue = classVal;
        } else if (classNameVal) {
          textValue = classNameVal;
        } else if (classesVal && typeof classesVal === 'object') {
          // Try to extract class name from a classes object
          const classNames = Object.keys(classesVal);
          if (classNames.length > 0) {
            textValue = classNames.join('/');
          } else {
            textValue = 'N/A';
          }
        } else {
          // As a last resort, inspect the actor data structure to find class info
          console.log("Actor data structure:", actor);
          textValue = 'N/A';
        }
      } else if (item.dataPath === "system.details.race") {
        textValue = foundry.utils.getProperty(actor, 'system.details.race') || 'N/A';
      } else {
        textValue = foundry.utils.getProperty(actor, item.dataPath);
      }
      
      // Check if label should be added
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
        entranceDelay
      };
    }
  }).filter(Boolean);
  
  // Sort items in ascending order
  items.sort((a, b) => a.order - b.order);
  // Compute renderOrder so that items at the top of the config list appear in front
  const max = items.length;
  items.forEach((item, index) => {
    item.renderOrder = max - index;
  });
  
  // Create and append items to the container
  for (const item of items) {
    if (item.type === "image") {
      const img = window.overlayWindow.document.createElement("img");
      
      // Only apply entrance animation first
      const hasEntrance = item.entranceAnimation !== "none";
      const hasContinuous = item.animation !== "none";
      
      // Start with entrance animation only if it exists
      if (hasEntrance) {
        img.className = `overlay-item ${item.entranceAnimation}`;
      } else if (hasContinuous) {
        img.className = `overlay-item ${item.animation}`;
      } else {
        img.className = "overlay-item";
      }
      
      img.src = item.imagePath;
      
      // Set positioning styles
      img.style.cssText = `
        position: absolute;
        top: ${item.top}px;
        left: ${item.left}px;
        width: ${item.imageSize}px;
        z-index: ${item.renderOrder};
      `;
      
      // Set animation properties based on which animation is active
      if (hasEntrance) {
        img.style.animationDelay = `${item.entranceDelay}s`;
        img.style.animationDuration = `${item.entranceDuration}s`;
        
        // Add event listener to switch to continuous animation after entrance completes
        if (hasContinuous) {
          img.addEventListener('animationend', () => {
            // First, remove the entrance animation class
            img.className = "overlay-item";
            
            // Force a reflow to ensure the animation restarts
            void img.offsetWidth;
            
            // Then add the continuous animation class
            img.className = `overlay-item ${item.animation}`;
            
            // Set the animation properties explicitly
            img.style.animationDelay = `${item.animationDelay}s`;
            img.style.animationDuration = `${item.animationDuration}s`;
          }, {once: true});
        }
      } else if (hasContinuous) {
        img.style.animationDelay = `${item.animationDelay}s`;
        img.style.animationDuration = `${item.animationDuration}s`;
      }
      
      container.appendChild(img);
    } else {
      // Text items (both static and data)
      const div = window.overlayWindow.document.createElement("div");
      
      // Same animation logic as for images
      const hasEntrance = item.entranceAnimation !== "none";
      const hasContinuous = item.animation !== "none";
      
      if (hasEntrance) {
        div.className = `overlay-item ${item.entranceAnimation}`;
      } else if (hasContinuous) {
        div.className = `overlay-item ${item.animation}`;
      } else {
        div.className = "overlay-item";
      }
      
      // Add text-stroked class if stroke is enabled
      if (item.fontStroke) {
        div.classList.add('text-stroked');
        div.style.setProperty('--stroke-color', item.fontStrokeColor);
      }
      
      // Set positioning and styling
      let styleText = `
        position: absolute;
        top: ${item.top}px;
        left: ${item.left}px;
        font-size: ${item.fontSize}px;
        font-family: ${item.fontFamily};
        color: ${item.fontColor};
        z-index: ${item.renderOrder};
        ${item.bold ? 'font-weight: bold;' : ''}
      `;
      
      // Add text stroke styling if enabled
      if (item.fontStroke) {
        styleText += `
          -webkit-text-stroke: ${item.fontStrokeWidth}px ${item.fontStrokeColor};
          text-stroke: ${item.fontStrokeWidth}px ${item.fontStrokeColor};
          paint-order: stroke fill;
        `;
      }
      
      div.style.cssText = styleText;
      
      // Set animation properties
      if (hasEntrance) {
        div.style.animationDelay = `${item.entranceDelay}s`;
        div.style.animationDuration = `${item.entranceDuration}s`;
        
        // Switch to continuous animation after entrance
        if (hasContinuous) {
          div.addEventListener('animationend', () => {
            // First, remove the entrance animation class
            div.className = "overlay-item";
            if (item.fontStroke) {
              div.classList.add('text-stroked');
            }
            
            // Force a reflow to ensure the animation restarts
            void div.offsetWidth;
            
            // Then add the continuous animation class
            div.className = `overlay-item ${item.animation}`;
            if (item.fontStroke) {
              div.classList.add('text-stroked');
            }
            
            // Set the animation properties explicitly
            div.style.animationDelay = `${item.animationDelay}s`;
            div.style.animationDuration = `${item.animationDuration}s`;
          }, {once: true});
        }
      } else if (hasContinuous) {
        div.style.animationDelay = `${item.animationDelay}s`;
        div.style.animationDuration = `${item.animationDuration}s`;
      }
      
      div.textContent = item.type === "static" ? item.content : item.data;
      container.appendChild(div);
    }
  }
  
  // Add promotional footer for non-premium users
  if (!isPremium) {
    const promoFooter = window.overlayWindow.document.createElement("div");
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
}

// -----------------------------------------
// 7) Update overlay on actor changes
// -----------------------------------------
Hooks.on("updateActor", (actor, update, options, userId) => {
  updateOverlayWindow();
});

// When activeLayout is updated, update the overlay if it's open
Hooks.on("updateSetting", (namespace, key, value, options, userId) => {
  if (namespace === MODULE_ID && (key === "activeLayout" || key === "layouts")) {
    updateOverlayWindow();
  }
});

// -----------------------------------------
// 8) Manage Layouts Class
// -----------------------------------------
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
    return { layouts, activeLayout };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".create-new-layout").click(this._onCreateNewLayout.bind(this));
    html.find(".activate-layout").click(this._onActivate.bind(this));
    html.find(".rename-layout").click(this._onRename.bind(this));
    html.find(".delete-layout").click(this._onDelete.bind(this));
    html.find(".export-layout").click(this._onExport.bind(this));
    html.find(".import-layout").click(this._onImport.bind(this));
  }

  async _onCreateNewLayout(event) {
    event.preventDefault();
    
    // Check if premium
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
    
    // For non-premium users, restrict creating multiple layouts
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    if (!isPremium && Object.keys(layouts).length > 0) {
      ui.notifications.warn("Multiple layouts require premium activation. Please consider supporting on Patreon.");
      return;
    }
    
    // Continue with normal functionality for premium users
    const layoutName = prompt("Enter a new layout name:");
    if (!layoutName) return;
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
    if (layoutName === "Default") {
      ui.notifications.warn("Cannot delete the Default layout.");
      return;
    }
    if (!confirm(`Are you sure you want to delete layout: ${layoutName}?`)) return;
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    delete layouts[layoutName];
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout");
    if (activeLayout === layoutName) {
      await game.settings.set(MODULE_ID, "activeLayout", "Default");
    }
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onExport(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const data = JSON.stringify(layouts[layoutName], null, 2);
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

  async _onImport(event) {
    event.preventDefault();
    const layoutName = prompt("Enter the name for the imported layout:");
    if (!layoutName) return;
    const json = prompt("Paste the JSON for the layout:");
    try {
      const importedLayout = JSON.parse(json);
      const layouts = game.settings.get(MODULE_ID, "layouts") || {};
      layouts[layoutName] = importedLayout;
      await game.settings.set(MODULE_ID, "layouts", layouts);
      ui.notifications.info(`Imported layout: ${layoutName}`);
      this.render();
    } catch (e) {
      ui.notifications.error("Invalid JSON.");
    }
  }
}


// -----------------------------------------
// 9) Slideshow Configuration
// -----------------------------------------
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
      transitionDuration: 0.5
    };
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const availableLayouts = Object.keys(layouts);
    return {
      slideshowItems: slideshow.list,
      availableLayouts,
      random: slideshow.random,
      transition: slideshow.transition,
      transitionDuration: slideshow.transitionDuration
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
    // Get the selected layout from the dropdown.
    const selectedLayout = $(event.currentTarget).closest("form").find("#new-layout-dropdown").val();
    const data = game.settings.get(MODULE_ID, "slideshow") || { list: [], random: false };
    // Add the selected layout with a default 10-second duration.
    data.list.push({ layout: selectedLayout, duration: 10 });
    await game.settings.set(MODULE_ID, "slideshow", data);
    this.render();
  }

  async _onRemoveItem(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const data = game.settings.get(MODULE_ID, "slideshow") || { list: [], random: false };
    data.list.splice(index, 1);
    await game.settings.set(MODULE_ID, "slideshow", data);
    this.render();
  }

  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const data = game.settings.get(MODULE_ID, "slideshow") || { list: [], random: false };
    if (index > 0) {
      [data.list[index - 1], data.list[index]] = [data.list[index], data.list[index - 1]];
      await game.settings.set(MODULE_ID, "slideshow", data);
      this.render();
    }
  }

  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const data = game.settings.get(MODULE_ID, "slideshow") || { list: [], random: false };
    if (index < data.list.length - 1) {
      [data.list[index], data.list[index + 1]] = [data.list[index + 1], data.list[index]];
      await game.settings.set(MODULE_ID, "slideshow", data);
      this.render();
    }
  }

  // Start slideshow using a recursive setTimeout.
  // Modify the _onStartSlideshow method in the SlideshowConfig class
  async _onStartSlideshow(event) {
    event.preventDefault();

    // Check if premium
    const isPremium = game.settings.get(MODULE_ID, "isPremium") || false;
    if (!isPremium) {
      ui.notifications.warn("Slideshow feature requires premium activation. Please consider supporting on Patreon.");
      return;
    }
      
    // Get the current slideshow settings
    const slideshow = game.settings.get(MODULE_ID, "slideshow") || { 
      list: [], 
      random: false,
      transition: "none",
      transitionDuration: 0.5
    };
    
    console.log("Starting slideshow with settings:", slideshow);
    
    if (slideshow.list.length === 0) {
      ui.notifications.warn("No layouts in slideshow.");
      return;
    }
    
    // Ensure overlay window is open and valid
    if (!window.overlayWindow || window.overlayWindow.closed) {
      openOverlayWindow();
    }
    
    // Additional check to ensure the window is properly initialized
    const checkWindowValidity = () => {
      const windowValid = window.overlayWindow 
        && !window.overlayWindow.closed 
        && window.overlayWindow.document;
      
      const containerValid = windowValid && window.overlayWindow.document.getElementById('overlay-container');
      
      if (!windowValid || !containerValid) {
        console.error("Window validity check failed:", {
          windowExists: !!window.overlayWindow,
          windowClosed: window.overlayWindow?.closed,
          documentExists: windowValid,
          containerExists: containerValid
        });
      }
      
      return windowValid && containerValid;
    };
    
    // Wait a short time for the window to initialize
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
      // Wait for window to be ready
      await waitForWindow();
      
      // Stop any existing slideshow
      this._onStopSlideshow(null);
      
      // Set up slideshow state
      window.foundryStreamSlideshowRunning = true;
      window.foundryStreamSlideshowIndex = 0;
      
      const runSlide = async () => {
        // Extensive logging for debugging
        console.log("Slideshow run started", {
          running: window.foundryStreamSlideshowRunning,
          windowValid: checkWindowValidity()
        });
        
        // Exit if slideshow was stopped or window is invalid
        if (!window.foundryStreamSlideshowRunning || !checkWindowValidity()) {
          console.log("Slideshow stopped due to invalid window or stopped state");
          this._onStopSlideshow(null);
          return;
        }
        
        const currentSlideshow = game.settings.get(MODULE_ID, "slideshow") || { 
          list: [], 
          random: false,
          transition: "none",
          transitionDuration: 0.5
        };
        
        if (currentSlideshow.list.length === 0) {
          console.log("No layouts in slideshow");
          this._onStopSlideshow(null);
          return;
        }
        
        // Determine which layout to show
        let currentItem;
        let nextIndex;
        
        if (currentSlideshow.random) {
          nextIndex = Math.floor(Math.random() * currentSlideshow.list.length);
          currentItem = currentSlideshow.list[nextIndex];
        } else {
          nextIndex = window.foundryStreamSlideshowIndex;
          currentItem = currentSlideshow.list[nextIndex];
          // Increment index, wrapping around to start
          window.foundryStreamSlideshowIndex = 
            (window.foundryStreamSlideshowIndex + 1) % currentSlideshow.list.length;
        }
        
        // Get the container
        const container = window.overlayWindow.document.getElementById("overlay-container");
        if (!container) {
          console.error("Overlay container not found!");
          this._onStopSlideshow(null);
          return;
        }
        
        // Get transition settings
        const transition = currentSlideshow.transition || "none";
        const transitionDuration = currentSlideshow.transitionDuration || 0.5;
        
        try {
          // Save current layout name to compare
          const currentLayoutName = game.settings.get(MODULE_ID, "activeLayout");
          const nextLayoutName = currentItem.layout;
          
          console.log(`Transitioning from ${currentLayoutName} to ${nextLayoutName}`);
          
          // Only transition if we're changing to a different layout
          if (currentLayoutName !== nextLayoutName) {
            // Temporarily set the new layout to generate content
            await game.settings.set(MODULE_ID, "activeLayout", nextLayoutName);
            
            // Force a window update to generate the new content
            updateOverlayWindow();
            
            // Capture the generated content
            const tempDiv = window.overlayWindow.document.createElement('div');
            tempDiv.innerHTML = container.innerHTML;
            
            console.log("Generated content:", tempDiv.innerHTML);
            
            // Revert to the original layout for transition
            await game.settings.set(MODULE_ID, "activeLayout", currentLayoutName);
            updateOverlayWindow();
            
            // Execute transition
            if (transition !== "none" && LAYOUT_TRANSITIONS[transition]) {
              try {
                console.log(`Executing ${transition} transition`);
                await LAYOUT_TRANSITIONS[transition].execute(container, transitionDuration, tempDiv.innerHTML);
              } catch (transitionError) {
                console.error("Transition error:", transitionError);
                // Fallback to direct content change
                container.innerHTML = tempDiv.innerHTML;
              }
            }
            
            // Finally set the new layout
            await game.settings.set(MODULE_ID, "activeLayout", nextLayoutName);
            updateOverlayWindow();
          }
          
          // Schedule next slide
          window.foundryStreamSlideshowTimeout = setTimeout(
            () => runSlide(), 
            currentItem.duration * 1000
          );
        } catch (error) {
          console.error("Slideshow iteration error:", error);
          this._onStopSlideshow(null);
        }
      };
      
      // Start the first slide
      await runSlide();
      
      ui.notifications.info("Slideshow started!");
    } catch (initError) {
      console.error("Slideshow initialization error:", initError);
      ui.notifications.error("Failed to start slideshow. Please open the overlay window first.");
      this._onStopSlideshow(null);
    }
  }
  // Fixed _onStopSlideshow method to handle null event
  _onStopSlideshow(event) {
    if (event) event.preventDefault();
    
    if (window.foundryStreamSlideshowTimeout) {
      clearTimeout(window.foundryStreamSlideshowTimeout);
      window.foundryStreamSlideshowTimeout = null;
    }
    
    window.foundryStreamSlideshowRunning = false;
    window.foundryStreamSlideshowIndex = 0;
    
    if (event) {
      ui.notifications.info("Slideshow stopped.");
    }
  }

  async _updateObject(event, formData) {
    event.preventDefault();
    
    console.log("Slideshow form data:", formData);
    
    // Process formData keys in the format layout-0, duration-0, etc.
    const data = { 
      list: [], 
      random: false,
      transition: "none",
      transitionDuration: 0.5
    };
    const temp = {};
    
    // First, collect all form data into temporary objects
    for (let [key, value] of Object.entries(formData)) {
      const [field, index] = key.split("-");
      if (index !== undefined) {
        if (!temp[index]) temp[index] = {};
        temp[index][field] = value;
      }
    }
    
    // Then, process each item
    for (let key in temp) {
      // Make sure we have layout information
      if (temp[key].layout) {
        data.list.push({
          layout: temp[key].layout,
          duration: Number(temp[key].duration) || 10
        });
      }
    }
    
    // Process the random checkbox and transition settings
    data.random = formData.random === "on";
    data.transition = formData.transition || "none";
    data.transitionDuration = Number(formData.transitionDuration) || 0.5;
    
    console.log("Processed slideshow data:", data);
    
    // Save the data
    await game.settings.set(MODULE_ID, "slideshow", data);
    ui.notifications.info("Slideshow configuration saved.");
  }
}