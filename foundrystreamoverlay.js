const MODULE_ID = "foundrystreamoverlay";
let socket;

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
  // Register our ifEquals helper.
  Handlebars.registerHelper("ifEquals", function(arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
  });

  // New helper: ifNotDefault – returns content only if value is not "Default"
  Handlebars.registerHelper("ifNotDefault", function(value, options) {
    if (value !== "Default") {
      return options.fn(this);
    }
    return "";
  });

  // Telemetry (optional)
  fetch("https://jolly-dust-4f49.darkjenso.workers.dev/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      module: MODULE_ID,
      event: "module_loaded",
      timestamp: Date.now()
    })
  }).catch(err => console.error("Telemetry error:", err));

  // Background colour.
  game.settings.register(MODULE_ID, "backgroundColour", {
    name: "Background Colour",
    hint: "Chroma key colour for the overlay background.",
    scope: "client",
    type: String,
    default: "#00ff00",
    config: true,
    onChange: (value) => {
      if (window.foundryStreamOverlayApp) {
        window.foundryStreamOverlayApp.render();
      }
      // Broadcast background color change
      broadcastOverlayUpdate();
    }
  });

  // Layouts: an object mapping layout names to arrays of overlay items.
  game.settings.register(MODULE_ID, "layouts", {
    name: "Layouts",
    hint: "Stores all overlay layouts. Each key is a layout name and its value is an array of overlay items.",
    scope: "client",
    type: Object,
    default: { "Default": [] },
    config: false,
    onChange: () => {
      // Broadcast layouts update
      broadcastOverlayUpdate();
    }
  });

  // Active layout: which layout is currently in use.
  game.settings.register(MODULE_ID, "activeLayout", {
    name: "Active Layout",
    hint: "The layout that is currently in use.",
    scope: "client",
    type: String,
    default: "Default",
    config: false,
    onChange: () => {
      if (window.foundryStreamOverlayApp) {
        window.foundryStreamOverlayApp.render();
      }
      // Broadcast active layout change
      broadcastOverlayUpdate();
    }
  });
  
  // Secret key for browser source authentication
  game.settings.register(MODULE_ID, "browserSourceKey", {
    name: "Browser Source Authentication Key",
    hint: "Secret key for authenticating browser sources. Keep this private.",
    scope: "world",
    type: String,
    default: generateRandomKey(),
    config: false
  });

  // Active browser sources
  game.settings.register(MODULE_ID, "activeBrowserSources", {
    name: "Active Browser Sources",
    hint: "Tracks active browser source connections",
    scope: "world",
    type: Object,
    default: {},
    config: false
  });

  // Register the configuration menu (editing items for the active layout).
  game.settings.registerMenu(MODULE_ID, "overlayConfigMenu", {
    name: "Configure Overlay Items",
    label: "Configure Overlay",
    hint: "Edit overlay items for the active layout.",
    icon: "fas fa-bars",
    type: OverlayConfig,
    restricted: false
  });

  // Register the new Manage Layouts menu.
  game.settings.registerMenu(MODULE_ID, "manageLayouts", {
    name: "Manage Layouts",
    label: "Manage Layouts",
    hint: "Create, rename, delete, export, or import overlay layouts.",
    icon: "fas fa-layer-group",
    type: ManageLayouts,
    restricted: false
  });

  // Register the overlay window opener.
  game.settings.registerMenu(MODULE_ID, "openOverlayWindow", {
    name: "Open Overlay Window",
    label: "Open Overlay",
    hint: "Open the overlay in a separate pop-up window.",
    icon: "fas fa-external-link-alt",
    type: OverlayWindowOpener,
    restricted: false,
    config: true
  });

  // Register the Slideshow configuration (new!).
  game.settings.register(MODULE_ID, "slideshow", {
    name: "Slideshow Configuration",
    hint: "Stores the ordered list of layouts with durations for the slideshow.",
    scope: "client",
    type: Object,
    default: { list: [] },
    config: false
  });

  // Register the Slideshow Settings menu.
  game.settings.registerMenu(MODULE_ID, "slideshowSettings", {
    name: "Slideshow Settings",
    label: "Slideshow Settings",
    hint: "Configure a slideshow of overlay layouts.",
    icon: "fas fa-play",
    type: SlideshowConfig,
    restricted: false
  });

  // Register the Browser Source URL generator.
  game.settings.registerMenu(MODULE_ID, "browserSource", {
    name: "Browser Source URL",
    label: "Browser Source URL",
    hint: "Generate a URL for a browser source with a transparent overlay.",
    icon: "fas fa-link",
    type: BrowserSourceConfig,
    restricted: false
  });

  console.log("Module settings registered.");

  // When activeLayout is updated, re-render the overlay if it's open.
  Hooks.on("updateSetting", (namespace, key, value, options, userId) => {
    if (namespace === MODULE_ID && key === "activeLayout") {
      if (window.foundryStreamOverlayApp) {
        window.foundryStreamOverlayApp.render();
      }
    }
  });
});

