/**
 * Foundry Stream Overlay (V12)
 * Displays a green‐screen overlay of player characters' HP,
 * allowing users to position each HP element for streaming.
 *
 * This version does NOT open the overlay automatically.
 * Instead, it provides a manual button in module settings
 * to open the overlay in a separate window, bypassing popup blockers.
 */

Hooks.once("init", () => {
  // 1) Register basic settings for HP paths & styling
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

  // 2) Register a JSON setting for storing layout data (actor positions)
  game.settings.register("foundrystreamoverlay", "layoutData", {
    name: "Layout Data",
    hint: "Stores each actor's top/left coordinates in JSON. Managed via 'Configure Layout' button.",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });

  // 3) Register a Settings Submenu for configuring actor positions
  game.settings.registerMenu("foundrystreamoverlay", "layoutConfigMenu", {
    name: "Configure Layout",
    label: "Configure Layout",
    hint: "Position each actor's HP element on the overlay.",
    icon: "fas fa-map-pin",
    type: LayoutConfig,
    restricted: false
  });

  // 4) Register a Settings Submenu to manually open the overlay in a new window
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
 * Renders a green‐screen overlay with HP entries.
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
      classes: ["foundry-stream-overlay"]
    });
  }

  getData() {
    const backgroundColour = game.settings.get("foundrystreamoverlay", "backgroundColour");
    const fontSize = game.settings.get("foundrystreamoverlay", "fontSize");
    const hpPath = game.settings.get("foundrystreamoverlay", "hpPath");
    const maxHpPath = game.settings.get("foundrystreamoverlay", "maxHpPath");
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};

    // Get all player-owned characters
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
    const hpData = actors.map(actor => {
      const current = foundry.utils.getProperty(actor.system, hpPath) ?? "N/A";
      const max = foundry.utils.getProperty(actor.system, maxHpPath) ?? "N/A";
      // Get saved top/left positions, defaulting to 0 if not set
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

    return { hpData, backgroundColour, fontSize };
  }

  activateListeners(html) {
    super.activateListeners(html);
    // No extra listeners needed for the static overlay itself.
  }
}

/**
 * A FormApplication that lets users configure each actor's top/left coordinates.
 */
class LayoutConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "foundrystreamoverlay-layout-config",
      title: "Stream Overlay Layout",
      template: "modules/foundrystreamoverlay/templates/foundrystreamoverlay-config.html",
      width: 400,
      height: "auto",
      closeOnSubmit: true
    });
  }

  getData() {
    // Retrieve current layout data from settings.
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};
    // Get all player-owned characters.
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
    
    // Build an array for the form.
    const actorPositions = actors.map(actor => {
      const coords = layoutData[actor.id] || { top: 0, left: 0 };
      return {
        id: actor.id,
        name: actor.name,
        top: coords.top,
        left: coords.left
      };
    });
    return { actorPositions };
  }

  async _updateObject(event, formData) {
    // Reconstruct layoutData from the flat formData object.
    const layoutData = {};
    for (const key in formData) {
      const [type, actorId] = key.split("-");
      if (!layoutData[actorId]) layoutData[actorId] = { top: 0, left: 0 };
      layoutData[actorId][type] = Number(formData[key]) || 0;
    }

    // Save updated layout data.
    await game.settings.set("foundrystreamoverlay", "layoutData", layoutData);

    // If the overlay is open, re-render it so positions update.
    if (window.foundryStreamOverlayApp) {
      foundryStreamOverlayApp.render();
    }
  }
}

/**
 * A FormApplication that provides a button to manually open the overlay window.
 * This user-initiated action typically won't be blocked by browsers.
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
    // Provide any data you want displayed in the template.
    return {};
  }

  activateListeners(html) {
    super.activateListeners(html);
    // When user clicks the "Open Overlay" button, call _openOverlay
    html.find("button[name='open-overlay']").click(this._openOverlay.bind(this));
  }

  _openOverlay(event) {
    event.preventDefault();
    openOverlayWindow(); // We'll define this function below
  }

  async _updateObject(event, formData) {
    // Not needed since we only have a button
  }
}

/**
 * This function is called by the button in OverlayWindowOpener.
 * It manually opens a new window and moves the overlay content into it.
 */
function openOverlayWindow() {
  // If the overlay app hasn't been created yet, do so now.
  if (!window.foundryStreamOverlayApp) {
    window.foundryStreamOverlayApp = new FoundryStreamOverlay();
    foundryStreamOverlayApp.render(true);
  }

  // Attempt to open a new window (user-initiated).
  const overlayWindow = window.open("", "FoundryStreamOverlayWindow", "width=800,height=600,resizable=yes");
  if (overlayWindow) {
    // Write a basic HTML shell into the new window
    overlayWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Foundry Stream Overlay</title>
        <link rel="stylesheet" type="text/css" href="modules/foundrystreamoverlay/foundrystreamoverlay.css">
      </head>
      <body>
        <div id="overlay-container"></div>
      </body>
      </html>
    `);
    overlayWindow.document.close();

    // After it’s rendered, move the overlay’s HTML to the new window
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
 * Re-render the overlay whenever an actor is updated (if it's open).
 */
Hooks.on("updateActor", (actor, update, options, userId) => {
  if (actor.hasPlayerOwner && actor.type === "character" && window.foundryStreamOverlayApp) {
    foundryStreamOverlayApp.render();
  }
});
