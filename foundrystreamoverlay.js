/**
 * Foundry Stream Overlay (V12)
 * Displays a green‐screen overlay of player characters' HP for streaming,
 * with options to position elements and adjust styling.
 *
 * Enhancements:
 * - Option to hide max HP.
 * - Option to hide individual players.
 * - Separate styling options for player names and HP numbers (font size, bold, colour).
 * - Layout Config form remains open after saving.
 * - External overlay window removes default close controls.
 */

Hooks.once("init", () => {
  // 1) Register settings for HP paths and background.
  game.settings.register("foundrystreamoverlay", "hpPath", {
    name: "HP Path",
    hint: "Path to the current HP value (e.g. attributes.hp.value).",
    scope: "world",
    type: String,
    default: "attributes.hp.value",
    config: true,
    restricted: true
  });

  game.settings.register("foundrystreamoverlay", "maxHpPath", {
    name: "Max HP Path",
    hint: "Path to the maximum HP value (e.g. attributes.hp.max).",
    scope: "world",
    type: String,
    default: "attributes.hp.max",
    config: true,
    restricted: true
  });

  game.settings.register("foundrystreamoverlay", "backgroundColour", {
    name: "Background Colour",
    hint: "Chroma key colour for the overlay background.",
    scope: "client",
    type: String,
    default: "#00ff00",
    config: true
  });

  // Remove global fontSize; now managed in Layout Config.
  game.settings.register("foundrystreamoverlay", "fontSize", {
    name: "Font Size",
    hint: "(Deprecated) Use Layout Config for font size options.",
    scope: "client",
    type: Number,
    default: 16,
    config: false
  });

  // 2) Display options (managed via Layout Config).
  game.settings.register("foundrystreamoverlay", "showNames", {
    name: "Show Player Names",
    hint: "Display player names along with their HP.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false
  });

  game.settings.register("foundrystreamoverlay", "hideMaxHP", {
    name: "Hide Max HP",
    hint: "If enabled, only current HP is shown.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false
  });

  game.settings.register("foundrystreamoverlay", "hiddenActors", {
    name: "Hidden Actors",
    hint: "Stores an object mapping actor IDs to hidden (true/false).",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });

  // Styling for player names.
  game.settings.register("foundrystreamoverlay", "nameFontSize", {
    name: "Name Font Size",
    hint: "Font size for player names (in pixels).",
    scope: "client",
    type: Number,
    default: 18,
    config: false
  });
  game.settings.register("foundrystreamoverlay", "nameBold", {
    name: "Name Bold",
    hint: "Display player names in bold.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false
  });
  game.settings.register("foundrystreamoverlay", "nameFontColor", {
    name: "Name Font Colour",
    hint: "Font colour for player names.",
    scope: "client",
    type: String,
    default: "#000000",
    config: false
  });

  // Styling for HP numbers.
  game.settings.register("foundrystreamoverlay", "numberFontSize", {
    name: "Number Font Size",
    hint: "Font size for HP numbers (in pixels).",
    scope: "client",
    type: Number,
    default: 16,
    config: false
  });
  game.settings.register("foundrystreamoverlay", "numberBold", {
    name: "Number Bold",
    hint: "Display HP numbers in bold.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false
  });
  game.settings.register("foundrystreamoverlay", "numberFontColor", {
    name: "Number Font Colour",
    hint: "Font colour for HP numbers.",
    scope: "client",
    type: String,
    default: "#000000",
    config: false
  });

  // 3) Register JSON setting for actor positions.
  game.settings.register("foundrystreamoverlay", "layoutData", {
    name: "Layout Data",
    hint: "Stores each actor's top/left coordinates.",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });

  // 4) Register Layout Config form.
  game.settings.registerMenu("foundrystreamoverlay", "layoutConfigMenu", {
    name: "Configure Layout & Display",
    label: "Configure Layout",
    hint: "Position each actor's overlay element and set styling options.",
    icon: "fas fa-map-pin",
    type: LayoutConfig,
    restricted: false
  });

  // 5) Register Overlay Window Opener form.
  game.settings.registerMenu("foundrystreamoverlay", "openOverlayWindow", {
    name: "Open Overlay Window",
    label: "Open Overlay",
    hint: "Manually open the overlay in a separate window.",
    icon: "fas fa-external-link-alt",
    type: OverlayWindowOpener,
    restricted: false
  });
});

