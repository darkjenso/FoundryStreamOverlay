/**
 * Foundry Stream Overlay (V12)
 * Displays a green-screen overlay of player characters' HP,
 * allowing users to position each HP element for streaming.
 *
 * Fixes & Features:
 * - Restored both "Configure Layout" and "Open Overlay Window" buttons.
 * - Overlay now reliably opens and reopens.
 * - Heart icon settings work correctly in Layout Config.
 */

const MODULE_ID = "foundrystreamoverlay";

// -----------------------------------------
// 1) Register Settings in Hooks.once("init")
// -----------------------------------------
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing module settings...`);

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

  game.settings.register(MODULE_ID, "layoutData", {
    name: "Layout Data",
    hint: "Stores each actor's coordinates, hidden state, and heart icon settings.",
    scope: "client",
    type: Object,
    default: {},
    config: false
  });

  // ✅ REGISTER MENU BUTTON: CONFIGURE LAYOUT
  game.settings.registerMenu(MODULE_ID, "layoutConfigMenu", {
    name: "Configure Layout & Display",
    label: "Configure Layout",
    hint: "Position each actor's HP element and set display options.",
    icon: "fas fa-map-pin",
    type: LayoutConfig,
    restricted: false
  });

  // ✅ REGISTER MENU BUTTON: OPEN OVERLAY WINDOW
  game.settings.registerMenu(MODULE_ID, "openOverlayWindow", {
    name: "Open Overlay Window",
    label: "Open Overlay",
    hint: "Manually open the overlay in a separate pop-up window.",
    icon: "fas fa-external-link-alt",
    type: OverlayWindowOpener,
    restricted: false
  });

  console.log(`${MODULE_ID} | Module settings registered successfully.`);
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
    const backgroundColour = game.settings.get(MODULE_ID, "backgroundColour");
    const hpPath = game.settings.get(MODULE_ID, "hpPath");
    const maxHpPath = game.settings.get(MODULE_ID, "maxHpPath");
    const layoutData = game.settings.get(MODULE_ID, "layoutData") || {};

    const actors = game.actors.contents.filter(a => a.hasPlayerOwner && a.type === "character");

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
// 3) Open Overlay Window Function (Fixed)
// -----------------------------------------
function openOverlayWindow() {
  console.log(`${MODULE_ID} | Opening Overlay Window...`);

  if (!window.foundryStreamOverlayApp) {
    window.foundryStreamOverlayApp = new FoundryStreamOverlay();
  }

  const overlayWindow = window.open(
    "",
    "FoundryStreamOverlayWindow",
    "width=800,height=600,resizable=yes"
  );

  if (!overlayWindow) {
    ui.notifications.warn("Popup blocked! Please allow popups for Foundry.");
    return;
  }

  Hooks.once("renderFoundryStreamOverlay", (app, html) => {
    const bg = game.settings.get(MODULE_ID, "backgroundColour");

    overlayWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Foundry Stream Overlay</title>
        <link rel="stylesheet" href="modules/${MODULE_ID}/foundrystreamoverlay.css">
      </head>
      <body style="background-color: ${bg}; margin: 0;">
        <div id="overlay-container"></div>
      </body>
      </html>
    `);
    overlayWindow.document.close();

    const container = overlayWindow.document.getElementById("overlay-container");
    if (container) container.appendChild(html[0]);
  });

  window.foundryStreamOverlayApp.render(true);
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
