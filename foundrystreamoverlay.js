/**
 * Foundry Stream Overlay (V12)
 * Displays a green-screen overlay of player characters' HP,
 * allowing users to position each HP element for streaming.
 *
 * New Features:
 * - Heart icon layered behind HP text (adjustable in Layout Config).
 * - Custom heart image and size (stored in layoutData).
 * - File Picker for choosing a heart image.
 * - "Open Overlay" button restored to Module Settings.
 */

const MODULE_ID = "foundrystreamoverlay";

// -----------------------------------------
// 1) Register Settings in Hooks.once("init")
// -----------------------------------------
Hooks.once("init", () => {
  // Standard settings in Foundry's Module Settings
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

  // Layout Data (positions, hidden flags, and heart settings)
  game.settings.register(MODULE_ID, "layoutData", {
    name: "Layout Data",
    hint: "Stores each actor's coordinates, hidden state, and heart icon settings.",
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
    return mergeObject(super.defaultOptions, {
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
    // Load global settings
    const backgroundColour = game.settings.get(MODULE_ID, "backgroundColour");
    const hpPath = game.settings.get(MODULE_ID, "hpPath");
    const maxHpPath = game.settings.get(MODULE_ID, "maxHpPath");
    const layoutData = game.settings.get(MODULE_ID, "layoutData") || {};

    // Get all player-owned characters
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");

    // Build HP data array, checking layoutData for positioning & visibility
    const hpData = actors.map(actor => {
      const coords = layoutData[actor.id] || { top: 0, left: 0, hide: false };
      if (coords.hide) return null;

      return {
        id: actor.id,
        name: actor.name,
        current: foundry.utils.getProperty(actor.system, hpPath) ?? "N/A",
        max: foundry.utils.getProperty(actor.system, maxHpPath) ?? "N/A",
        top: coords.top,
        left: coords.left
      };
    }).filter(a => a !== null);

    return {
      hpData,
      backgroundColour,
      layoutData
    };
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
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-config.html`,
      width: 400,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const layoutData = game.settings.get(MODULE_ID, "layoutData") || {};
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");

    return {
      actorPositions: actors.map(actor => {
        const coords = layoutData[actor.id] || { top: 0, left: 0, hide: false };
        return { id: actor.id, name: actor.name, ...coords };
      }),
      layoutData
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // FilePicker for heart image
    html.find("button.file-picker[data-target='heartImage']").click(ev => {
      new FilePicker({
        type: "image",
        current: game.settings.get(MODULE_ID, "layoutData")?.heartImage || "modules/foundrystreamoverlay/heart.webp",
        callback: path => html.find("input[name='heartImage']").val(path)
      }).browse();
    });

    // Update range slider value
    html.find("input#heartSize").on("input", event => {
      html.find(".range-value").text(`${event.target.value} px`);
    });
  }

  async _updateObject(event, formData) {
    const layoutData = game.settings.get(MODULE_ID, "layoutData") || {};
    
    // Store actor positioning & visibility
    for (const key in formData) {
      if (key.startsWith("top-") || key.startsWith("left-")) {
        const [type, actorId] = key.split("-");
        layoutData[actorId] = layoutData[actorId] || { top: 0, left: 0, hide: false };
        layoutData[actorId][type] = Number(formData[key]) || 0;
      }
      if (key.startsWith("hide-")) {
        const actorId = key.split("hide-")[1];
        layoutData[actorId] = layoutData[actorId] || { top: 0, left: 0, hide: false };
        layoutData[actorId].hide = formData[key] ? true : false;
      }
    }

    // Store heart settings inside layoutData
    layoutData.showHeart = formData.showHeart ? true : false;
    layoutData.heartImage = formData.heartImage || "modules/foundrystreamoverlay/heart.webp";
    layoutData.heartSize = Number(formData.heartSize) || 32;

    await game.settings.set(MODULE_ID, "layoutData", layoutData);

    // Refresh overlay
    if (window.foundryStreamOverlayApp) foundryStreamOverlayApp.render();
  }
}

// -----------------------------------------
// 4) Open Overlay Window Form
// -----------------------------------------
class OverlayWindowOpener extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Open Overlay Window",
      id: "foundrystreamoverlay-open-overlay",
      template: `modules/${MODULE_ID}/templates/open-overlay-window.html`,
      width: 400
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[name='open-overlay']").click(() => openOverlayWindow());
  }
}

// -----------------------------------------
// 5) Update overlay on actor changes
// -----------------------------------------
Hooks.on("updateActor", (actor) => {
  if (actor.hasPlayerOwner && actor.type === "character" && window.foundryStreamOverlayApp) {
    foundryStreamOverlayApp.render();
  }
});