/**
 * The main overlay application.
 * Renders the overlay using the template.
 * The "no-header" class hides Foundry's default window chrome.
 */
class FoundryStreamOverlay extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "foundry-stream-overlay",
      title: "Foundry Stream Overlay",
      template: "modules/foundrystreamoverlay/templates/foundrystreamoverlay.html",
      width: 800,
      height: 600,
      resizable: true,
      minimisable: false,
      popOut: true,
      classes: ["foundry-stream-overlay", "no-header"]
    });
  }

  getData() {
    const backgroundColour = game.settings.get("foundrystreamoverlay", "backgroundColour");
    const nameFontSize = game.settings.get("foundrystreamoverlay", "nameFontSize") + "px";
    const nameFontColor = game.settings.get("foundrystreamoverlay", "nameFontColor");
    // Convert bold booleans to CSS valid values.
    const nameBold = game.settings.get("foundrystreamoverlay", "nameBold") ? "bold" : "normal";
    const numberFontSize = game.settings.get("foundrystreamoverlay", "numberFontSize") + "px";
    const numberFontColor = game.settings.get("foundrystreamoverlay", "numberFontColor");
    const numberBold = game.settings.get("foundrystreamoverlay", "numberBold") ? "bold" : "normal";
    const showNames = game.settings.get("foundrystreamoverlay", "showNames");
    const hideMaxHP = game.settings.get("foundrystreamoverlay", "hideMaxHP");
    const hpPath = game.settings.get("foundrystreamoverlay", "hpPath");
    const maxHpPath = game.settings.get("foundrystreamoverlay", "maxHpPath");
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};
    const hiddenActors = game.settings.get("foundrystreamoverlay", "hiddenActors") || {};

    // Get all player-owned characters.
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
    const hpData = actors.map(actor => {
      const isHidden = hiddenActors[actor.id] || false;
      const current = foundry.utils.getProperty(actor.system, hpPath) ?? "N/A";
      const max = foundry.utils.getProperty(actor.system, maxHpPath) ?? "N/A";
      const coords = layoutData[actor.id] || { top: 0, left: 0 };
      return {
        id: actor.id,
        name: actor.name,
        current,
        max,
        top: coords.top,
        left: coords.left,
        hidden: isHidden
      };
    });

    return {
      hpData,
      backgroundColour,
      nameFontSize,
      nameFontColor,
      nameBold,
      numberFontSize,
      numberFontColor,
      numberBold,
      showNames,
      hideMaxHP
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}

/**
 * LayoutConfig form: Allows configuration of:
 * - Actor positions (top/left) with a checkbox to hide each actor.
 * - Display options for names and numbers: font sizes, bold, colours, and toggles.
 * - The form stays open after saving.
 */
class LayoutConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "foundrystreamoverlay-layout-config",
      title: "Overlay Layout & Display Options",
      template: "modules/foundrystreamoverlay/templates/foundrystreamoverlay-config.html",
      width: 500,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};
    const hiddenActors = game.settings.get("foundrystreamoverlay", "hiddenActors") || {};
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
    const actorPositions = actors.map(actor => {
      const coords = layoutData[actor.id] || { top: 0, left: 0 };
      const isHidden = hiddenActors[actor.id] || false;
      return {
        id: actor.id,
        name: actor.name,
        top: coords.top,
        left: coords.left,
        hidden: isHidden
      };
    });
    // Get display options.
    const showNames = game.settings.get("foundrystreamoverlay", "showNames");
    const hideMaxHP = game.settings.get("foundrystreamoverlay", "hideMaxHP");
    const nameFontSize = game.settings.get("foundrystreamoverlay", "nameFontSize");
    const nameBold = game.settings.get("foundrystreamoverlay", "nameBold");
    const nameFontColor = game.settings.get("foundrystreamoverlay", "nameFontColor");
    const numberFontSize = game.settings.get("foundrystreamoverlay", "numberFontSize");
    const numberBold = game.settings.get("foundrystreamoverlay", "numberBold");
    const numberFontColor = game.settings.get("foundrystreamoverlay", "numberFontColor");

    return { actorPositions, showNames, hideMaxHP, nameFontSize, nameBold, nameFontColor, numberFontSize, numberBold, numberFontColor };
  }

  async _updateObject(event, formData) {
    // Initialize with defaults (false for hidden)
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
    const layoutData = {};
    const hiddenActors = {};
    for (const actor of actors) {
      layoutData[actor.id] = { top: 0, left: 0 };
      hiddenActors[actor.id] = false;
    }
    // Process formData keys.
    for (const key in formData) {
      if (key.startsWith("top-") || key.startsWith("left-") || key.startsWith("hidden-")) {
        const [type, actorId] = key.split("-");
        if (type === "top" || type === "left") {
          layoutData[actorId][type] = Number(formData[key]) || 0;
        } else if (type === "hidden") {
          hiddenActors[actorId] = true;
        }
      }
    }
    await game.settings.set("foundrystreamoverlay", "layoutData", layoutData);
    await game.settings.set("foundrystreamoverlay", "hiddenActors", hiddenActors);

    // Update display options.
    await game.settings.set("foundrystreamoverlay", "showNames", formData.showNames ? true : false);
    await game.settings.set("foundrystreamoverlay", "hideMaxHP", formData.hideMaxHP ? true : false);
    await game.settings.set("foundrystreamoverlay", "nameFontSize", Number(formData.nameFontSize) || 18);
    await game.settings.set("foundrystreamoverlay", "nameBold", formData.nameBold ? true : false);
    await game.settings.set("foundrystreamoverlay", "nameFontColor", formData.nameFontColor);
    await game.settings.set("foundrystreamoverlay", "numberFontSize", Number(formData.numberFontSize) || 16);
    await game.settings.set("foundrystreamoverlay", "numberBold", formData.numberBold ? true : false);
    await game.settings.set("foundrystreamoverlay", "numberFontColor", formData.numberFontColor);

    if (window.foundryStreamOverlayApp) {
      foundryStreamOverlayApp.render();
    }
    // Remain open for further adjustments.
  }
}

/**
 * OverlayWindowOpener form: Provides a button to manually open the overlay window.
 * This user-initiated action should not be blocked.
 */
class OverlayWindowOpener extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Open Overlay Window",
      id: "foundrystreamoverlay-open-overlay",
      template: "modules/foundrystreamoverlay/templates/open-overlay-window.html",
      width: 400
    });
  }

  getData() {
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

/**
 * Opens a new window and moves the overlay content into it.
 * This window's HTML shell is minimal and strips built-in controls.
 */
function openOverlayWindow() {
  if (!window.foundryStreamOverlayApp) {
    window.foundryStreamOverlayApp = new FoundryStreamOverlay();
    foundryStreamOverlayApp.render(true);
  }
  const overlayWindow = window.open("", "FoundryStreamOverlayWindow", "width=800,height=600,resizable=yes");
  if (overlayWindow) {
    const bg = game.settings.get("foundrystreamoverlay", "backgroundColour");
    overlayWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title></title>
        <link rel="stylesheet" type="text/css" href="modules/foundrystreamoverlay/foundrystreamoverlay.css">
        <style>
          .window-title, .window-controls { display: none !important; }
          body { margin: 0; }
        </style>
      </head>
      <body style="background-color: ${bg};">
        <div id="overlay-container"></div>
      </body>
      </html>
    `);
    overlayWindow.document.close();
    const overlayContent = document.getElementById("foundry-stream-overlay");
    if (overlayContent) {
      overlayContent.parentNode.removeChild(overlayContent);
      const container = overlayWindow.document.getElementById("overlay-container");
      if (container) {
        container.appendChild(overlayContent);
        // Extra removal of any potential close controls:
        overlayWindow.document.querySelectorAll(".window-controls").forEach(el => el.remove());
      }
    }
  } else {
    ui.notifications.warn("Popup blocked! Please allow popups for Foundry.");
  }
}

/**
 * Re-render the overlay when an actor's data is updated.
 */
Hooks.on("updateActor", (actor, update, options, userId) => {
  if (actor.hasPlayerOwner && actor.type === "character" && window.foundryStreamOverlayApp) {
    foundryStreamOverlayApp.render();
  }
});
