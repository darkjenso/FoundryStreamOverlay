/**
 * Foundry Stream Overlay (V12)
 * Displays a green‐screen overlay of player characters' HP,
 * allowing users to position each HP element for streaming.
 *
 * Now includes:
 * - Toggle for "Bold All Text" (boldAll).
 * - Checkbox to hide each actor individually.
 * - Checkbox to hide max HP entirely (showMaxHP).
 */

Hooks.once("init", () => {
  // 1) Register basic settings for HP paths & background.
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

  // Remove fontSize from main settings by setting config:false; it will now be managed in Layout Config.
  game.settings.register("foundrystreamoverlay", "fontSize", {
    name: "Font Size",
    hint: "Font size for the overlay text (in pixels).",
    scope: "client",
    type: Number,
    default: 16,
    config: false
  });

  // New settings to be managed via Layout Config.
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

  // -------------------------
  // NEW: Show/hide Max HP
  // -------------------------
  game.settings.register("foundrystreamoverlay", "showMaxHP", {
    name: "Show Max HP",
    hint: "If enabled, displays the max HP after the slash. If disabled, only current HP is shown.",
    scope: "client",
    type: Boolean,
    default: true,
    config: false
  });

  // -------------------------
  // NEW: Bold all text
  // -------------------------
  game.settings.register("foundrystreamoverlay", "boldAll", {
    name: "Bold All Text",
    hint: "If enabled, the actor names and HP values will both be bold.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false
  });

  // 2) Register a JSON setting for storing layout data (actor positions, hidden flags).
  game.settings.register("foundrystreamoverlay", "layoutData", {
    name: "Layout Data",
    hint: "Stores each actor's top/left coordinates in JSON. Managed via the Layout Config form.",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });

  // 3) Register a Settings Submenu for configuring actor positions and display options.
  game.settings.registerMenu("foundrystreamoverlay", "layoutConfigMenu", {
    name: "Configure Layout & Display",
    label: "Configure Layout",
    hint: "Position each actor's HP element on the overlay and set display options.",
    icon: "fas fa-map-pin",
    type: LayoutConfig,
    restricted: false
  });

  // 4) Register a Settings Submenu to manually open the overlay window.
  game.settings.registerMenu("foundrystreamoverlay", "openOverlayWindow", {
    name: "Open Overlay Window",
    label: "Open Overlay",
    hint: "Manually open the overlay in a separate pop-up window.",
    icon: "fas fa-external-link-alt",
    type: OverlayWindowOpener,
    restricted: false
  });
});

/**
 * The main overlay application.
 * Renders the green-screen overlay with HP entries.
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
      classes: ["foundry-stream-overlay", "no-header"] // no-header can be used to hide the default window chrome
    });
  }

  getData() {
    const backgroundColour = game.settings.get("foundrystreamoverlay", "backgroundColour");
    // Get fontSize as a number and then add "px" for inline style.
    const fontSize = game.settings.get("foundrystreamoverlay", "fontSize") + "px";
    const fontFamily = game.settings.get("foundrystreamoverlay", "fontFamily");
    const fontColor = game.settings.get("foundrystreamoverlay", "fontColor");
    const showNames = game.settings.get("foundrystreamoverlay", "showNames");
    const boldAll = game.settings.get("foundrystreamoverlay", "boldAll");       // NEW
    const showMaxHP = game.settings.get("foundrystreamoverlay", "showMaxHP");   // NEW
    const hpPath = game.settings.get("foundrystreamoverlay", "hpPath");
    const maxHpPath = game.settings.get("foundrystreamoverlay", "maxHpPath");
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};

    // Get all player-owned characters.
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
    const hpData = actors
      .map(actor => {
        const coords = layoutData[actor.id] || { top: 0, left: 0, hide: false };
        // If there's no 'hide' property yet, default false
        const hidden = coords.hide || false;
        if (hidden) return null;  // Skip if hidden is true

        const current = foundry.utils.getProperty(actor.system, hpPath) ?? "N/A";
        const max = foundry.utils.getProperty(actor.system, maxHpPath) ?? "N/A";
        return {
          id: actor.id,
          name: actor.name,
          current,
          max,
          top: coords.top,
          left: coords.left
        };
      })
      .filter(data => data !== null);  // Remove hidden entries

    return {
      hpData,
      backgroundColour,
      fontSize,
      fontFamily,
      fontColor,
      showNames,
      boldAll,   // Pass these to template
      showMaxHP  // Pass these to template
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    // No additional listeners needed.
  }
}

/**
 * A FormApplication that lets users configure actor positions and display options.
 */
class LayoutConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "foundrystreamoverlay-layout-config",
      title: "Stream Overlay Layout & Display Options",
      template: "modules/foundrystreamoverlay/templates/foundrystreamoverlay-config.html",
      width: 400,
      height: "auto",
      closeOnSubmit: false // Do not close automatically so you can continue fiddling.
    });
  }

  getData() {
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
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
    // Fetch display options.
    const showNames = game.settings.get("foundrystreamoverlay", "showNames");
    const fontFamily = game.settings.get("foundrystreamoverlay", "fontFamily");
    const fontColor = game.settings.get("foundrystreamoverlay", "fontColor");
    const fontSize = game.settings.get("foundrystreamoverlay", "fontSize");

    // NEW
    const showMaxHP = game.settings.get("foundrystreamoverlay", "showMaxHP");
    const boldAll = game.settings.get("foundrystreamoverlay", "boldAll");

    return {
      actorPositions,
      showNames,
      fontFamily,
      fontColor,
      fontSize,
      showMaxHP, // add to template
      boldAll    // add to template
    };
  }

  async _updateObject(event, formData) {
    // Reconstruct layoutData for actor positions and hidden flags.
    const layoutData = {};
    for (const key in formData) {
      // Looking for top-xxx and left-xxx
      if (key.startsWith("top-") || key.startsWith("left-")) {
        const [type, actorId] = key.split("-");
        if (!layoutData[actorId]) layoutData[actorId] = { top: 0, left: 0, hide: false };
        layoutData[actorId][type] = Number(formData[key]) || 0;
      }
      // Looking for hide-xxx
      if (key.startsWith("hide-")) {
        const actorId = key.split("hide-")[1];
        if (!layoutData[actorId]) layoutData[actorId] = { top: 0, left: 0, hide: false };
        layoutData[actorId].hide = formData[key] ? true : false;
      }
    }
    await game.settings.set("foundrystreamoverlay", "layoutData", layoutData);

    // Update display options.
    await game.settings.set("foundrystreamoverlay", "showNames", formData.showNames ? true : false);
    await game.settings.set("foundrystreamoverlay", "fontFamily", formData.fontFamily);
    await game.settings.set("foundrystreamoverlay", "fontColor", formData.fontColor);
    await game.settings.set("foundrystreamoverlay", "fontSize", Number(formData.fontSize) || 16);

    // NEW: showMaxHP and boldAll
    await game.settings.set("foundrystreamoverlay", "showMaxHP", formData.showMaxHP ? true : false);
    await game.settings.set("foundrystreamoverlay", "boldAll", formData.boldAll ? true : false);

    // Re-render the overlay if it is open.
    if (window.foundryStreamOverlayApp) {
      foundryStreamOverlayApp.render();
    }
    // Remain open (do not call this.close()).
  }
}

/**
 * A FormApplication that provides a button to manually open the overlay window.
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

/**
 * Opens a new window and moves the overlay content into it.
 * This is triggered by the user clicking the button in OverlayWindowOpener.
 */
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

  // 2) Create a new overlay application each time you call this.
  const overlayApp = new FoundryStreamOverlay();

  // 3) Wait for the "renderFoundryStreamOverlay" hook, which fires once the app's HTML is ready.
  Hooks.once("renderFoundryStreamOverlay", (app, html) => {
    // Insert a basic HTML skeleton into the new window:
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

    // Move the newly rendered overlay HTML into #overlay-container in the popup.
    const container = overlayWindow.document.getElementById("overlay-container");
    container.appendChild(html[0]);
  });

  // 4) Actually render the app. As soon as it's done, the "renderFoundryStreamOverlay" hook will fire.
  overlayApp.render(true);

  // Optional: store references globally if you like
  window.overlayWindow = overlayWindow;
  window.foundryStreamOverlayApp = overlayApp;
}

});
