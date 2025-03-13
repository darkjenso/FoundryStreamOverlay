/**
 * Foundry Stream Overlay (Simple Version)
 * Displays a green‐screen overlay of player characters' HP for streaming,
 * with options to position elements and adjust a uniform text style.
 *
 * Options:
 * - Toggle to show/hide player names.
 * - Toggle to hide max HP.
 * - Uniform text styling: font size, bold, font colour.
 * - Configure actor positions.
 */

Hooks.once("init", () => {
  // HP paths and background.
  game.settings.register("foundrystreamoverlay", "hpPath", {
    name: "HP Path",
    hint: "Path to current HP (e.g. attributes.hp.value).",
    scope: "world",
    type: String,
    default: "attributes.hp.value",
    config: true,
    restricted: true
  });
  game.settings.register("foundrystreamoverlay", "maxHpPath", {
    name: "Max HP Path",
    hint: "Path to maximum HP (e.g. attributes.hp.max).",
    scope: "world",
    type: String,
    default: "attributes.hp.max",
    config: true,
    restricted: true
  });
  game.settings.register("foundrystreamoverlay", "backgroundColour", {
    name: "Background Colour",
    hint: "Overlay background colour (for chroma keying).",
    scope: "client",
    type: String,
    default: "#00ff00",
    config: true
  });
  
  // Uniform text styling options.
  game.settings.register("foundrystreamoverlay", "textFontSize", {
    name: "Text Font Size",
    hint: "Uniform font size (in pixels).",
    scope: "client",
    type: Number,
    default: 16,
    config: false
  });
  game.settings.register("foundrystreamoverlay", "textBold", {
    name: "Text Bold",
    hint: "Display overlay text in bold.",
    scope: "client",
    type: Boolean,
    default: false,
    config: false
  });
  game.settings.register("foundrystreamoverlay", "textFontColor", {
    name: "Text Font Colour",
    hint: "Uniform font colour.",
    scope: "client",
    type: String,
    default: "#000000",
    config: false
  });
  
  // Display options.
  game.settings.register("foundrystreamoverlay", "showNames", {
    name: "Show Player Names",
    hint: "Display player names along with their HP.",
    scope: "client",
    type: Boolean,
    default: true,
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
  
  // Layout data.
  game.settings.register("foundrystreamoverlay", "layoutData", {
    name: "Layout Data",
    hint: "Stores each actor's top/left coordinates.",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });
  game.settings.register("foundrystreamoverlay", "hiddenActors", {
    name: "Hidden Actors",
    hint: "Stores actor IDs mapped to hidden (true/false).",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });
  
  // Register Layout Config form.
  game.settings.registerMenu("foundrystreamoverlay", "layoutConfigMenu", {
    name: "Configure Layout",
    label: "Configure Layout",
    hint: "Position each actor's overlay element and set text style.",
    icon: "fas fa-map-pin",
    type: LayoutConfig,
    restricted: false
  });
  
  // Register Overlay Window Opener.
  game.settings.registerMenu("foundrystreamoverlay", "openOverlayWindow", {
    name: "Open Overlay Window",
    label: "Open Overlay",
    hint: "Manually open the overlay in a separate window.",
    icon: "fas fa-external-link-alt",
    type: OverlayWindowOpener,
    restricted: false
  });
});

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
    const textFontSize = game.settings.get("foundrystreamoverlay", "textFontSize") + "px";
    const textFontColor = game.settings.get("foundrystreamoverlay", "textFontColor");
    const textBold = game.settings.get("foundrystreamoverlay", "textBold") ? "bold" : "normal";
    const showNames = game.settings.get("foundrystreamoverlay", "showNames");
    const hideMaxHP = game.settings.get("foundrystreamoverlay", "hideMaxHP");
    const hpPath = game.settings.get("foundrystreamoverlay", "hpPath");
    const maxHpPath = game.settings.get("foundrystreamoverlay", "maxHpPath");
    const layoutData = game.settings.get("foundrystreamoverlay", "layoutData") || {};
    const hiddenActors = game.settings.get("foundrystreamoverlay", "hiddenActors") || {};
    
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
      textFontSize,
      textFontColor,
      textBold,
      showNames,
      hideMaxHP
    };
  }
  activateListeners(html) {
    super.activateListeners(html);
  }
}

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
    const showNames = game.settings.get("foundrystreamoverlay", "showNames");
    const hideMaxHP = game.settings.get("foundrystreamoverlay", "hideMaxHP");
    const textFontSize = game.settings.get("foundrystreamoverlay", "textFontSize");
    const textBold = game.settings.get("foundrystreamoverlay", "textBold");
    const textFontColor = game.settings.get("foundrystreamoverlay", "textFontColor");
    return { actorPositions, showNames, hideMaxHP, textFontSize, textBold, textFontColor };
  }
  async _updateObject(event, formData) {
    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");
    const layoutData = {};
    const hiddenActors = {};
    for (const actor of actors) {
      layoutData[actor.id] = { top: 0, left: 0 };
      hiddenActors[actor.id] = false;
    }
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
    await game.settings.set("foundrystreamoverlay", "showNames", formData.showNames ? true : false);
    await game.settings.set("foundrystreamoverlay", "hideMaxHP", formData.hideMaxHP ? true : false);
    await game.settings.set("foundrystreamoverlay", "textFontSize", Number(formData.textFontSize) || 16);
    await game.settings.set("foundrystreamoverlay", "textBold", formData.textBold ? true : false);
    await game.settings.set("foundrystreamoverlay", "textFontColor", formData.textFontColor);
    if (window.foundryStreamOverlayApp) {
      foundryStreamOverlayApp.render();
    }
  }
}

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
        overlayWindow.document.querySelectorAll(".window-controls").forEach(el => el.remove());
      }
    }
  } else {
    ui.notifications.warn("Popup blocked! Please allow popups for Foundry.");
  }
}

Hooks.on("updateActor", (actor, update, options, userId) => {
  if (actor.hasPlayerOwner && actor.type === "character" && window.foundryStreamOverlayApp) {
    foundryStreamOverlayApp.render();
  }
});
