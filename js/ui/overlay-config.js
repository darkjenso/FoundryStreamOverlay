// Optimized Overlay Configuration UI Component with Dice Support - FIXED VERSION
import { MODULE_ID, DATA_PATHS, FONT_FAMILIES, PREMIUM_FONTS, ITEM_TEMPLATES } from '../core/constants.js';
import { isPremiumActive } from '../premium/validation.js';
import { 
  getSystemExamples, 
  formatActorData, 
  showAutoSaveFeedback, 
  sanitizeDataPath,
  deepCopy 
} from '../utils/helpers.js';
import { getFontData, initializeTemplateHelperEvents } from '../utils/template-helpers.js';
import { AnimationManager } from './animation-manager.js';
import OverlayData from '../../data-storage.js';

export class OverlayConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Edit Overlay Scene",
      id: "foundrystreamoverlay-config",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-config.html`,
      width: 900,
      height: "auto",
      closeOnSubmit: false,
      resizable: true
    });
  }

  constructor(options = {}) {
    super();
    this.options = foundry.utils.mergeObject(this.options, options);
    this._selectedLayout = null;
    this._showExtendedFonts = false;
  }

  async _render(force, options) {
    await super._render(force, options);
    this._injectOptimizedStyles();
  }

  _injectOptimizedStyles() {
    const styleId = "foundrystreamoverlay-optimized-config-styles";
    if (document.getElementById(styleId)) return;
    
    const styleElem = document.createElement('style');
    styleElem.id = styleId;
    styleElem.textContent = `
      /* Optimized config styles - minimal additions to template styles */
      .overlay-config-simplified .item-card.dragging {
        opacity: 0.7;
        transform: rotate(2deg);
      }
      
      .overlay-config-simplified .drop-indicator {
        height: 4px;
        background: #007bff;
        margin: 8px 0;
        border-radius: 2px;
        opacity: 0.8;
      }
      
      .config-row.auto-save-feedback {
        background: rgba(40, 167, 69, 0.1);
        border-left: 3px solid #28a745;
        padding-left: 12px;
        animation: fadeInOut 2s ease-in-out;
      }
      
      @keyframes fadeInOut {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
      }
      
      .item-summary.warning {
        color: #dc3545;
        font-weight: 500;
      }
      
      .help-tooltip {
        position: absolute;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        max-width: 250px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
    `;
    document.head.appendChild(styleElem);
  }

  getData() {
    // Get the window ID this config is for
    const windowId = this.options?.windowId || "main";
    
    // Get all overlay windows
    const windows = OverlayData.getOverlayWindows();
    
    // Ensure we have a valid window config with fallback
    let windowConfig = windows[windowId];
    if (!windowConfig) {
      console.warn(`${MODULE_ID} | Window ${windowId} not found, creating default config`);
      windowConfig = { 
        id: windowId, 
        name: "Main Overlay",
        activeLayout: "Default",
        slideshowActive: false,
        width: 800,
        height: 600
      };
      OverlayData.setOverlayWindow(windowId, windowConfig);
    }
    
    // Get the layout we need to display
    const layoutName = this._selectedLayout || windowConfig.activeLayout || "Default";
    this._selectedLayout = layoutName;
    
    // Get all layouts
    const layouts = OverlayData.getLayouts() || {};
    
    // Ensure Default layout exists
    if (!layouts["Default"]) {
      console.warn(`${MODULE_ID} | Default layout missing, creating it`);
      layouts["Default"] = [];
      OverlayData.setLayout("Default", []);
    }
    
    // Ensure we're working with arrays
    let layoutItems = [];
    
    if (layouts[layoutName]) {
      layoutItems = Array.isArray(layouts[layoutName]) ? layouts[layoutName] : [];
    } else {
      console.warn(`${MODULE_ID} | Layout "${layoutName}" not found, initializing as empty.`);
      layouts[layoutName] = [];
      OverlayData.setLayout(layoutName, []);
    }
    
    // OPTIMIZED: Process layout items with enhanced validation
    const rows = layoutItems.map((item, idx) => {
      const hasAnimations = !!(item.animations && item.animations.length > 0);
      
      // Enhanced validation for better UX
      let hasIssues = false;
      let issueMessage = "";
      
      if (item.type === "data") {
        if (!item.actorId) {
          hasIssues = true;
          issueMessage = "No character selected";
        } else if (item.dataPath === "custom" && !item.customPath) {
          hasIssues = true;
          issueMessage = "Custom path is empty";
        }
      } else if (item.type === "static") {
        if (!item.content || item.content.trim() === "") {
          hasIssues = true;
          issueMessage = "Text content is empty";
        }
      } else if (item.type === "image") {
        if (!item.imagePath || item.imagePath.trim() === "") {
          hasIssues = true;
          issueMessage = "No image selected";
        }
      } else if (item.type === "dice") {
        // Dice items don't really have validation issues as they have defaults
        if (!item.diceType) {
          item.diceType = "d20"; // Default dice type
        }
      }
      
      return {
        idx,
        type: item.type || "data", 
        actorId: item.actorId || "",
        dataPath: item.dataPath || "name",
        customPath: item.customPath || "", 
        content: item.content || "",
        // Dice-specific properties
        diceType: item.diceType || "d20",
        alwaysVisible: item.alwaysVisible || false,
        style: item.style || "diceOnly",
        targetUsers: item.targetUsers || [],
        rollAnimation: item.rollAnimation || false,
        rollDuration: item.rollDuration || 1000,
        rollSpeed: item.rollSpeed || 10,
                // HP bar specific
        barWidth: item.barWidth || 200,
        barHeight: item.barHeight || 20,
        orientation: item.orientation || "ltr",
        rounded: item.rounded !== false,
        cornerRadius: item.cornerRadius || 4,
        outline: item.outline || false,
        outlineWidth: item.outlineWidth || 1,
        outlineColor: item.outlineColor || "#000000",
        gradient: item.gradient !== false,
        startColor: item.startColor || "#0094ff",
        endColor: item.endColor || "#ff0000",
        singleColor: item.singleColor || "#0094ff",
        showBackground: item.showBackground || false,
        backgroundColor: item.backgroundColor || "transparent",
        // Common properties
        top: item.top || 0,
        left: item.left || 0,
        hide: item.hide || false,
        fontSize: item.fontSize || (item.type === "dice" ? 24 : 16),
        bold: item.bold !== undefined ? item.bold : (item.type === "dice"),
        fontFamily: item.fontFamily || (item.type === "dice" ? "Impact, sans-serif" : "Arial, sans-serif"),
        fontColor: item.fontColor || (item.type === "dice" ? "#ffffff" : "#000000"),
        fontStroke: item.fontStroke !== undefined ? item.fontStroke : (item.type === "dice"),           
        fontStrokeColor: item.fontStrokeColor || "#000000",
        fontStrokeWidth: item.fontStrokeWidth || (item.type === "dice" ? 2 : 1),
        dropShadow: item.dropShadow || false,
        addLabel: item.addLabel || false,
        imagePath: item.imagePath || "",
        imageSize: item.imageSize || 100,
        order: item.order || idx,
        animation: item.animation || "none",
        animationDelay: (item.animationDelay !== undefined) ? item.animationDelay : 0,
        animationDuration: item.animationDuration || 1.5,
        entranceAnimation: item.entranceAnimation || "none",
        entranceDuration: item.entranceDuration || 0.5,
        entranceDelay: item.entranceDelay || 0,
        hasAnimations,
        hasIssues,
        issueMessage
      };
    });
    
    const allActors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
    const allUsers = game.users.contents.map(u => ({
      id: u.id,
      name: u.name,
      isGM: u.isGM
    }));
    
    // Get list of all window names for display
    const allWindows = Object.values(windows).map(w => ({
      id: w.id,
      name: w.name,
      isActive: w.id === windowId
    }));
    
    // Get premium status and font data
    const isPremium = isPremiumActive();
    const fontData = getFontData(this._showExtendedFonts);
    
    
    
    return { 
      rows, 
      allActors,
      allUsers,
      // Window-centric data
      windowId,
      windowName: windowConfig.name,
      allWindows,
      currentLayout: layoutName,
      // Keep legacy properties for backward compatibility
      activeLayout: layoutName,   
      layouts,
      // Enhanced font data
      ...fontData,
      // System and feature data
      gameSystem: game.system.id,
      systemExamples: getSystemExamples(game.system.id),
      isPremium,
      // Stats for template
      sceneCount: Object.keys(layouts).length,
      itemCount: rows.length,
      hasIssues: rows.some(r => r.hasIssues)
    };
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    
    // Initialize template helper events
    initializeTemplateHelperEvents(html);

    // OPTIMIZED: Scene selector with improved UX
    html.find("#scene-selector").change(async e => {
      e.preventDefault();
      const newLayout = html.find("#scene-selector").val();
      
      // Save any changes to the current layout first
      const formData = new FormDataExtended(html.closest('form')[0]).object;
      await this._updateObject(e, formData);
      
      try {
        this._selectedLayout = newLayout;
        
        // Ensure the layout exists
        const layouts = OverlayData.getLayouts();
        if (!layouts[newLayout]) {
          await OverlayData.setLayout(newLayout, []);
        }
        

        ui.notifications.info(`Now editing scene: ${newLayout}`);

        this.render(true);
      } catch (error) {
        console.error("Error switching scene:", error);
        ui.notifications.error("Failed to switch scene. Check console for details.");
      }
    });
    
    // OPTIMIZED: Manage scenes button
    html.find("#manage-scenes-btn, .manage-scenes-btn").click(async () => {
      const { ManageLayouts } = await import('./layout-manager.js');
      new ManageLayouts().render(true);
    });
    
    // Handle input changes for auto-save with debouncing
    let autoSaveTimeout;
    html.find('input, select, textarea').on('change', (event) => {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        this._onFieldChange(event);
      }, 300); // 300ms debounce
    });
    // Toggle header color when hide checkbox is changed
    html.find('input[name^="hide-"]').on('change', function(event) {
      const card = $(event.currentTarget).closest('.fso-item-card');
      if (event.currentTarget.checked) {
        card.addClass('fso-hidden-item');
      } else {
        card.removeClass('fso-hidden-item');
      }
    });
    // File picker for images - FIXED: Use correct class name
    html.find(".fso-file-picker").off("click").click(e => {
      const idx = $(e.currentTarget).data("index");
      new FilePicker({
        type: "image",
        current: "",
        callback: path => {
          html.find(`input[name="imagePath-${idx}"]`).val(path);
          html.find(`input[name="imagePath-${idx}"]`).trigger('change');
        }
      }).render(true);
    });
    
    // FIXED: Add buttons with correct class names
    html.find(".fso-add-item-btn").click(this._onAddItem.bind(this));
    
    // FIXED: Handle remove and move buttons with correct class names
    html.on("click", ".fso-remove-item", this._onRemoveRow.bind(this));
    html.find(".fso-duplicate-item").click(this._onDuplicateRow.bind(this));
    html.find(".fso-move-up").click(this._onMoveUp.bind(this));
    html.find(".fso-move-down").click(this._onMoveDown.bind(this));
    
    // Collapsible item cards functionality
    html.find('.fso-item-header-compact').off('click').on('click', function(event) {
      // Don't collapse if clicking on action buttons
      if ($(event.target).closest('.fso-item-actions-horizontal, .fso-action-btn-small').length) {
        return;
      }
      event.stopPropagation(); // Prevent bubbling to parent cards
      const itemCard = $(this).closest('.fso-item-card');
      itemCard.toggleClass('collapsed');
      // Store collapse state in localStorage
      const itemIndex = itemCard.data('index');
      const collapseState = itemCard.hasClass('collapsed');
      const storageKey = `${MODULE_ID}-item-collapse-${itemIndex}`;
      if (collapseState) {
        localStorage.setItem(storageKey, 'true');
      } else {
        localStorage.removeItem(storageKey);
      }
    });

    // Restore collapse states on render
    html.find('.fso-item-card').each(function() {
      const itemIndex = $(this).data('index');
      const storageKey = `${MODULE_ID}-item-collapse-${itemIndex}`;
      const isCollapsed = localStorage.getItem(storageKey) === 'true';
      if (isCollapsed) {
        $(this).addClass('collapsed');
      } else {
        $(this).removeClass('collapsed');
      }
    });

    // Add keyboard support for collapsing (Space or Enter key)
    html.find('.fso-item-header-compact').attr('tabindex', '0').off('keydown').on('keydown', function(event) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        $(this).click();
      }
    });

    // FIXED: Animation manager with correct class name
    html.find(".fso-manage-animations").click(this._onManageAnimations.bind(this));
    
    // OPTIMIZED: Quick action buttons
    html.find("#open-overlay-btn").click(async () => {
      try {
        const { openOverlayWindow } = await import('../overlay/window-management.js');
        openOverlayWindow();
        ui.notifications.info("Overlay window opened!");
      } catch (error) {
        console.error("Error opening overlay window:", error);
        ui.notifications.error("Failed to open overlay window. Check console for details.");
      }
    });

    // Toggle roll animation settings visibility immediately
    html.find('input[name^="rollAnimation-"]').on('change', function () {
      const index = this.name.split('-')[1];
      const durationRow = html.find(`input[name="rollDuration-${index}"]`).closest('.fso-config-row');
      const speedRow = html.find(`input[name="rollSpeed-${index}"]`).closest('.fso-config-row');
      if (this.checked) {
        durationRow.slideDown(200);
        speedRow.slideDown(200);
      } else {
        durationRow.slideUp(200);
        speedRow.slideUp(200);
      }
    });
  }

  _onManageAnimations(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = OverlayData.getLayouts();
    const activeLayout = this._selectedLayout || "Default";
    const item = layouts[activeLayout][index];
    
    if (!item.animations) {
      item.animations = [];
    }
    
    // Use the static method which handles premium checks
    AnimationManager.openForItem(item, index, this);
    
  }

  async _onFieldChange(event) {
    const form = $(event.currentTarget).closest('form');
    const formData = new FormDataExtended(form[0]).object;
    
    await this._updateObject(event, formData);
    this._updateAllWindows();
    showAutoSaveFeedback();
    
    // NEW: Trigger live sync
    if (game.settings.get(MODULE_ID, "autoSyncStandalone")) {
      const { liveSync } = await import('../utils/live-sync.js');
      liveSync.queueSync("overlay-config-change");
    }
  }
  
  _updateAllWindows() {
    // Dynamic import to avoid circular dependencies
    import('../overlay/window-management.js').then(({ updateOverlayWindow }) => {
      const windows = OverlayData.getOverlayWindows() || {};
      
      if (window.overlayWindow && !window.overlayWindow.closed) {
        updateOverlayWindow("main");
      }
      
      if (window.overlayWindows) {
        for (const [windowId, windowConfig] of Object.entries(windows)) {
          if (window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
            updateOverlayWindow(windowId);
          }
        }
      }
    }).catch(error => {
      console.error("Error updating overlay windows:", error);
    });
  }

  // OPTIMIZED: Single add function for all item types including dice
  async _onAddItem(event) {
    event.preventDefault();
    
    const button = $(event.currentTarget);
    // FIXED: Simplified item type detection - just use the data-type attribute
    const itemType = button.data('type') || 'data';
    
    
    const layoutName = this._selectedLayout || "Default";
    
    const layouts = OverlayData.getLayouts();
    const current = Array.isArray(layouts[layoutName]) ? layouts[layoutName] : [];
    
    const newItem = deepCopy(ITEM_TEMPLATES[itemType]);
    
    // Adjust order for all existing items
    for (let i = 0; i < current.length; i++) {
      current[i].order = current[i].order + 1;
    }

    current.unshift(newItem);
    await OverlayData.setLayout(layoutName, current);
    
    this._updateAllWindows();
    this.render();
    
    // Show helpful tip for new users
    if (current.length === 1) {
      ui.notifications.info(`Great! You've added your first item to this scene. Configure it below, then click "Open Overlay" to see it in action.`);
    }
  }
  
  async _onRemoveRow(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    
    const layoutName = this._selectedLayout || "Default";
    
    const layouts = OverlayData.getLayouts();
    const current = Array.isArray(layouts[layoutName]) ? layouts[layoutName] : [];

    if (index >= 0 && index < current.length) {
      const item = current[index];
      const itemDesc = item.type === 'data' ? 'data item' : 
                       item.type === 'static' ? `"${item.content}"` : 
                       item.type === 'dice' ? 'dice roll item' : 'image';
      
      const confirmed = await Dialog.confirm({
        title: "Remove Item",
        content: `Are you sure you want to remove this ${itemDesc}?`,
        yes: () => true,
        no: () => false
      });
      
      if (confirmed) {
        current.splice(index, 1);
        await OverlayData.setLayout(layoutName, current);
        
        this._updateAllWindows();
        this.render();
        ui.notifications.info("Item removed successfully.");
      }
    }
  }

  async _onDuplicateRow(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    
    const layoutName = this._selectedLayout || "Default";
    console.log(`Duplicating item from scene: ${layoutName} at index ${index}`);
    
    const layouts = OverlayData.getLayouts();
    const current = Array.isArray(layouts[layoutName]) ? layouts[layoutName] : [];

    if (index >= 0 && index < current.length) {
      const originalItem = current[index];
      const duplicatedItem = deepCopy(originalItem);
      
      // Modify the duplicated item to distinguish it from the original
      duplicatedItem.top = (duplicatedItem.top || 0) + 20;
      duplicatedItem.left = (duplicatedItem.left || 0) + 20;
      
      if (duplicatedItem.type === "static" && duplicatedItem.content) {
        duplicatedItem.content = duplicatedItem.content + " (Copy)";
      }
      
      // Reset the order to place it at the beginning
      for (let i = 0; i < current.length; i++) {
        current[i].order = (current[i].order || 0) + 1;
      }
      duplicatedItem.order = 0;
      
      current.splice(index + 1, 0, duplicatedItem);
      await OverlayData.setLayout(layoutName, current);
      
      this._updateAllWindows();
      ui.notifications.info("Item duplicated successfully!");
      this.render();
    }
  }
 
  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    
    const layoutName = this._selectedLayout || "Default";
    
    const layouts = OverlayData.getLayouts();
    const current = Array.isArray(layouts[layoutName]) ? layouts[layoutName] : [];

    if (index > 0 && index < current.length) {
      [current[index - 1], current[index]] = [current[index], current[index - 1]];
      await OverlayData.setLayout(layoutName, current);
      
      this._updateAllWindows();
      this.render();
    }
  }
  
  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    
    const layoutName = this._selectedLayout || "Default";
    
    const layouts = OverlayData.getLayouts();
    const current = Array.isArray(layouts[layoutName]) ? layouts[layoutName] : [];

    if (index >= 0 && index < current.length - 1) {
      [current[index], current[index + 1]] = [current[index + 1], current[index]];
      await OverlayData.setLayout(layoutName, current);
      
      this._updateAllWindows();
      this.render();
    }
  }

  async _updateObject(event, formData) {
    const isPremium = isPremiumActive();

    if (!isPremium) {
      for (let key in formData) {
        if (key.startsWith("animation-") || key.startsWith("entranceAnimation-")) {
          formData[key] = "none";
        }
      }
    }

    const newItems = [];
    for (let [key, val] of Object.entries(formData)) {
      const parts = key.split("-");
      if (parts.length < 2) continue;
      
      const field = parts[0];
      const idx = parts[1];
      const rowIndex = Number(idx);
      
      if (!newItems[rowIndex]) {
        newItems[rowIndex] = deepCopy(ITEM_TEMPLATES.data);
      }
      
      switch (field) {
        case "type": newItems[rowIndex].type = val; break;
        case "actorId": newItems[rowIndex].actorId = val; break;
        case "dataPath": 
          newItems[rowIndex].dataPath = val; 
          break;
        case "customPath": 
          newItems[rowIndex].customPath = val; 
          break;
        case "content": newItems[rowIndex].content = val; break;
        // Dice-specific fields
        case "diceType": newItems[rowIndex].diceType = val; break;
        case "alwaysVisible": newItems[rowIndex].alwaysVisible = Boolean(val); break;
        case "style": newItems[rowIndex].style = val; break;
        case "targetUsers":
          if (Array.isArray(val)) {
            newItems[rowIndex].targetUsers = val;
          } else if (typeof val === 'string' && val) {
            newItems[rowIndex].targetUsers = [val];
          } else {
            newItems[rowIndex].targetUsers = [];
          }
          break;

                  // HP bar specific fields
        case "barWidth": newItems[rowIndex].barWidth = Number(val) || 200; break;
        case "barHeight": newItems[rowIndex].barHeight = Number(val) || 20; break;
        case "orientation": newItems[rowIndex].orientation = val; break;
        case "rounded": newItems[rowIndex].rounded = Boolean(val); break;
        case "cornerRadius": newItems[rowIndex].cornerRadius = Number(val) || 4; break;
        case "outline": newItems[rowIndex].outline = Boolean(val); break;
        case "outlineWidth": newItems[rowIndex].outlineWidth = Number(val) || 1; break;
        case "outlineColor": newItems[rowIndex].outlineColor = val; break;
        case "gradient": newItems[rowIndex].gradient = Boolean(val); break;
        case "startColor": newItems[rowIndex].startColor = val; break;
        case "endColor": newItems[rowIndex].endColor = val; break;
        case "singleColor": newItems[rowIndex].singleColor = val; break;
        case "showBackground": newItems[rowIndex].showBackground = Boolean(val); break;
        case "backgroundColor": newItems[rowIndex].backgroundColor = val; break;
        // Common fields
        case "top": newItems[rowIndex].top = Number(val) || 0; break;
        case "left": newItems[rowIndex].left = Number(val) || 0; break;
        case "hide": newItems[rowIndex].hide = Boolean(val); break;
        case "fontSize": newItems[rowIndex].fontSize = Number(val) || 16; break;
        case "bold": newItems[rowIndex].bold = Boolean(val); break;
        case "fontFamily": newItems[rowIndex].fontFamily = val; break;
        case "fontColor": newItems[rowIndex].fontColor = val; break;
        case "fontStroke": newItems[rowIndex].fontStroke = Boolean(val); break;
        case "fontStrokeColor": newItems[rowIndex].fontStrokeColor = val; break;
        case "fontStrokeWidth": newItems[rowIndex].fontStrokeWidth = Number(val) || 1; break;
        case "dropShadow": newItems[rowIndex].dropShadow = Boolean(val); break;
        case "rollAnimation": newItems[rowIndex].rollAnimation = Boolean(val); break;
        case "rollDuration": newItems[rowIndex].rollDuration = Number(val) || 1000; break;
        case "rollSpeed": newItems[rowIndex].rollSpeed = Number(val) || 10; break;
        case "addLabel": newItems[rowIndex].addLabel = Boolean(val); break;
        case "imagePath": newItems[rowIndex].imagePath = val; break;
        case "imageSize": newItems[rowIndex].imageSize = Number(val) || 100; break;
        case "order": newItems[rowIndex].order = Number(val) || 0; break;
        case "animation":
          newItems[rowIndex].animation = isPremium ? val : "none"; 
          break;
        case "animationDelay": newItems[rowIndex].animationDelay = Number(val) || 0; break;
        case "animationDuration": newItems[rowIndex].animationDuration = Number(val) || 1.5; break;
        case "entranceAnimation":
          newItems[rowIndex].entranceAnimation = isPremium ? val : "none"; 
          break;
        case "entranceDuration": newItems[rowIndex].entranceDuration = Number(val) || 0.5; break;
        case "entranceDelay": newItems[rowIndex].entranceDelay = Number(val) || 0; break;
        default: break;
      }
    }
    
    newItems.forEach(item => {
      if (item.dataPath === 'custom' && item.customPath) {
        item.customPath = sanitizeDataPath(item.customPath);
      } else {
        item.customPath = '';
      }
    });
    
    // Use the _selectedLayout property to determine which layout to save to
    const currentLayout = this._selectedLayout || "Default";
    
    const layouts = OverlayData.getLayouts();
    const currentItems = layouts[currentLayout] || [];
    
    // Preserve animations from existing items
    newItems.forEach((item, index) => {
      if (currentItems[index] && currentItems[index].animations) {
        item.animations = currentItems[index].animations;
      }
    });
    
    // Add debugging attributes to help users
    newItems.forEach(item => {
      if (item.type === 'data' && item.dataPath === 'custom') {
        item._lastUpdated = Date.now();
      }
    });
    
    await OverlayData.setLayout(currentLayout, newItems);
  }
}