// -----------------------------------------
// 2) socketlib Setup
// -----------------------------------------
Hooks.once("socketlib.ready", () => {
  // Initialize socketlib
  socket = socketlib.registerModule(MODULE_ID);
  
  // Register socket functions
  socket.register("requestOverlayData", requestOverlayData);
  socket.register("broadcastActorUpdate", broadcastActorUpdate);
  socket.register("authenticateBrowserSource", authenticateBrowserSource);
  
  // We register the receiveOverlayUpdate callback differently
  socket.register("receiveOverlayUpdate", (data) => {
    // This is just a placeholder - this function is used for broadcasts
    console.log(`${MODULE_ID} | Broadcast overlay update`);
    return true;
  });
  
  console.log(`${MODULE_ID} | socketlib initialized`);
});

// Function to receive overlay updates (browser source will listen for this)
function receiveOverlayUpdate(data) {
  // This function is primarily for browser sources to listen to
  // It's executed on the client side via socketlib
  console.log(`${MODULE_ID} | Received overlay update`);
}

// Function to generate a random key for browser source authentication
function generateRandomKey(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Modified authenticateBrowserSource function
function authenticateBrowserSource(providedKey, sourceId) {
  const validKey = game.settings.get(MODULE_ID, "browserSourceKey");
  
  // Check standard key
  if (providedKey === validKey) {
    // Register this source as active
    const activeSources = game.settings.get(MODULE_ID, "activeBrowserSources") || {};
    activeSources[sourceId] = {
      lastSeen: Date.now(),
      ip: this.ip // socketlib provides this
    };
    game.settings.set(MODULE_ID, "activeBrowserSources", activeSources);
    
    // Return the initial overlay data
    return getOverlayData();
  }
  
  // Check temporary keys
  if (window.tempBrowserSourceKeys && window.tempBrowserSourceKeys[providedKey]) {
    const tempKeyData = window.tempBrowserSourceKeys[providedKey];
    
    // Check if the key is still valid
    if (tempKeyData.expires > Date.now()) {
      // For temporary keys, we don't register them in the activeBrowserSources setting
      // But we do update their last seen time
      tempKeyData.lastSeen = Date.now();
      
      // Return the overlay data
      return getOverlayData();
    }
    
    // If expired, remove it
    delete window.tempBrowserSourceKeys[providedKey];
  }
  
  // If we get here, authentication failed
  return { authenticated: false, error: "Invalid authentication key" };
}

// Function to get current overlay data
function getOverlayData() {
  const backgroundColour = game.settings.get(MODULE_ID, "backgroundColour");
  const layouts = game.settings.get(MODULE_ID, "layouts") || {};
  const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";

  const items = (layouts[activeLayout] || []).map(item => {
    // Include the new animation timing properties.
    const animation = item.animation || "none";
    const animationDelay = (item.animationDelay !== undefined) ? item.animationDelay : 0;
    const animationDuration = item.animationDuration || 1.5;
    
    if (item.type === "image") {
      return {
        type: "image",
        imagePath: item.imagePath || "",
        imageSize: item.imageSize || 100,
        top: item.top ?? 0,
        left: item.left ?? 0,
        hide: item.hide ?? false,
        order: item.order || 0,
        animation,
        animationDelay,
        animationDuration
      };
    } else if (item.type === "static") {
      return {
        type: "static",
        content: item.content || "",
        top: item.top ?? 0,
        left: item.left ?? 0,
        hide: item.hide ?? false,
        fontSize: item.fontSize || 16,
        bold: item.bold || false,
        fontFamily: item.fontFamily || "Arial, sans-serif",
        fontColor: item.fontColor || "#000000",
        order: item.order || 0,
        animation,
        animationDelay,
        animationDuration
      };
    } else {
      // Dynamic data items.
      const actor = game.actors.get(item.actorId);
      if (!actor) return null;
      if (item.hide) return null;
      let textValue = (item.dataPath === "name")
        ? actor.name
        : foundry.utils.getProperty(actor, item.dataPath);
      if (textValue === null || textValue === undefined) textValue = "N/A";
      return {
        type: "data",
        actorId: item.actorId,
        dataPath: item.dataPath,
        data: textValue,
        top: item.top ?? 0,
        left: item.left ?? 0,
        hide: item.hide ?? false,
        fontSize: item.fontSize || 16,
        bold: item.bold || false,
        fontFamily: item.fontFamily || "Arial, sans-serif",
        fontColor: item.fontColor || "#000000",
        order: item.order || 0,
        animation,
        animationDelay,
        animationDuration
      };
    }
  }).filter(Boolean);

  // Sort items in ascending order.
  items.sort((a, b) => a.order - b.order);
  // Compute renderOrder so that items at the top of the config list appear in front.
  const max = items.length;
  items.forEach((item, index) => {
    item.renderOrder = max - index;
  });

  return {
    authenticated: true,
    backgroundColour,
    items,
    timestamp: Date.now()
  };
}

// Modified requestOverlayData function
function requestOverlayData(sourceId, authKey) {
  // Verify authentication with standard key
  const validKey = game.settings.get(MODULE_ID, "browserSourceKey");
  
  if (authKey === validKey) {
    // Update last seen timestamp
    const activeSources = game.settings.get(MODULE_ID, "activeBrowserSources") || {};
    if (activeSources[sourceId]) {
      activeSources[sourceId].lastSeen = Date.now();
      game.settings.set(MODULE_ID, "activeBrowserSources", activeSources);
    }
    
    // Return the current overlay data
    return getOverlayData();
  }
  
  // Check temporary keys
  if (window.tempBrowserSourceKeys && window.tempBrowserSourceKeys[authKey]) {
    const tempKeyData = window.tempBrowserSourceKeys[authKey];
    
    // Check if the key is still valid
    if (tempKeyData.expires > Date.now()) {
      // For temporary keys, we don't register them in the activeBrowserSources setting
      // But we do update their last seen time
      tempKeyData.lastSeen = Date.now();
      
      // Return the overlay data
      return getOverlayData();
    }
    
    // If expired, remove it
    delete window.tempBrowserSourceKeys[authKey];
  }
  
  // If we get here, authentication failed
  return { authenticated: false, error: "Invalid authentication key" };
}

// Function to broadcast actor updates to browser sources
function broadcastActorUpdate(actorId) {
  // This function could be called from client-side code after an actor is updated
  if (!socket) return;
  
  const overlayData = getOverlayData();
  socket.executeForEveryone("receiveOverlayUpdate", overlayData);
}

// Updated Function to broadcast overlay updates to browser sources
function broadcastOverlayUpdate() {
  // First, use socketlib if available
  if (socket) {
    try {
      const overlayData = getOverlayData();
      socket.executeForEveryone("receiveOverlayUpdate", overlayData);
    } catch (e) {
      console.error(`${MODULE_ID} | Error broadcasting with socketlib:`, e);
    }
  }
  
  // Then, send updates directly to any browser source windows we've opened
  if (!window.browserSourceWindows) {
    window.browserSourceWindows = [];
  }
  
  // Clean up closed windows
  window.browserSourceWindows = window.browserSourceWindows.filter(win => !win.closed);
  
  // Get the overlay data
  const data = getOverlayData();
  
  // Send updates to each window
  window.browserSourceWindows.forEach(win => {
    try {
      win.postMessage({
        module: 'foundrystreamoverlay',
        type: 'update',
        data: data
      }, '*');
    } catch (error) {
      console.error(`${MODULE_ID} | Error sending update to browser source:`, error);
    }
  });
}

// -----------------------------------------
// 3) Main Overlay Application
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
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";

    const items = (layouts[activeLayout] || []).map(item => {
      // Include the new animation timing properties.
      const animation = item.animation || "none";
      const animationDelay = (item.animationDelay !== undefined) ? item.animationDelay : 0;
      const animationDuration = item.animationDuration || 1.5;
      if (item.type === "image") {
        return {
          type: "image",
          imagePath: item.imagePath || "",
          imageSize: item.imageSize || 100,
          top: item.top ?? 0,
          left: item.left ?? 0,
          hide: item.hide ?? false,
          order: item.order || 0,
          animation,
          animationDelay,
          animationDuration
        };
      } else if (item.type === "static") {
        return {
          type: "static",
          content: item.content || "",
          top: item.top ?? 0,
          left: item.left ?? 0,
          hide: item.hide ?? false,
          fontSize: item.fontSize || 16,
          bold: item.bold || false,
          fontFamily: item.fontFamily || "Arial, sans-serif",
          fontColor: item.fontColor || "#000000",
          order: item.order || 0,
          animation,
          animationDelay,
          animationDuration
        };
      } else {
        // Dynamic data items.
        const actor = game.actors.get(item.actorId);
        if (!actor) return null;
        if (item.hide) return null;
        let textValue = (item.dataPath === "name")
          ? actor.name
          : foundry.utils.getProperty(actor, item.dataPath);
        if (textValue === null || textValue === undefined) textValue = "N/A";
        return {
          type: "data",
          actorId: item.actorId,
          dataPath: item.dataPath,
          data: textValue,
          top: item.top ?? 0,
          left: item.left ?? 0,
          hide: item.hide ?? false,
          fontSize: item.fontSize || 16,
          bold: item.bold || false,
          fontFamily: item.fontFamily || "Arial, sans-serif",
          fontColor: item.fontColor || "#000000",
          order: item.order || 0,
          animation,
          animationDelay,
          animationDuration
        };
      }
    }).filter(Boolean);

    // Sort items in ascending order.
    items.sort((a, b) => a.order - b.order);
    // Compute renderOrder so that items at the top of the config list appear in front.
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
// 4) Overlay Config Form (Editing Active Layout Items)
// -----------------------------------------
class OverlayConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Configure Active Layout Items",
      id: "foundrystreamoverlay-config",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-config.html`,
      width: 800,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const rows = (layouts[activeLayout] || []).map((item, idx) => {
      return {
        idx,
        type: item.type || "data", // "data", "static", or "image"
        actorId: item.actorId || "",
        dataPath: item.dataPath || "name",
        content: item.content || "",
        top: item.top || 0,
        left: item.left || 0,
        hide: item.hide || false,
        fontSize: item.fontSize || 16,
        bold: item.bold || false,
        fontFamily: item.fontFamily || "Arial, sans-serif",
        fontColor: item.fontColor || "#000000",
        imagePath: item.imagePath || "",
        imageSize: item.imageSize || 100,
        order: item.order || idx,
        animation: item.animation || "none",
        animationDelay: (item.animationDelay !== undefined) ? item.animationDelay : 0,
        animationDuration: item.animationDuration || 1.5
      };
    });
    const dataPathChoices = POSSIBLE_DATA_PATHS;
    const allActors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
    return { rows, allActors, dataPathChoices, activeLayout, layouts };
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Bind layout selection change to update active layout immediately.
    html.find("#active-layout").change(async e => {
      e.preventDefault();
      const newLayout = html.find("#active-layout").val();
      await game.settings.set("foundrystreamoverlay", "activeLayout", newLayout);
      ui.notifications.info("Active layout set to " + newLayout);
      if (window.foundryStreamOverlayApp) {
        window.foundryStreamOverlayApp.render();
      }
      this.render();
    });
    html.find(".add-row").click(this._onAddRow.bind(this));
    html.find(".add-image").click(this._onAddImage.bind(this));
    html.find(".add-static").click(this._onAddStatic.bind(this));
    html.on("click", ".remove-row", this._onRemoveRow.bind(this));
    html.find(".move-up").click(this._onMoveUp.bind(this));
    html.find(".move-down").click(this._onMoveDown.bind(this));
    // Bind file-picker for image path fields.
    html.find(".file-picker").off("click").click(e => {
      const idx = $(e.currentTarget).data("index");
      new FilePicker({
        type: "image",
        current: "",
        callback: path => {
          html.find(`input[name="imagePath-${idx}"]`).val(path);
        }
      }).render(true);
    });
    
    // Open Overlay button inside config.
    html.find("#open-overlay-from-config").click(e => {
      e.preventDefault();
      openOverlayWindow();
    });
  }

  async _onAddRow(event) {
    event.preventDefault();
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const current = layouts[activeLayout] || [];
    current.push({
      type: "data",
      actorId: "",
      dataPath: "name",
      top: 0,
      left: 0,
      hide: false,
      fontSize: 16,
      bold: false,
      fontFamily: "Arial, sans-serif",
      fontColor: "#000000",
      order: current.length,
      animation: "none",
      animationDelay: 0,
      animationDuration: 1.5
    });
    layouts[activeLayout] = current;
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onAddImage(event) {
    event.preventDefault();
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const current = layouts[activeLayout] || [];
    current.push({
      type: "image",
      imagePath: "",
      imageSize: 100,
      top: 0,
      left: 0,
      hide: false,
      order: current.length,
      animation: "none",
      animationDelay: 0,
      animationDuration: 1.5
    });
    layouts[activeLayout] = current;
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onAddStatic(event) {
    event.preventDefault();
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const current = layouts[activeLayout] || [];
    current.push({
      type: "static",
      content: "Static text",
      top: 0,
      left: 0,
      hide: false,
      fontSize: 16,
      bold: false,
      fontFamily: "Arial, sans-serif",
      fontColor: "#000000",
      order: current.length,
      animation: "none",
      animationDelay: 0,
      animationDuration: 1.5
    });
    layouts[activeLayout] = current;
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onRemoveRow(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const current = layouts[activeLayout] || [];
    current.splice(index, 1);
    layouts[activeLayout] = current;
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const current = layouts[activeLayout] || [];
    if (index > 0) {
      [current[index - 1], current[index]] = [current[index], current[index - 1]];
      layouts[activeLayout] = current;
      await game.settings.set(MODULE_ID, "layouts", layouts);
      this.render();
    }
  }

  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = game.settings.get(MODULE_ID, "layouts") || { "Default": [] };
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    const current = layouts[activeLayout] || [];
    if (index < current.length - 1) {
      [current[index], current[index + 1]] = [current[index + 1], current[index]];
      layouts[activeLayout] = current;
      await game.settings.set(MODULE_ID, "layouts", layouts);
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
          type: "data",
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
          order: 0,
          animation: "none",
          animationDelay: 0,
          animationDuration: 1.5
        };
      }
      switch (field) {
        case "type": newItems[rowIndex].type = val; break;
        case "actorId": newItems[rowIndex].actorId = val; break;
        case "dataPath": newItems[rowIndex].dataPath = val; break;
        case "content": newItems[rowIndex].content = val; break;
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
        case "animation": newItems[rowIndex].animation = val; break;
        case "animationDelay": newItems[rowIndex].animationDelay = Number(val) || 0; break;
        case "animationDuration": newItems[rowIndex].animationDuration = Number(val) || 1.5; break;
        default: break;
      }
    }
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    layouts[activeLayout] = newItems;
    await game.settings.set(MODULE_ID, "layouts", layouts);
    if (window.foundryStreamOverlayApp) {
      window.foundryStreamOverlayApp.render();
    }
    
    // Broadcast changes to browser sources
    broadcastOverlayUpdate();
  }
}

// -----------------------------------------
// 5) "Open Overlay" Button Form
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
// 6) openOverlayWindow() - Single-Click with Hook
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
  
  // Add this window to the list of browser source windows to update
  if (!window.browserSourceWindows) {
    window.browserSourceWindows = [];
  }
  window.browserSourceWindows.push(overlayWindow);
}

// -----------------------------------------
// 7) Update overlay on actor changes
// -----------------------------------------
Hooks.on("updateActor", (actor, update, options, userId) => {
  if (window.foundryStreamOverlayApp) {
    window.foundryStreamOverlayApp.render();
  }
  
  // Broadcast update to browser sources
  if (socket) {
    broadcastActorUpdate(actor.id);
  } else {
    // If socketlib is not available, use direct message method
    broadcastOverlayUpdate();
  }
});

// -----------------------------------------
// 8) Manage Layouts Class
// -----------------------------------------
class ManageLayouts extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Manage Layouts",
      id: "foundrystreamoverlay-manage-layouts",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-layouts.html`,
      width: 600,
      height: "auto",
      closeOnSubmit: true
    });
  }

  getData() {
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout") || "Default";
    return { layouts, activeLayout };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".create-new-layout").click(this._onCreateNewLayout.bind(this));
    html.find(".activate-layout").click(this._onActivate.bind(this));
    html.find(".rename-layout").click(this._onRename.bind(this));
    html.find(".delete-layout").click(this._onDelete.bind(this));
    html.find(".export-layout").click(this._onExport.bind(this));
    html.find(".import-layout").click(this._onImport.bind(this));
  }

  async _onCreateNewLayout(event) {
    event.preventDefault();
    const layoutName = prompt("Enter a new layout name:");
    if (!layoutName) return;
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    if (layouts[layoutName]) {
      ui.notifications.warn("That layout already exists.");
      return;
    }
    layouts[layoutName] = [];
    await game.settings.set(MODULE_ID, "layouts", layouts);
    ui.notifications.info(`Layout "${layoutName}" created.`);
    this.render();
  }

  async _onActivate(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    await game.settings.set(MODULE_ID, "activeLayout", layoutName);
    ui.notifications.info(`Activated layout: ${layoutName}`);
    if (window.foundryStreamOverlayApp) {
      window.foundryStreamOverlayApp.render();
    }
    
    // Broadcast layout change to browser sources
    broadcastOverlayUpdate();
    
    this.render();
  }

  async _onRename(event) {
    event.preventDefault();
    const oldName = event.currentTarget.dataset.layout;
    let newName = prompt("Enter a new name for this layout:", oldName);
    if (!newName || newName === oldName) return;
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    if (layouts[newName]) {
      ui.notifications.warn("A layout with that name already exists.");
      return;
    }
    layouts[newName] = layouts[oldName];
    delete layouts[oldName];
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout");
    if (activeLayout === oldName) {
      await game.settings.set(MODULE_ID, "activeLayout", newName);
    }
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onDelete(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    if (layoutName === "Default") {
      ui.notifications.warn("Cannot delete the Default layout.");
      return;
    }
    if (!confirm(`Are you sure you want to delete layout: ${layoutName}?`)) return;
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    delete layouts[layoutName];
    const activeLayout = game.settings.get(MODULE_ID, "activeLayout");
    if (activeLayout === layoutName) {
      await game.settings.set(MODULE_ID, "activeLayout", "Default");
    }
    await game.settings.set(MODULE_ID, "layouts", layouts);
    this.render();
  }

  async _onExport(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const data = JSON.stringify(layouts[layoutName], null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${layoutName}-layout.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async _onImport(event) {
    event.preventDefault();
    const layoutName = prompt("Enter the name for the imported layout:");
    if (!layoutName) return;
    const json = prompt("Paste the JSON for the layout:");
    try {
      const importedLayout = JSON.parse(json);
      const layouts = game.settings.get(MODULE_ID, "layouts") || {};
      layouts[layoutName] = importedLayout;
      await game.settings.set(MODULE_ID, "layouts", layouts);
      ui.notifications.info(`Imported layout: ${layoutName}`);
      this.render();
    } catch (e) {
      ui.notifications.error("Invalid JSON.");
    }
  }
}

// -----------------------------------------
// 9) Slideshow Configuration
// -----------------------------------------
class SlideshowConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Slideshow Settings",
      id: "foundrystreamoverlay-slideshow",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-slideshow.html`,
      width: 600,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const slideshow = game.settings.get(MODULE_ID, "slideshow") || { list: [], random: false };
    const layouts = game.settings.get(MODULE_ID, "layouts") || {};
    const availableLayouts = Object.keys(layouts);
    return {
      slideshowItems: slideshow.list,
      availableLayouts,
      random: slideshow.random
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".add-selected-item").click(this._onAddSelectedItem.bind(this));
    html.find(".remove-item").click(this._onRemoveItem.bind(this));
    html.find(".move-up").click(this._onMoveUp.bind(this));
    html.find(".move-down").click(this._onMoveDown.bind(this));
    html.find(".start-slideshow").click(this._onStartSlideshow.bind(this));
    html.find(".stop-slideshow").click(this._onStopSlideshow.bind(this));
  }

  async _onAddSelectedItem(event) {
    event.preventDefault();
    // Get the selected layout from the dropdown.
    const selectedLayout = $(event.currentTarget).closest("form").find("#new-layout-dropdown").val();
    const data = game.settings.get(MODULE_ID, "slideshow") || { list: [], random: false };
    // Add the selected layout with a default 10-second duration.
    data.list.push({ layout: selectedLayout, duration: 10 });
    await game.settings.set(MODULE_ID, "slideshow", data);
    this.render();
  }

  async _onRemoveItem(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const data = game.settings.get(MODULE_ID, "slideshow") || { list: [], random: false };
    data.list.splice(index, 1);
    await game.settings.set(MODULE_ID, "slideshow", data);
    this.render();
  }

  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const data = game.settings.get(MODULE_ID, "slideshow") || { list: [], random: false };
    if (index > 0) {
      [data.list[index - 1], data.list[index]] = [data.list[index], data.list[index - 1]];
      await game.settings.set(MODULE_ID, "slideshow", data);
      this.render();
    }
  }

  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const data = game.settings.get(MODULE_ID, "slideshow") || { list: [], random: false };
    if (index < data.list.length - 1) {
      [data.list[index], data.list[index + 1]] = [data.list[index + 1], data.list[index]];
      await game.settings.set(MODULE_ID, "slideshow", data);
      this.render();
    }
  }

  // Start slideshow using a recursive setTimeout.
  async _onStartSlideshow(event) {
    event.preventDefault();
    const slideshow = game.settings.get(MODULE_ID, "slideshow") || { list: [], random: false };
    if (slideshow.list.length === 0) {
      ui.notifications.warn("No layouts in slideshow.");
      return;
    }
    // Clear any existing slideshow timer.
    if (window.foundryStreamSlideshowTimeout) {
      clearTimeout(window.foundryStreamSlideshowTimeout);
    }
    let currentIndex = 0;
    const runSlideshow = async () => {
      let currentItem;
      if (slideshow.random) {
        // Pick a random layout.
        const randomIndex = Math.floor(Math.random() * slideshow.list.length);
        currentItem = slideshow.list[randomIndex];
      } else {
        // Use sequential order.
        currentItem = slideshow.list[currentIndex];
        currentIndex = (currentIndex + 1) % slideshow.list.length;
      }
      await game.settings.set(MODULE_ID, "activeLayout", currentItem.layout);
      ui.notifications.info(`Switched to layout: ${currentItem.layout}`);
      if (window.foundryStreamOverlayApp) {
        window.foundryStreamOverlayApp.render();
      }
      
      // Also broadcast the change to browser sources
      broadcastOverlayUpdate();
      
      window.foundryStreamSlideshowTimeout = setTimeout(runSlideshow, currentItem.duration * 1000);
    };
    runSlideshow();
    ui.notifications.info("Slideshow started.");
  }

  async _onStopSlideshow(event) {
    event.preventDefault();
    if (window.foundryStreamSlideshowTimeout) {
      clearTimeout(window.foundryStreamSlideshowTimeout);
      window.foundryStreamSlideshowTimeout = null;
      ui.notifications.info("Slideshow stopped.");
    }
  }

  async _updateObject(event, formData) {
    event.preventDefault();
    // Process formData keys in the format layout-0, duration-0, etc.
    const data = { list: [] };
    const temp = {};
    for (let [key, value] of Object.entries(formData)) {
      const [field, index] = key.split("-");
      if (index !== undefined) {
        if (!temp[index]) temp[index] = {};
        temp[index][field] = value;
      }
    }
    for (let key in temp) {
      temp[key].duration = Number(temp[key].duration) || 10;
      data.list.push({
        layout: temp[key].layout || "Default",
        duration: temp[key].duration
      });
    }
    // Process the random checkbox.
    data.random = ("random" in formData);
    await game.settings.set(MODULE_ID, "slideshow", data);
    ui.notifications.info("Slideshow configuration saved.");
  }
}

// -----------------------------------------
// 10) Browser Source Config
// -----------------------------------------
class BrowserSourceConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Browser Source URL",
      id: "foundrystreamoverlay-browser",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-browser.html`,
      width: 600,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const sourceKey = game.settings.get(MODULE_ID, "browserSourceKey");
    
    // Create browser source URL
    const hostURL = window.location.origin;
    const serverURL = `${hostURL}/modules/${MODULE_ID}/browser-source.html`;
    
    // Add key parameter
    const fullURL = `${serverURL}?key=${sourceKey}`;
    
    // Add optional transparent background parameter
    const transparentURL = `${fullURL}&bg=transparent`;

    // Generate a temporary single-use URL (not stored in settings)
    const tempKey = generateRandomKey(16);
    const tempURL = `${serverURL}?key=${tempKey}&temp=true`;
    const tempTransparentURL = `${tempURL}&bg=transparent`;
    
    // Get active browser sources
    const activeSources = game.settings.get(MODULE_ID, "activeBrowserSources") || {};
    const activeBrowserSources = Object.entries(activeSources).map(([id, data]) => {
      return {
        id: id.substring(0, 12) + "...", // Truncate long IDs
        fullId: id,
        lastSeen: new Date(data.lastSeen).toLocaleString(),
        timeSince: Math.floor((Date.now() - data.lastSeen) / 1000),
        ip: data.ip || "Unknown"
      };
    });
    
    return {
      browserSourceURL: fullURL,
      transparentURL: transparentURL,
      tempURL: tempURL,
      tempTransparentURL: tempTransparentURL,
      activeBrowserSources,
      sourceKey,
      hasActiveSources: activeBrowserSources.length > 0
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Copy standard URL button
    html.find(".copy-url").click(async (event) => {
      event.preventDefault();
      const url = html.find("#browser-source-url").val();
      await navigator.clipboard.writeText(url);
      ui.notifications.info("Browser source URL copied to clipboard");
    });
    
    // Copy transparent URL button
    html.find(".copy-transparent-url").click(async (event) => {
      event.preventDefault();
      const url = html.find("#transparent-source-url").val();
      await navigator.clipboard.writeText(url);
      ui.notifications.info("Transparent browser source URL copied to clipboard");
    });
    
    // Open Browser Source buttons (new)
    html.find(".open-browser-source").click((event) => {
      event.preventDefault();
      this._openBrowserSource(false);
    });
    
    html.find(".open-transparent-source").click((event) => {
      event.preventDefault();
      this._openBrowserSource(true);
    });

    // Generate new source button
    html.find(".generate-new-source").click(async (event) => {
      event.preventDefault();
      // Create a fresh temporary URL and update the display
      const tempKey = generateRandomKey(16);
      const hostURL = window.location.origin;
      const serverURL = `${hostURL}/modules/${MODULE_ID}/browser-source.html`;
      const tempURL = `${serverURL}?key=${tempKey}&temp=true`;
      
      html.find("#temp-source-url").val(tempURL);
      html.find("#temp-transparent-url").val(`${tempURL}&bg=transparent`);
      
      // Store this temporary key - we're using a more straightforward approach
      // that doesn't rely on socket.data
      window.tempBrowserSourceKeys = window.tempBrowserSourceKeys || {};
      window.tempBrowserSourceKeys[tempKey] = {
        created: Date.now(),
        expires: Date.now() + 3600000 // 1 hour expiration
      };
      
      ui.notifications.info("New temporary browser source URL generated");
    });
    
    // Copy temporary URL buttons
    html.find(".copy-temp-url").click(async (event) => {
      event.preventDefault();
      const url = html.find("#temp-source-url").val();
      await navigator.clipboard.writeText(url);
      ui.notifications.info("Temporary browser source URL copied to clipboard");
    });
    
    html.find(".copy-temp-transparent-url").click(async (event) => {
      event.preventDefault();
      const url = html.find("#temp-transparent-url").val();
      await navigator.clipboard.writeText(url);
      ui.notifications.info("Temporary transparent browser source URL copied to clipboard");
    });
    
    // Generate new key button
    html.find(".generate-new-key").click(async (event) => {
      event.preventDefault();
      if (!confirm("This will invalidate all existing browser sources. Continue?")) return;
      
      const newKey = generateRandomKey();
      await game.settings.set(MODULE_ID, "browserSourceKey", newKey);
      
      // Clear active sources
      await game.settings.set(MODULE_ID, "activeBrowserSources", {});
      
      ui.notifications.info("New browser source key generated. Update all your browser sources.");
      this.render();
    });
    
    // Broadcast update button
    html.find(".broadcast-update").click(async (event) => {
      event.preventDefault();
      broadcastOverlayUpdate();
      ui.notifications.info("Manual update broadcast to all browser sources");
    });
    
    // Disconnect source button
    html.find(".disconnect-source").click(async (event) => {
      event.preventDefault();
      const sourceId = event.currentTarget.dataset.id;
      const activeSources = game.settings.get(MODULE_ID, "activeBrowserSources") || {};
      delete activeSources[sourceId];
      await game.settings.set(MODULE_ID, "activeBrowserSources", activeSources);
      ui.notifications.info(`Browser source disconnected`);
      this.render();
    });
  }
}

// Clean up inactive browser sources periodically
Hooks.on("ready", () => {
  // Every 10 minutes, clean up sources that haven't been seen in 20 minutes
  setInterval(() => {
    const activeSources = game.settings.get(MODULE_ID, "activeBrowserSources");
    let changed = false;
    const now = Date.now();
    
    for (const [id, data] of Object.entries(activeSources)) {
      // If not seen in 20 minutes, remove it
      if (now - data.lastSeen > 1200000) {
        delete activeSources[id];
        changed = true;
      }
    }
    
    if (changed) {
      game.settings.set(MODULE_ID, "activeBrowserSources", activeSources);
      console.log(`${MODULE_ID} | Cleaned up inactive browser sources`);
    }
  }, 600000);
});