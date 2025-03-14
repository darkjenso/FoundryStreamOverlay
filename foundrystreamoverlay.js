const MODULE_ID = "foundrystreamoverlay";

// Example data fields for D&D5e.
const POSSIBLE_DATA_PATHS = [
  { label: "Actor Name", path: "name" },
  { label: "Current HP", path: "system.attributes.hp.value" },
  { label: "Max HP", path: "system.attributes.hp.max" },
  { label: "AC", path: "system.attributes.ac.value" },
  { label: "Level", path: "system.details.level" },
  { label: "STR Score", path: "system.abilities.str.value" },
  { label: "DEX Score", path: "system.abilities.dex.value" },
  { label: "CON Score", path: "system.abilities.con.value" },
  { label: "INT Score", path: "system.abilities.int.value" },
  { label: "WIS Score", path: "system.abilities.wis.value" },
  { label: "CHA Score", path: "system.abilities.cha.value" }
];

// -----------------------------------------
// 1) Register Settings and Helpers
// -----------------------------------------
Hooks.once("init", () => {
  Handlebars.registerHelper("ifEquals", function(arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
  });
  
  game.settings.register(MODULE_ID, "backgroundColour", {
    name: "Background Colour",
    hint: "Chroma key colour for the overlay background.",
    scope: "client",
    type: String,
    default: "#00ff00",
    config: true
  });

  game.settings.register(MODULE_ID, "overlayItems", {
    name: "Overlay Items (Dynamic Rows)",
    hint: "Stores each row’s settings—text and image rows with location, order and styling.",
    scope: "client",
    type: Array,
    default: [],
    config: false
  });

  game.settings.registerMenu(MODULE_ID, "overlayConfigMenu", {
    name: "Configure Overlay Items",
    label: "Configure Overlay",
    hint: "Add or remove text rows or a background image. Use the order buttons to adjust layering.",
    icon: "fas fa-bars",
    type: OverlayConfig,
    restricted: false
  });

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
    const backgroundColour = game.settings.get(MODULE_ID, "backgroundColour");
    const overlayItems = game.settings.get(MODULE_ID, "overlayItems") || [];

    // Process each item as either text or image.
    const items = overlayItems.map(item => {
      if (item.type === "image") {
        return {
          type: "image",
          imagePath: item.imagePath || "",
          imageSize: item.imageSize || 100,
          top: item.top ?? 0,
          left: item.left ?? 0,
          hide: item.hide ?? false,
          order: item.order ?? 0
        };
      } else {
        const actor = game.actors.get(item.actorId);
        if (!actor) return null;
        if (item.hide) return null;
        let textValue;
        if (item.dataPath === "name") {
          textValue = actor.name;
        } else {
          textValue = foundry.utils.getProperty(actor, item.dataPath);
        }
        if (textValue === null || textValue === undefined) textValue = "N/A";
        return {
          type: "text",
          actorId: item.actorId,
          dataPath: item.dataPath,
          data: textValue,
          top: item.top ?? 0,
          left: item.left ?? 0,
          hide: item.hide ?? false,
          fontSize: item.fontSize ?? 16,
          bold: item.bold ?? false,
          fontFamily: item.fontFamily ?? "Arial, sans-serif",
          fontColor: item.fontColor ?? "#000000",
          order: item.order ?? 0
        };
      }
    }).filter(Boolean);

    // Sort items by order in ascending order (first item in config should be in front).
    items.sort((a, b) => a.order - b.order);
    // Now compute renderOrder: the first item gets highest z-index.
    const max = items.length;
    items.forEach((item, index) => {
      item.renderOrder = max - index;
    });

    return {
      backgroundColour,
      items
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}

// -----------------------------------------
// 3) Overlay Config Form (Dynamic Rows)
// -----------------------------------------
class OverlayConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Overlay Item Config",
      id: "foundrystreamoverlay-config",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-config.html`,
      width: 800,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const overlayItems = game.settings.get(MODULE_ID, "overlayItems") || [];
    const rows = overlayItems.map((item, idx) => {
      return {
        idx,
        type: item.type || "text",
        actorId: item.actorId || "",
        dataPath: item.dataPath || "name",
        top: item.top || 0,
        left: item.left || 0,
        hide: item.hide || false,
        fontSize: item.fontSize || 16,
        bold: item.bold || false,
        fontFamily: item.fontFamily || "Arial, sans-serif",
        fontColor: item.fontColor || "#000000",
        imagePath: item.imagePath || "",
        imageSize: item.imageSize || 100,
        order: item.order || idx  // default order is the index
      };
    });
    const dataPathChoices = POSSIBLE_DATA_PATHS;
    const allActors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
    return { rows, allActors, dataPathChoices };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".add-row").click(this._onAddRow.bind(this));
    html.find(".add-image").click(this._onAddImage.bind(this));
    html.on("click", ".remove-row", this._onRemoveRow.bind(this));
    html.find(".move-up").click(this._onMoveUp.bind(this));
    html.find(".move-down").click(this._onMoveDown.bind(this));
  }

  async _onAddRow(event) {
    event.preventDefault();
    const overlayItems = game.settings.get(MODULE_ID, "overlayItems") || [];
    overlayItems.push({
      type: "text",
      actorId: "",
      dataPath: "name",
      top: 0,
      left: 0,
      hide: false,
      fontSize: 16,
      bold: false,
      fontFamily: "Arial, sans-serif",
      fontColor: "#000000",
      order: overlayItems.length
    });
    await game.settings.set(MODULE_ID, "overlayItems", overlayItems);
    this.render();
  }

  async _onAddImage(event) {
    event.preventDefault();
    const overlayItems = game.settings.get(MODULE_ID, "overlayItems") || [];
    overlayItems.push({
      type: "image",
      imagePath: "",
      imageSize: 100,
      top: 0,
      left: 0,
      hide: false,
      order: overlayItems.length
    });
    await game.settings.set(MODULE_ID, "overlayItems", overlayItems);
    this.render();
  }

  async _onRemoveRow(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const overlayItems = game.settings.get(MODULE_ID, "overlayItems") || [];
    overlayItems.splice(index, 1);
    await game.settings.set(MODULE_ID, "overlayItems", overlayItems);
    this.render();
  }

  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const overlayItems = game.settings.get(MODULE_ID, "overlayItems") || [];
    if (index > 0) {
      [overlayItems[index - 1], overlayItems[index]] = [overlayItems[index], overlayItems[index - 1]];
      await game.settings.set(MODULE_ID, "overlayItems", overlayItems);
      this.render();
    }
  }

  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const overlayItems = game.settings.get(MODULE_ID, "overlayItems") || [];
    if (index < overlayItems.length - 1) {
      [overlayItems[index], overlayItems[index + 1]] = [overlayItems[index + 1], overlayItems[index]];
      await game.settings.set(MODULE_ID, "overlayItems", overlayItems);
      this.render();
    }
  }

  async _updateObject(event, formData) {
    const newItems = [];
    for (let [key, val] of Object.entries(formData)) {
      const [field, idx] = key.split("-");
      if (!idx) continue;
      const rowIndex = Number(idx);
      if (!newItems[rowIndex]) {
        newItems[rowIndex] = {
          type: "text",
          actorId: "",
          dataPath: "name",
          top: 0,
          left: 0,
          hide: false,
          fontSize: 16,
          bold: false,
          fontFamily: "Arial, sans-serif",
          fontColor: "#000000",
          imagePath: "",
          imageSize: 100,
          order: 0
        };
      }
      switch (field) {
        case "type": newItems[rowIndex].type = val; break;
        case "actorId": newItems[rowIndex].actorId = val; break;
        case "dataPath": newItems[rowIndex].dataPath = val; break;
        case "top": newItems[rowIndex].top = Number(val) || 0; break;
        case "left": newItems[rowIndex].left = Number(val) || 0; break;
        case "hide": newItems[rowIndex].hide = Boolean(val); break;
        case "fontSize": newItems[rowIndex].fontSize = Number(val) || 16; break;
        case "bold": newItems[rowIndex].bold = Boolean(val); break;
        case "fontFamily": newItems[rowIndex].fontFamily = val; break;
        case "fontColor": newItems[rowIndex].fontColor = val; break;
        case "imagePath": newItems[rowIndex].imagePath = val; break;
        case "imageSize": newItems[rowIndex].imageSize = Number(val) || 100; break;
        case "order": newItems[rowIndex].order = Number(val) || 0; break;
        default: break;
      }
    }
    await game.settings.set(MODULE_ID, "overlayItems", newItems);
    if (window.foundryStreamOverlayApp) {
      window.foundryStreamOverlayApp.render();
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
    // Not used.
  }
}

// -----------------------------------------
// 5) openOverlayWindow() - Single-Click with Hook
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
  const overlayApp = new FoundryStreamOverlay();
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
    const container = overlayWindow.document.getElementById("overlay-container");
    if (container) container.appendChild(html[0]);
  });
  overlayApp.render(true);
  window.overlayWindow = overlayWindow;
  window.foundryStreamOverlayApp = overlayApp;
}

// -----------------------------------------
// 6) Update overlay on actor changes
// -----------------------------------------
Hooks.on("updateActor", (actor, update, options, userId) => {
  if (window.foundryStreamOverlayApp) {
    window.foundryStreamOverlayApp.render();
  }
});
