/**
 * Foundry Stream Overlay (V12)
 * Displays a green‐screen overlay of player characters' HP, 
 * allowing users to position each HP element for streaming.
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

  // 2) Register a JSON setting for storing layout data
  //    This will hold top/left positions for each actor ID.
  game.settings.register("foundrystreamoverlay", "layoutData", {
    name: "Layout Data",
    hint: "Stores each actor's top/left coordinates in JSON. Managed via 'Configure Layout' button.",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });

  // 3) Register a Settings Submenu to open the LayoutConfig FormApplication
  game.settings.registerMenu("foundrystreamoverlay", "layoutConfigMenu", {
    name: "Configure Layout",
    label: "Configure Layout",
    hint: "Position each actor's HP element on the overlay.",
    icon: "fas fa-map-pin",
    type: LayoutConfig,
    restricted: false
  });
});

/**
 * The main overlay application. Renders a green‐screen overlay with HP entries.
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
      // Grab saved top/left from layoutData, defaulting to 0 if not found
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
    // No special listeners needed for the static overlay
    super.activateListeners(html);
  }
}

// Render the overlay when Foundry is ready
Hooks.once("ready", () => {
  window.foundryStreamOverlayApp = new FoundryStreamOverlay();
  foundryStreamOverlayApp.render(true);
});

// Re-render the overlay whenever an actor's data is updated
Hooks.on("updateActor", (actor, update, options, userId) => {
  if (actor.hasPlayerOwner && actor.type === "character") {
    if (window.foundryStreamOverlayApp) {
      foundryStreamOverlayApp.render();
    }
  }
});

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
    // Current layout data from settings
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};
    // All player-owned characters
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
    
    // Build a data array for the form
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
    // The form data will be a flat object:
    // { "top-<actorID>": number, "left-<actorID>": number, ... }
    // We need to reconstruct layoutData from these keys.
    const layoutData = {};
    
    for (const key in formData) {
      const [type, actorId] = key.split("-");
      if (!layoutData[actorId]) layoutData[actorId] = { top: 0, left: 0 };
      layoutData[actorId][type] = Number(formData[key]) || 0;
    }

    // Save updated layout to settings
    await game.settings.set("foundrystreamoverlay", "layoutData", layoutData);

    // Re-render the overlay so positions update immediately
    if (window.foundryStreamOverlayApp) {
      foundryStreamOverlayApp.render();
    }
  }
}
