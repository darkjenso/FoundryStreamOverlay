// Fixed Overlay Configuration UI Component - PROPER SCENE/WINDOW SEPARATION
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
    
    // FIXED: Clear separation between window context and editing context
    this.windowId = options.windowId || "main";
    this.editingLayout = options.editingLayout || null; // What scene we're editing
    this._showExtendedFonts = false;
    this._lastSavedFormData = null; // Track last saved form state
    this._autoSaveTimeout = null; // Track auto-save timeout
    this._isSwitchingScenes = false; // Flag to prevent auto-save during scene switch
    
    console.log(`${MODULE_ID} | OverlayConfig initialized for window: ${this.windowId}, editing layout: ${this.editingLayout}`);
  }

  async _render(force, options) {
    await super._render(force, options);
    this._injectOptimizedStyles();
    
    // Store initial form state after render
    setTimeout(() => {
      this._captureFormState();
    }, 100);
  }

  _injectOptimizedStyles() {
    const styleId = "foundrystreamoverlay-optimized-config-styles";
    if (document.getElementById(styleId)) return;
    
    const styleElem = document.createElement('style');
    styleElem.id = styleId;
    styleElem.textContent = `
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

      .fso-editing-notice {
        background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
        border: 1px solid #0ea5e9;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .fso-editing-notice-icon {
        color: #0369a1;
        font-size: 16px;
      }

      .fso-editing-notice-text {
        color: #0369a1;
        font-weight: 500;
        font-size: 14px;
      }

      .fso-assign-scene-section {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      }

      .fso-assign-actions {
        display: flex;
        gap: 12px;
        margin-top: 12px;
        flex-wrap: wrap;
      }
    `;
    document.head.appendChild(styleElem);
  }

  getData() {
    // FIXED: Get window configuration but don't confuse it with editing context
    const windows = OverlayData.getOverlayWindows();
    let windowConfig = windows[this.windowId];
    
    // Ensure we have a valid window config
    if (!windowConfig) {
      console.warn(`${MODULE_ID} | Window ${this.windowId} not found, creating default config`);
      windowConfig = { 
        id: this.windowId, 
        name: this.windowId === "main" ? "Main Overlay" : `Window ${this.windowId}`,
        activeLayout: "Default",
        slideshowActive: false,
        width: 800,
        height: 600
      };
      OverlayData.setOverlayWindow(this.windowId, windowConfig);
    }
    
    // FIXED: Determine what scene we're editing (separate from what's displayed)
    const layouts = OverlayData.getLayouts() || {};
    
    // Ensure Default layout exists
    if (!layouts["Default"]) {
      console.warn(`${MODULE_ID} | Default layout missing, creating it`);
      layouts["Default"] = [];
      OverlayData.setLayout("Default", []);
    }
    
    // FIXED: Use editingLayout if specified, otherwise fall back to window's active layout
    let currentEditingLayout = this.editingLayout || windowConfig.activeLayout || "Default";
    
    // Ensure the layout we're trying to edit actually exists
    if (!layouts[currentEditingLayout]) {
      console.warn(`${MODULE_ID} | Layout "${currentEditingLayout}" not found, falling back to Default`);
      currentEditingLayout = "Default";
    }
    
    this.editingLayout = currentEditingLayout;
    
    console.log(`${MODULE_ID} | Config data for window "${this.windowId}", editing scene "${currentEditingLayout}", window displays "${windowConfig.activeLayout}"`);
    
    // Get the items for the scene we're editing
    let layoutItems = [];
    if (layouts[currentEditingLayout]) {
      layoutItems = Array.isArray(layouts[currentEditingLayout]) ? layouts[currentEditingLayout] : [];
    }
    
    // Process layout items with enhanced validation
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
        if (!item.diceType) {
          item.diceType = "d20";
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
      isActive: w.id === this.windowId
    }));
    
    // Get premium status and font data
    const isPremium = isPremiumActive();
    const fontData = getFontData(this._showExtendedFonts);
    
    return { 
      rows, 
      allActors,
      allUsers,
      // FIXED: Clear separation of contexts
      windowId: this.windowId,
      windowName: windowConfig.name,
      windowActiveLayout: windowConfig.activeLayout, // What the window is currently displaying
      editingLayout: currentEditingLayout, // What scene we're currently editing
      isEditingDifferentScene: currentEditingLayout !== windowConfig.activeLayout, // Are we editing a different scene than what's displayed?
      allWindows,
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

    // FIXED: Scene selector for EDITING with proper state management
    html.find("#editing-scene-selector").change(async e => {
      e.preventDefault();
      const newEditingLayout = html.find("#editing-scene-selector").val();
      
      if (newEditingLayout === this.editingLayout) {
        return; // No change needed
      }
      
      console.log(`${MODULE_ID} | Switching from editing "${this.editingLayout}" to "${newEditingLayout}"`);
      
      // FIXED: Prevent auto-save during scene switching
      this._isSwitchingScenes = true;
      
      try {
        // Only save if there are actual changes to the current scene
        if (this._hasFormChanges()) {
          console.log(`${MODULE_ID} | Saving changes to "${this.editingLayout}" before switching`);
          const formData = new FormDataExtended(html.closest('form')[0]).object;
          await this._updateObject(e, formData);
        }
        
        // FIXED: Just change what we're editing, don't change display
        this.editingLayout = newEditingLayout;
        
        // Ensure the layout exists
        const layouts = OverlayData.getLayouts();
        if (!layouts[newEditingLayout]) {
          console.log(`${MODULE_ID} | Creating new empty layout: ${newEditingLayout}`);
          await OverlayData.setLayout(newEditingLayout, []);
        }

        console.log(`${MODULE_ID} | Now editing scene: ${newEditingLayout} (window ${this.windowId} still displays: ${this.getData().windowActiveLayout})`);
        ui.notifications.info(`Now editing scene: ${newEditingLayout}`);

        this.render(true);
      } catch (error) {
        console.error("Error switching editing scene:", error);
        ui.notifications.error("Failed to switch scene. Check console for details.");
      } finally {
        this._isSwitchingScenes = false;
      }
    });

    // FIXED: Separate button to assign current scene to window
    html.find("#assign-scene-to-window").click(async e => {
      e.preventDefault();
      
      try {
        const windows = OverlayData.getOverlayWindows();
        const windowConfig = windows[this.windowId];
        if (windowConfig) {
          windowConfig.activeLayout = this.editingLayout;
          await OverlayData.setOverlayWindow(this.windowId, windowConfig);
          
          ui.notifications.info(`Window "${windowConfig.name}" now displays scene: ${this.editingLayout}`);
          this.render(true);
          this._updateSpecificWindow(this.windowId);
        }
      } catch (error) {
        console.error("Error assigning scene to window:", error);
        ui.notifications.error("Failed to assign scene to window");
      }
    });

    // FIXED: Button to switch to editing the currently displayed scene
    html.find("#edit-displayed-scene").click(async e => {
      e.preventDefault();
      
      // Save current changes first if there are any
      if (this._hasFormChanges()) {
        console.log(`${MODULE_ID} | Saving changes to "${this.editingLayout}" before switching to displayed scene`);
        const formData = new FormDataExtended(html.closest('form')[0]).object;
        await this._updateObject(e, formData);
      }
      
      const windows = OverlayData.getOverlayWindows();
      const windowConfig = windows[this.windowId];
      
      this.editingLayout = windowConfig.activeLayout;
      ui.notifications.info(`Now editing the displayed scene: ${this.editingLayout}`);
      this.render(true);
    });
    
    // Manage scenes button
    html.find("#manage-scenes-btn, .manage-scenes-btn").click(async () => {
      const { ManageLayouts } = await import('./layout-manager.js');
      new ManageLayouts().render(true);
    });
    
    // FIXED: Handle input changes with improved auto-save logic
    html.find('input, select, textarea').on('change', (event) => {
      this._onFieldChange(event);
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

    // File picker for images
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
    
    // Add buttons
    html.find(".fso-add-item-btn").click(this._onAddItem.bind(this));
    
    // Handle remove and move buttons
    html.on("click", ".fso-remove-item", this._onRemoveRow.bind(this));
    html.find(".fso-duplicate-item").click(this._onDuplicateRow.bind(this));
    html.find(".fso-move-up").click(this._onMoveUp.bind(this));
    html.find(".fso-move-down").click(this._onMoveDown.bind(this));
    
    // Collapsible item cards functionality
    html.find('.fso-item-header-compact').off('click').on('click', function(event) {
      if ($(event.target).closest('.fso-item-actions-horizontal, .fso-action-btn-small').length) {
        return;
      }
      event.stopPropagation();
      const itemCard = $(this).closest('.fso-item-card');
      itemCard.toggleClass('collapsed');
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

    // Add keyboard support for collapsing
    html.find('.fso-item-header-compact').attr('tabindex', '0').off('keydown').on('keydown', function(event) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        $(this).click();
      }
    });

    // FIXED: Animation manager with proper context
    html.find(".fso-manage-animations").click(this._onManageAnimations.bind(this));
    
    // Quick action buttons
    html.find("#open-overlay-btn").click(async () => {
      try {
        const { openOverlayWindow } = await import('../overlay/window-management.js');
        openOverlayWindow(this.windowId);
        ui.notifications.info(`Overlay window opened: ${this.windowId}`);
      } catch (error) {
        console.error("Error opening overlay window:", error);
        ui.notifications.error("Failed to open overlay window. Check console for details.");
      }
    });

    // Toggle roll animation settings visibility
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

  // FIXED: Improved form change detection
  _captureFormState() {
    if (!this.element) return;
    try {
      const form = this.element.find('form')[0];
      if (form) {
        this._lastSavedFormData = new FormDataExtended(form).object;
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not capture form state:`, error);
    }
  }

  _hasFormChanges() {
    if (!this.element || !this._lastSavedFormData) return false;
    
    try {
      const form = this.element.find('form')[0];
      if (!form) return false;
      
      const currentFormData = new FormDataExtended(form).object;
      return JSON.stringify(currentFormData) !== JSON.stringify(this._lastSavedFormData);
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not detect form changes:`, error);
      return true; // Assume changes if we can't detect
    }
  }

  _onManageAnimations(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const layouts = OverlayData.getLayouts();
    
    // FIXED: Use the scene we're currently editing
    const item = layouts[this.editingLayout][index];
    
    if (!item.animations) {
      item.animations = [];
    }
    
    console.log(`${MODULE_ID} | Opening animation manager for item ${index} in scene ${this.editingLayout}`);
    
    // FIXED: Pass the current editing layout context to animation manager
    AnimationManager.openForItem(item, index, this, this.editingLayout);
  }

  // FIXED: Improved field change handling with debouncing and scene awareness
  _onFieldChange(event) {
    // Don't auto-save if we're switching scenes
    if (this._isSwitchingScenes) {
      return;
    }
    
    // Clear any existing timeout
    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
    }
    
    // Set up debounced auto-save
    this._autoSaveTimeout = setTimeout(async () => {
      if (this._isSwitchingScenes) {
        return; // Double-check in case scene switch started during timeout
      }
      
      try {
        const form = $(event.currentTarget).closest('form');
        const formData = new FormDataExtended(form[0]).object;
        
        await this._updateObject(event, formData);
        this._captureFormState(); // Update our saved state
        
        // FIXED: Only update windows that are displaying the scene we just modified
        this._updateWindowsDisplayingScene(this.editingLayout);
        
        showAutoSaveFeedback();
        
        // Trigger live sync
        if (game.settings.get(MODULE_ID, "autoSyncStandalone")) {
          const { liveSync } = await import('../utils/live-sync.js');
          liveSync.queueSync("overlay-config-change");
        }
      } catch (error) {
        console.error(`${MODULE_ID} | Error in auto-save:`, error);
      }
    }, 300); // 300ms debounce
  }
  
  // FIXED: Only update windows that are actually displaying the modified scene
  _updateWindowsDisplayingScene(sceneName) {
    import('../overlay/window-management.js').then(({ updateOverlayWindow }) => {
      const windows = OverlayData.getOverlayWindows() || {};
      
      // Check main window
      if (window.overlayWindow && !window.overlayWindow.closed) {
        const mainConfig = windows.main || {};
        if ((mainConfig.activeLayout || "Default") === sceneName) {
          console.log(`${MODULE_ID} | Updating main window (displays "${sceneName}")`);
          updateOverlayWindow("main");
        }
      }
      
      // Check other windows
      if (window.overlayWindows) {
        for (const [windowId, windowConfig] of Object.entries(windows)) {
          if (window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
            if ((windowConfig.activeLayout || "Default") === sceneName) {
              console.log(`${MODULE_ID} | Updating window ${windowId} (displays "${sceneName}")`);
              updateOverlayWindow(windowId);
            }
          }
        }
      }
    }).catch(error => {
      console.error("Error updating overlay windows:", error);
    });
  }

  // FIXED: Update a specific window
  _updateSpecificWindow(windowId) {
    import('../overlay/window-management.js').then(({ updateOverlayWindow }) => {
      if (windowId === "main") {
        if (window.overlayWindow && !window.overlayWindow.closed) {
          updateOverlayWindow("main");
        }
      } else {
        if (window.overlayWindows && window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
          updateOverlayWindow(windowId);
        }
      }
    }).catch(error => {
      console.error("Error updating specific overlay window:", error);
    });
  }

  // FIXED: Add item to the scene we're editing
  async _onAddItem(event) {
    event.preventDefault();
    
    const button = $(event.currentTarget);
    const itemType = button.data('type') || 'data';
    
    // FIXED: Add to the scene we're editing
    const layoutName = this.editingLayout;
    console.log(`${MODULE_ID} | Adding ${itemType} item to scene: ${layoutName}`);
    
    const layouts = OverlayData.getLayouts();
    const current = Array.isArray(layouts[layoutName]) ? layouts[layoutName] : [];
    
    const newItem = deepCopy(ITEM_TEMPLATES[itemType]);
    
    // Adjust order for all existing items
    for (let i = 0; i < current.length; i++) {
      current[i].order = current[i].order + 1;
    }

    current.unshift(newItem);
    await OverlayData.setLayout(layoutName, current);
    
    // Only update windows displaying this scene
    this._updateWindowsDisplayingScene(layoutName);
    this.render();
    
    if (current.length === 1) {
      ui.notifications.info(`Great! You've added your first item to scene "${layoutName}". Configure it below, then assign the scene to a window to see it in action.`);
    }
  }
  
  async _onRemoveRow(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    
    // FIXED: Remove from the scene we're editing
    const layoutName = this.editingLayout;
    
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
        
        this._updateWindowsDisplayingScene(layoutName);
        this.render();
        ui.notifications.info("Item removed successfully.");
      }
    }
  }

  async _onDuplicateRow(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    
    // FIXED: Duplicate in the scene we're editing
    const layoutName = this.editingLayout;
    console.log(`Duplicating item from scene: ${layoutName} at index ${index}`);
    
    const layouts = OverlayData.getLayouts();
    const current = Array.isArray(layouts[layoutName]) ? layouts[layoutName] : [];

    if (index >= 0 && index < current.length) {
      const originalItem = current[index];
      const duplicatedItem = deepCopy(originalItem);
      
      duplicatedItem.top = (duplicatedItem.top || 0) + 20;
      duplicatedItem.left = (duplicatedItem.left || 0) + 20;
      
      if (duplicatedItem.type === "static" && duplicatedItem.content) {
        duplicatedItem.content = duplicatedItem.content + " (Copy)";
      }
      
      for (let i = 0; i < current.length; i++) {
        current[i].order = (current[i].order || 0) + 1;
      }
      duplicatedItem.order = 0;
      
      current.splice(index + 1, 0, duplicatedItem);
      await OverlayData.setLayout(layoutName, current);
      
      this._updateWindowsDisplayingScene(layoutName);
      ui.notifications.info("Item duplicated successfully!");
      this.render();
    }
  }
 
  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    
    // FIXED: Move in the scene we're editing
    const layoutName = this.editingLayout;
    
    const layouts = OverlayData.getLayouts();
    const current = Array.isArray(layouts[layoutName]) ? layouts[layoutName] : [];

    if (index > 0 && index < current.length) {
      [current[index - 1], current[index]] = [current[index], current[index - 1]];
      await OverlayData.setLayout(layoutName, current);
      
      this._updateWindowsDisplayingScene(layoutName);
      this.render();
    }
  }
  
  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    
    // FIXED: Move in the scene we're editing
    const layoutName = this.editingLayout;
    
    const layouts = OverlayData.getLayouts();
    const current = Array.isArray(layouts[layoutName]) ? layouts[layoutName] : [];

    if (index >= 0 && index < current.length - 1) {
      [current[index], current[index + 1]] = [current[index + 1], current[index]];
      await OverlayData.setLayout(layoutName, current);
      
      this._updateWindowsDisplayingScene(layoutName);
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
      
      // Process all form fields (same as before)
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
    
    // FIXED: Save to the scene we're currently editing
    const currentEditingLayout = this.editingLayout;
    
    const layouts = OverlayData.getLayouts();
    const currentItems = layouts[currentEditingLayout] || [];
    
    // Preserve animations from existing items
    newItems.forEach((item, index) => {
      if (currentItems[index] && currentItems[index].animations) {
        item.animations = currentItems[index].animations;
      }
    });
    
    // Add debugging attributes
    newItems.forEach(item => {
      if (item.type === 'data' && item.dataPath === 'custom') {
        item._lastUpdated = Date.now();
      }
    });
    
    console.log(`${MODULE_ID} | Saving ${newItems.length} items to scene: ${currentEditingLayout}`);
    await OverlayData.setLayout(currentEditingLayout, newItems);
  }

  /**
   * Clean up when closing
   */
  async close(options = {}) {
    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
    }
    return super.close(options);
  }

  /**
   * Static method to open overlay config for editing a specific scene
   */
  static openForWindow(windowId = "main", editingLayout = null) {
    // Close any existing config dialogs
    for (const app of Object.values(ui.windows)) {
      if (app.constructor.name === 'OverlayConfig') {
        app.close();
      }
    }
    
    const config = new OverlayConfig({ windowId, editingLayout });
    return config.render(true);
  }

  /**
   * Static method to open config for editing a specific scene
   */
  static openForScene(sceneName, windowId = "main") {
    return OverlayConfig.openForWindow(windowId, sceneName);
  }
}