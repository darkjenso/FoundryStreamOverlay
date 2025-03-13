/**
 * Foundry Stream Overlay (V12)
 * Displays a green‐screen overlay of player characters' HP,
 * allowing users to position each HP element for streaming.
 * 
 * New features:
 * - Option to show/hide player names.
 * - Option to choose a custom font family and font colour.
 * - A manual button (via the settings menu) to open the overlay
 *   in a separate window (user-initiated to avoid popup blockers).
 */

Hooks.once("init", () => {
  // 1) Register basic settings for HP paths & styling.
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

  game.settings.register("foundrystreamoverlay", "fontSize", {
    name: "Font Size",
    hint: "Font size for the overlay text (e.g. '16px').",
    scope: "client",
    type: String,
    default: "16px",
    config: true
  });
  
  // New settings: show names, font family, and font colour.
  game.settings.register("foundrystreamoverlay", "showNames", {
    name: "Show Player Names",
    hint: "If enabled, the overlay displays the player's name along with their HP.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false  // We'll manage this in the layout config.
  });
  
  game.settings.register("foundrystreamoverlay", "fontFamily", {
    name: "Font Family",
    hint: "The font family for the overlay text.",
    scope: "client",
    type: String,
    default: "Arial, sans-serif",
    config: false  // Managed via layout config.
  });
  
  game.settings.register("foundrystreamoverlay", "fontColor", {
    name: "Font Colour",
    hint: "The font colour for the overlay text.",
    scope: "client",
    type: String,
    default: "#000000",
    config: false  // Managed via layout config.
  });

  // 2) Register a JSON setting for storing layout data (actor positions).
  game.settings.register("foundrystreamoverlay", "layoutData", {
    name: "Layout Data",
    hint: "Stores each actor's top/left coordinates in JSON. Managed via 'Configure Layout' button.",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });

  // 3) Register a Settings Submenu for configuring actor positions and display options.
  game.settings.registerMenu("foundrystreamoverlay", "layoutConfigMenu", {
    name: "Configure Layout & Display",
    label: "Configure Layout",
    hint: "Position each actor's HP element on the overlay, and set display options.",
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
 * Note: We add the "no-header" class to hide the default header.
 */
class FoundryStreamOverlay extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "foundry-stream-overlay",
      title: "Foundry Stream Overlay", // Not shown if header is hidden.
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
    const fontSize = game.settings.get("foundrystreamoverlay", "fontSize");
    const fontFamily = game.settings.get("foundrystreamoverlay", "fontFamily");
    const fontColor = game.settings.get("foundrystreamoverlay", "fontColor");
    const showNames = game.settings.get("foundrystreamoverlay", "showNames");
    const hpPath = game.settings.get("foundrystreamoverlay", "hpPath");
    const maxHpPath = game.settings.get("foundrystreamoverlay", "maxHpPath");
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};

    // Get all player-owned characters.
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
    const hpData = actors.map(actor => {
      const current = foundry.utils.getProperty(actor.system, hpPath) ?? "N/A";
      const max = foundry.utils.getProperty(actor.system, maxHpPath) ?? "N/A";
      const coords = layoutData[actor.id] || { top: 0, left: 0 };
      return {
        id: actor.id,
        name: actor.name,
        current,
        max,
        top: coords.top,
        left: coords.left
      };
    });

    return { hpData, backgroundColour, fontSize, fontFamily, fontColor, showNames };
  }

  activateListeners(html) {
    super.activateListeners(html);
    // No extra listeners needed.
  }
}

/**
 * A FormApplication that lets users configure each actor's position and display options.
 * This form now includes inputs for:
 * - Actor positions (top/left)
 * - Show/hide player names (checkbox)
 * - Font Family (text)
 * - Font Colour (text)
 */
class LayoutConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "foundrystreamoverlay-layout-config",
      title: "Stream Overlay Layout & Display Options",
      template: "modules/foundrystreamoverlay/templates/foundrystreamoverlay-config.html",
      width: 400,
      height: "auto",
      closeOnSubmit: true
    });
  }

  getData() {
    // Retrieve current layout data.
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
    const actorPositions = actors.map(actor => {
      const coords = layoutData[actor.id] || { top: 0, left: 0 };
      return {
        id: actor.id,
        name: actor.name,
        top: coords.top,
        left: coords.left
      };
    });
    // Also fetch display options.
    const showNames = game.settings.get("foundrystreamoverlay", "showNames");
    const fontFamily = game.settings.get("foundrystreamoverlay", "fontFamily");
    const fontColor = game.settings.get("foundrystreamoverlay", "fontColor");

    return { actorPositions, showNames, fontFamily, fontColor };
  }

  async _updateObject(event, formData) {
    // Reconstruct layout data.
    const layoutData = {};
    for (const key in formData) {
      if (key.startsWith("top-") || key.startsWith("left-")) {
        const [type, actorId] = key.split("-");
        if (!layoutData[actorId]) layoutData[actorId] = { top: 0, left: 0 };
        layoutData[actorId][type] = Number(formData[key]) || 0;
      }
    }
    await game.settings.set("foundrystreamoverlay", "layoutData", layoutData);
    // Update display options.
    await game.settings.set("foundrystreamoverlay", "showNames", formData.showNames === "on");
    await game.settings.set("foundrystreamoverlay", "fontFamily", formData.fontFamily);
    await game.settings.set("foundrystreamoverlay", "fontColor", formData.fontColor);
    // Re-render overlay if open.
    if (window.foundryStreamOverlayApp) {
      foundryStreamOverlayApp.render();
    }
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
 * This is triggered by the user clicking the button in the OverlayWindowOpener form.
 */
function openOverlayWindow() {
  if (!window.foundryStreamOverlayApp) {
    window.foundryStreamOverlayApp = new FoundryStreamOverlay();
    foundryStreamOverlayApp.render(true);
  }
  const overlayWindow = window.open("", "FoundryStreamOverlayWindow", "width=800,height=600,resizable=yes");
  if (overlayWindow) {
    // Write an HTML shell with the correct green background.
    overlayWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title></title>
        <link rel="stylesheet" type="text/css" href="modules/foundrystreamoverlay/foundrystreamoverlay.css">
      </head>
      <body style="background-color: ${game.settings.get("foundrystreamoverlay", "backgroundColour")}; margin: 0;">
        <div id="overlay-container"></div>
      </body>
      </html>
    `);
    overlayWindow.document.close();
    // Move the overlay's HTML into the new window.
    const overlayContent = document.getElementById("foundry-stream-overlay");
    if (overlayContent) {
      overlayContent.parentNode.removeChild(overlayContent);
      const container = overlayWindow.document.getElementById("overlay-container");
      if (container) container.appendChild(overlayContent);
    }
  } else {
    ui.notifications.warn("Popup blocked! Please allow popups for Foundry.");
  }
}

/**
 * Re-render the overlay whenever actor data is updated.
 */
Hooks.on("updateActor", (actor, update, options, userId) => {
  if (actor.hasPlayerOwner && actor.type === "character" && window.foundryStreamOverlayApp) {
    foundryStreamOverlayApp.render();
  }
});
