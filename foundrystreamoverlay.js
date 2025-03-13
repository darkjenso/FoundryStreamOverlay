/**
 * Foundry Stream Overlay (V12)
 * Displays a green‐screen overlay of player characters' HP,
 * allowing users to position each HP element for streaming.
 *
 * Includes:
 * - HP path & Max HP path in normal Module Settings (config: true).
 * - Bold All Text toggle, Show Max HP toggle, Show Names toggle, Hide Actors individually.
 * - Uses the "renderFoundryStreamOverlay" hook for single-click opening of the popup.
 */

// -----------------------------------------
// 1) Register Settings in Hooks.once("init")
// -----------------------------------------
Hooks.once("init", () => {

  // These three settings will show up in Module Settings (because config: true):
  game.settings.register("foundrystreamoverlay", "hpPath", {
    name: "HP Path",
    hint: "Path to the current HP value in the actor's system data (e.g. attributes.hp.value).",
    scope: "world",
    type: String,
    default: "attributes.hp.value",
    config: true,
    restricted: true
  });

  game.settings.register("foundrystreamoverlay", "maxHpPath", {
    name: "Max HP Path",
    hint: "Path to the maximum HP value in the actor's system data (e.g. attributes.hp.max).",
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

  // These settings do NOT appear in the standard list (config: false),
  // but are shown/edited in your custom "Layout Config" submenu.
  game.settings.register("foundrystreamoverlay", "fontSize", {
    name: "Font Size",
    hint: "Font size for the overlay text (in pixels).",
    scope: "client",
    type: Number,
    default: 16,
    config: false
  });

  game.settings.register("foundrystreamoverlay", "showNames", {
    name: "Show Player Names",
    hint: "If enabled, the overlay displays the player's name along with their HP.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false
  });

  game.settings.register("foundrystreamoverlay", "fontFamily", {
    name: "Font Family",
    hint: "The font family for the overlay text.",
    scope: "client",
    type: String,
    default: "Arial, sans-serif",
    config: false
  });

  game.settings.register("foundrystreamoverlay", "fontColor", {
    name: "Font Colour",
    hint: "The font colour for the overlay text.",
    scope: "client",
    type: String,
    default: "#000000",
    config: false
  });

  game.settings.register("foundrystreamoverlay", "showMaxHP", {
    name: "Show Max HP",
    hint: "If enabled, displays the max HP. If disabled, only current HP is shown.",
    scope: "client",
    type: Boolean,
    default: true,
    config: false
  });

  game.settings.register("foundrystreamoverlay", "boldAll", {
    name: "Bold All Text",
    hint: "If enabled, the actor names and HP values will be wrapped in <strong>.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false
  });

  // Layout Data (positions & hidden flags) stored in a single object
  game.settings.register("foundrystreamoverlay", "layoutData", {
    name: "Layout Data",
    hint: "Stores each actor's coordinates & hidden state.",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });

  // Submenu for Layout Config
  game.settings.registerMenu("foundrystreamoverlay", "layoutConfigMenu", {
    name: "Configure Layout & Display",
    label: "Configure Layout",
    hint: "Position each actor's HP element and set display options.",
    icon: "fas fa-map-pin",
    type: LayoutConfig,
    restricted: false
  });

  // Submenu for Opening the Overlay Window
  game.settings.registerMenu("foundrystreamoverlay", "openOverlayWindow", {
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
    const fontSize   = game.settings.get("foundrystreamoverlay", "fontSize") + "px";
    const fontFamily = game.settings.get("foundrystreamoverlay", "fontFamily");
    const fontColor  = game.settings.get("foundrystreamoverlay", "fontColor");
    const showNames  = game.settings.get("foundrystreamoverlay", "showNames");
    const boldAll    = game.settings.get("foundrystreamoverlay", "boldAll");
    const showMaxHP  = game.settings.get("foundrystreamoverlay", "showMaxHP");
    const hpPath     = game.settings.get("foundrystreamoverlay", "hpPath");
    const maxHpPath  = game.settings.get("foundrystreamoverlay", "maxHpPath");
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};

    // Get all player-owned characters
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");

    // Build a data array with each actor's position & HP, skipping hidden
    const hpData = actors
      .map(actor => {
        const coords = layoutData[actor.id] || { top: 0, left: 0, hide: false };
        if (coords.hide) return null; // If "hide" is true, skip this actor

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
      .filter(data => data !== null); // remove any null (hidden) entries

    return {
      hpData,
      backgroundColour,
      fontSize,
      fontFamily,
      fontColor,
      showNames,
      boldAll,
      showMaxHP
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Typically no extra listeners needed unless you add dragging or click events
  }
}

// -----------------------------------------
// 3) Layout Config Form
// -----------------------------------------
class LayoutConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "foundrystreamoverlay-layout-config",
      title: "Stream Overlay Layout & Display Options",
      template: "modules/foundrystreamoverlay/templates/foundrystreamoverlay-config.html",
      width: 400,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");

    // Build a table of each actor's top/left + hide
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

    // Other display settings
    const showNames  = game.settings.get("foundrystreamoverlay", "showNames");
    const fontFamily = game.settings.get("foundrystreamoverlay", "fontFamily");
    const fontColor  = game.settings.get("foundrystreamoverlay", "fontColor");
    const fontSize   = game.settings.get("foundrystreamoverlay", "fontSize");
    const showMaxHP  = game.settings.get("foundrystreamoverlay", "showMaxHP");
    const boldAll    = game.settings.get("foundrystreamoverlay", "boldAll");

    return {
      actorPositions,
      showNames,
      fontFamily,
      fontColor,
      fontSize,
      showMaxHP,
      boldAll
    };
  }

  async _updateObject(event, formData) {
    // Reconstruct layoutData
    const layoutData = {};

    for (const key in formData) {
      // e.g. top-<actorId> or left-<actorId>
      if (key.startsWith("top-") || key.startsWith("left-")) {
        const [type, actorId] = key.split("-");
        if (!layoutData[actorId]) layoutData[actorId] = { top: 0, left: 0, hide: false };
        layoutData[actorId][type] = Number(formData[key]) || 0;
      }

      // e.g. hide-<actorId>
      if (key.startsWith("hide-")) {
        const actorId = key.split("hide-")[1];
        if (!layoutData[actorId]) layoutData[actorId] = { top: 0, left: 0, hide: false };
        layoutData[actorId].hide = formData[key] ? true : false;
      }
    }

    await game.settings.set("foundrystreamoverlay", "layoutData", layoutData);

    // Save display settings
    await game.settings.set("foundrystreamoverlay", "showNames",  formData.showNames ? true : false);
    await game.settings.set("foundrystreamoverlay", "fontFamily", formData.fontFamily);
    await game.settings.set("foundrystreamoverlay", "fontColor",  formData.fontColor);
    await game.settings.set("foundrystreamoverlay", "fontSize",   Number(formData.fontSize) || 16);

    await game.settings.set("foundrystreamoverlay", "showMaxHP", formData.showMaxHP ? true : false);
    await game.settings.set("foundrystreamoverlay", "boldAll",   formData.boldAll ? true : false);

    // If the overlay is already open, re-render it so changes show immediately
    if (window.foundryStreamOverlayApp) {
      foundryStreamOverlayApp.render();
    }

    // We keep the form open by not calling this.close()
  }
}

// -----------------------------------------
// 4) "Open Overlay" Button Form
// -----------------------------------------
class OverlayWindowOpener extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Open Overlay Window",
      id: "foundrystreamoverlay-open-overlay",
      template: "modules/foundrystreamoverlay/templates/open-overlay-window.html",
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
    // Not used
  }
}

// -----------------------------------------
// 5) openOverlayWindow() - Single-Click w/ Hook
// -----------------------------------------
function openOverlayWindow() {
  // 1) Open the new popup window immediately.
  const overlayWindow = window.open(
    "",
    "FoundryStreamOverlayWindow",
    "width=800,height=600,resizable=yes"
  );

  if (!overlayWindow) {
    ui.notifications.warn("Popup blocked! Please allow popups for Foundry.");
    return;
  }

  // 2) Create a brand-new overlay application each time we open it.
  const overlayApp = new FoundryStreamOverlay();

  // 3) Use the "renderFoundryStreamOverlay" hook to wait for the app's HTML to finish rendering.
  Hooks.once("renderFoundryStreamOverlay", (app, html) => {
    // Insert a basic HTML skeleton for the new popup:
    const bg = game.settings.get("foundrystreamoverlay", "backgroundColour");
    overlayWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Foundry Stream Overlay</title>
        <link rel="stylesheet" href="modules/foundrystreamoverlay/foundrystreamoverlay.css">
      </head>
      <body style="background-color: ${bg}; margin: 0;">
        <div id="overlay-container"></div>
      </body>
      </html>
    `);
    overlayWindow.document.close();

    // Move the newly rendered overlay HTML into #overlay-container in the popup
    const container = overlayWindow.document.getElementById("overlay-container");
    if (container) container.appendChild(html[0]);
  });

  // 4) Render the app. Once done, the hook above fires.
  overlayApp.render(true);

  // Optionally store references so we can re-render or close later
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
