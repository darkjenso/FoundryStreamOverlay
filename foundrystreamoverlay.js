const MODULE_ID = "foundrystreamoverlay";

// -----------------------------------------
// 1) Register Settings in Hooks.once("init")
// -----------------------------------------
Hooks.once("init", () => {

  // Visible in the standard Foundry Module Settings panel:
  game.settings.register(MODULE_ID, "hpPath", {
    name: "HP Path",
    hint: "Path to the current HP value in the actor's system data (e.g. attributes.hp.value).",
    scope: "world",
    type: String,
    default: "attributes.hp.value",
    config: true,
    restricted: true
  });

  game.settings.register(MODULE_ID, "maxHpPath", {
    name: "Max HP Path",
    hint: "Path to the maximum HP value in the actor's system data (e.g. attributes.hp.max).",
    scope: "world",
    type: String,
    default: "attributes.hp.max",
    config: true,
    restricted: true
  });

  game.settings.register(MODULE_ID, "backgroundColour", {
    name: "Background Colour",
    hint: "Chroma key colour for the overlay background.",
    scope: "client",
    type: String,
    default: "#00ff00",
    config: true
  });

  // Heart icon settings (config: false so they appear in Layout Config only):
  game.settings.register(MODULE_ID, "showHeart", {
    name: "Show Heart Icon",
    hint: "If enabled, a heart icon will appear under the HP text.",
    scope: "client",
    type: Boolean,
    default: true,
    config: false
  });

  game.settings.register(MODULE_ID, "heartImage", {
    name: "Heart Icon Image",
    hint: "Path to the heart icon image (e.g., modules/foundrystreamoverlay/heart.webp).",
    scope: "client",
    type: String,
    default: "modules/foundrystreamoverlay/heart.webp",
    filePicker: true,
    config: false
  });

  game.settings.register(MODULE_ID, "heartSize", {
    name: "Heart Icon Size (px)",
    hint: "Width in pixels for the heart icon. Height auto-scales to preserve aspect ratio.",
    scope: "client",
    type: Number,
    default: 32,
    config: false
  });

  // NEW setting for text offset above the heart:
  game.settings.register(MODULE_ID, "heartTextOffset", {
    name: "Heart Icon Text Offset (px)",
    hint: "How many pixels from the top of the heart icon the HP text should be placed.",
    scope: "client",
    type: Number,
    default: 8,       // you can tweak the default
    config: false
  });

  // Additional Layout Config settings:
  game.settings.register(MODULE_ID, "fontSize", {
    name: "Font Size",
    hint: "Font size for the overlay text (in pixels).",
    scope: "client",
    type: Number,
    default: 16,
    config: false
  });

  game.settings.register(MODULE_ID, "showNames", {
    name: "Show Player Names",
    hint: "If enabled, the overlay displays the player's name along with their HP.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false
  });

  game.settings.register(MODULE_ID, "fontFamily", {
    name: "Font Family",
    hint: "The font family for the overlay text.",
    scope: "client",
    type: String,
    default: "Arial, sans-serif",
    config: false
  });

  game.settings.register(MODULE_ID, "fontColor", {
    name: "Font Colour",
    hint: "The font colour for the overlay text.",
    scope: "client",
    type: String,
    default: "#000000",
    config: false
  });

  game.settings.register(MODULE_ID, "showMaxHP", {
    name: "Show Max HP",
    hint: "If enabled, displays the max HP. If disabled, only current HP is shown.",
    scope: "client",
    type: Boolean,
    default: true,
    config: false
  });

  game.settings.register(MODULE_ID, "boldAll", {
    name: "Bold All Text",
    hint: "If enabled, the actor names and HP values will be wrapped in <strong>.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false
  });

  // Layout Data (positions & hidden flags) stored in a single object
  game.settings.register(MODULE_ID, "layoutData", {
    name: "Layout Data",
    hint: "Stores each actor's coordinates & hidden state.",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });

  // Submenu for Layout Config
  game.settings.registerMenu(MODULE_ID, "layoutConfigMenu", {
    name: "Configure Layout & Display",
    label: "Configure Layout",
    hint: "Position each actor's HP element and set display options.",
    icon: "fas fa-map-pin",
    type: LayoutConfig,
    restricted: false
  });

  // Submenu for Opening the Overlay Window
  game.settings.registerMenu(MODULE_ID, "openOverlayWindow", {
    name: "Open Overlay Window",
    label: "Open Overlay",
    hint: "Manually open the overlay in a separate pop-up window.",
    icon: "fas fa-external-link-alt",
    type: OverlayWindowOpener,
    restricted: false
  });
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
    // Basic text settings
    const backgroundColour = game.settings.get(MODULE_ID, "backgroundColour");
    const fontSize   = game.settings.get(MODULE_ID, "fontSize") + "px";
    const fontFamily = game.settings.get(MODULE_ID, "fontFamily");
    const fontColor  = game.settings.get(MODULE_ID, "fontColor");
    const showNames  = game.settings.get(MODULE_ID, "showNames");
    const boldAll    = game.settings.get(MODULE_ID, "boldAll");
    const showMaxHP  = game.settings.get(MODULE_ID, "showMaxHP");
    const hpPath     = game.settings.get(MODULE_ID, "hpPath");
    const maxHpPath  = game.settings.get(MODULE_ID, "maxHpPath");
    const layoutData = game.settings.get(MODULE_ID, "layoutData") || {};

    // Heart icon settings
    const showHeart       = game.settings.get(MODULE_ID, "showHeart");
    const heartImage      = game.settings.get(MODULE_ID, "heartImage") || "modules/foundrystreamoverlay/heart.webp";
    const heartSize       = game.settings.get(MODULE_ID, "heartSize") || 32;
    const heartTextOffset = game.settings.get(MODULE_ID, "heartTextOffset") || 8;

    // Grab all player-owned characters
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");

    // Build HP data
    const hpData = actors
      .map(actor => {
        const coords = layoutData[actor.id] || { top: 0, left: 0, hide: false };
        if (coords.hide) return null; // skip hidden
        const current = foundry.utils.getProperty(actor.system, hpPath) ?? "N/A";
        const max     = foundry.utils.getProperty(actor.system, maxHpPath) ?? "N/A";
        return {
          id: actor.id,
          name: actor.name,
          current,
          max,
          top: coords.top,
          left: coords.left
        };
      })
      .filter(a => a !== null);

    return {
      hpData,
      backgroundColour,
      fontSize,
      fontFamily,
      fontColor,
      showNames,
      boldAll,
      showMaxHP,
      showHeart,
      heartImage,
      heartSize,
      heartTextOffset
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Typically no extra listeners unless you add drag/click events
  }
}

// -----------------------------------------
// 3) Layout Config Form
// -----------------------------------------
class LayoutConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "foundrystreamoverlay-layout-config",
      title: "Stream Overlay Layout & Display Options",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-config.html`,
      width: 400,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const layoutData = game.settings.get(MODULE_ID, "layoutData") || {};
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");

    // Actor positions
    const actorPositions = actors.map(actor => {
      const coords = layoutData[actor.id] || { top: 0, left: 0, hide: false };
      return {
        id: actor.id,
        name: actor.name,
        top: coords.top,
        left: coords.left,
        hide: coords.hide || false
      };
    });

    // Display options
    const showNames      = game.settings.get(MODULE_ID, "showNames");
    const fontFamily     = game.settings.get(MODULE_ID, "fontFamily");
    const fontColor      = game.settings.get(MODULE_ID, "fontColor");
    const fontSize       = game.settings.get(MODULE_ID, "fontSize");
    const showMaxHP      = game.settings.get(MODULE_ID, "showMaxHP");
    const boldAll        = game.settings.get(MODULE_ID, "boldAll");

    // Heart icon options
    const showHeart      = game.settings.get(MODULE_ID, "showHeart");
    const heartImage     = game.settings.get(MODULE_ID, "heartImage");
    const heartSize      = game.settings.get(MODULE_ID, "heartSize");
    const heartTextOffset = game.settings.get(MODULE_ID, "heartTextOffset");

    return {
      actorPositions,
      showNames,
      fontFamily,
      fontColor,
      fontSize,
      showMaxHP,
      boldAll,
      showHeart,
      heartImage,
      heartSize,
      heartTextOffset
    };
  }

  async _updateObject(event, formData) {
    // Reconstruct layoutData for actor positions
    const layoutData = {};

    for (const key in formData) {
      // top-<actorId> / left-<actorId>
      if (key.startsWith("top-") || key.startsWith("left-")) {
        const [type, actorId] = key.split("-");
        if (!layoutData[actorId]) layoutData[actorId] = { top: 0, left: 0, hide: false };
        layoutData[actorId][type] = Number(formData[key]) || 0;
      }
      // hide-<actorId>
      else if (key.startsWith("hide-")) {
        const actorId = key.replace("hide-", "");
        if (!layoutData[actorId]) layoutData[actorId] = { top: 0, left: 0, hide: false };
        layoutData[actorId].hide = formData[key] ? true : false;
      }
    }

    await game.settings.set(MODULE_ID, "layoutData", layoutData);

    // Save display settings
    await game.settings.set(MODULE_ID, "showNames",      !!formData.showNames);
    await game.settings.set(MODULE_ID, "fontFamily",     formData.fontFamily);
    await game.settings.set(MODULE_ID, "fontColor",      formData.fontColor);
    await game.settings.set(MODULE_ID, "fontSize",       Number(formData.fontSize) || 16);
    await game.settings.set(MODULE_ID, "showMaxHP",      !!formData.showMaxHP);
    await game.settings.set(MODULE_ID, "boldAll",        !!formData.boldAll);

    // Save heart icon settings
    await game.settings.set(MODULE_ID, "showHeart",      !!formData.showHeart);
    await game.settings.set(MODULE_ID, "heartImage",     formData.heartImage);
    await game.settings.set(MODULE_ID, "heartSize",      Number(formData.heartSize) || 32);

    // Save the new offset from the form
    await game.settings.set(MODULE_ID, "heartTextOffset", Number(formData.heartTextOffset) || 8);

    // Re-render if overlay is open
    if (window.foundryStreamOverlayApp) {
      foundryStreamOverlayApp.render();
    }
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
    // not used
  }
}

// -----------------------------------------
// 5) openOverlayWindow() - Single-Click w/ Hook
// -----------------------------------------
function openOverlayWindow() {
  const overlayWindow = window.open(
    "",
    "FoundryStreamOverlayWindow",
    "width=800,height=600,resizable=yes"
  );

  if (!overlayWindow) {
    ui.notifications.warn("Popup blocked! Please allow popups for Foundry.");
    return;
  }

  // Create new instance each time
  const overlayApp = new FoundryStreamOverlay();

  // Wait for the overlay's HTML to render
  Hooks.once("renderFoundryStreamOverlay", (app, html) => {
    const bg = game.settings.get(MODULE_ID, "backgroundColour");
    overlayWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Foundry Stream Overlay</title>
  <link rel="stylesheet" href="modules/${MODULE_ID}/foundrystreamoverlay.css">
</head>
<body style="background-color: ${bg}; margin: 0;">
  <div id="overlay-container"></div>
</body>
</html>`);
    overlayWindow.document.close();

    // Move the newly rendered overlay HTML into #overlay-container
    const container = overlayWindow.document.getElementById("overlay-container");
    if (container) container.appendChild(html[0]);
  });

  // Render the app
  overlayApp.render(true);

  // Store references if needed
  window.overlayWindow = overlayWindow;
  window.foundryStreamOverlayApp = overlayApp;
}

// -----------------------------------------
// 6) Update overlay on actor changes
// -----------------------------------------
Hooks.on("updateActor", (actor, update, options, userId) => {
  if (actor.hasPlayerOwner && actor.type === "character" && window.foundryStreamOverlayApp) {
    foundryStreamOverlayApp.render();
  }
});
