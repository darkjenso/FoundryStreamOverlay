// Layout Manager UI Component - FIXED VERSION WITH SAFER SCENE ASSIGNMENT
import { MODULE_ID } from '../core/constants.js';
import { canCreateLayout, isPremiumActive, showPremiumRequiredDialog } from '../premium/validation.js';
import { validateLayoutName, isValidJSON, downloadAsFile } from '../utils/helpers.js';
import OverlayData from '../../data-storage.js';

export class ManageLayouts extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Manage Scenes",
      id: "foundrystreamoverlay-manage-layouts",
      template: `modules/${MODULE_ID}/templates/foundrystreamoverlay-layouts.html`,
      width: 700,
      height: "auto",
      closeOnSubmit: true
    });
  }

  getData() {
    const layouts = OverlayData.getLayouts();
    const isPremium = isPremiumActive();
    
    // Calculate which layouts are in use by which windows
    const windows = OverlayData.getOverlayWindows();
    const layoutUsage = {};
    
    // Check each window to see which layout it's using
    for (const [windowId, windowConfig] of Object.entries(windows)) {
      const windowLayout = windowConfig.activeLayout || "Default";
      if (!layoutUsage[windowLayout]) {
        layoutUsage[windowLayout] = [];
      }
      layoutUsage[windowLayout].push(windowConfig.name || windowId);
    }
    
    console.log(`${MODULE_ID} | Layout usage:`, layoutUsage);
    
    // Enhanced layout data with item counts and usage info
    const layoutsData = Object.entries(layouts).map(([layoutName, items]) => ({
      name: layoutName,
      items: Array.isArray(items) ? items : [],
      itemCount: Array.isArray(items) ? items.length : 0,
      inUse: layoutUsage[layoutName] || [],
      canDelete: layoutName !== "Default" && (!layoutUsage[layoutName] || layoutUsage[layoutName].length === 0)
    }));
    
    return { 
      layouts: layoutsData,
      layoutUsage,
      windows: Object.values(windows),
      isPremium
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".create-new-layout").click(this._onCreateNewLayout.bind(this));
    html.find(".fso-edit-btn").click(this._onEditLayout.bind(this));
    html.find(".rename-layout").click(this._onRename.bind(this));
    html.find(".duplicate-layout").click(this._onDuplicate.bind(this));
    html.find(".delete-layout").click(this._onDelete.bind(this));
    html.find(".export-layout").click(this._onExport.bind(this));
    html.find(".import-layout").click(this._onImport.bind(this));
    html.find(".assign-to-window").click(this._onAssignToWindow.bind(this));
  }

  async _onCreateNewLayout(event) {
    event.preventDefault();
    
    const layouts = OverlayData.getLayouts();
    
    if (!canCreateLayout(layouts)) {
      return;
    }
    
    const layoutName = prompt("Enter a new scene name:");
    if (!layoutName) return;

    const validation = validateLayoutName(layoutName, layouts);
    if (!validation.isValid) {
      ui.notifications.error(validation.message);
      return;
    }
    
    // FIXED: Create a truly empty layout, not a copy
    console.log(`${MODULE_ID} | Creating new empty layout: ${layoutName}`);
    await OverlayData.setLayout(layoutName, []);
    ui.notifications.info(`Scene "${layoutName}" created.`);
    
    this._refreshConfigWindows();
    this.render();
  }

  async _onEditLayout(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    
    console.log(`${MODULE_ID} | Opening editor for layout: ${layoutName}`);
    
    try {
      const { OverlayConfig } = await import('./overlay-config.js');
      
      // FIXED: Open config specifically for editing this scene
      const configApp = OverlayConfig.openForScene(layoutName, "main");
    } catch (error) {
      console.error('Failed to open layout config:', error);
      ui.notifications.error('Failed to open layout configuration.');
    }
  }

  // FIXED: Improved scene assignment with better safety checks
  async _onAssignToWindow(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    
    const windows = OverlayData.getOverlayWindows();
    const windowOptions = Object.entries(windows).map(([id, config]) => ({
      id: id,
      name: config.name || id,
      currentLayout: config.activeLayout || "Default"
    }));

    // Create a dialog to select which window to assign to
    const content = `
      <form>
        <div class="form-group">
          <label>Assign scene "${layoutName}" to which window?</label>
          <select name="windowId" style="width: 100%; margin-top: 8px;">
            ${windowOptions.map(w => 
              `<option value="${w.id}">${w.name} (currently: ${w.currentLayout})</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-top: 12px;">
          <p style="font-size: 12px; color: #666; font-style: italic;">
            This will change what is displayed on the selected window.
          </p>
        </div>
      </form>
    `;

    const result = await Dialog.prompt({
      title: "Assign Scene to Window",
      content: content,
      callback: (html) => {
        const formData = new FormDataExtended(html.find('form')[0]).object;
        return formData.windowId;
      }
    });

    if (result) {
      try {
        const windowConfig = windows[result];
        if (windowConfig) {
          // FIXED: Create a copy of the window config to avoid reference issues
          const updatedConfig = { ...windowConfig };
          updatedConfig.activeLayout = layoutName;
          
          // Save the updated configuration
          await OverlayData.setOverlayWindow(result, updatedConfig);
          
          console.log(`${MODULE_ID} | Successfully assigned scene "${layoutName}" to window "${updatedConfig.name}"`);
          ui.notifications.info(`Scene "${layoutName}" assigned to window "${updatedConfig.name}"`);
          
          // Update the overlay window if it's open
          const { updateOverlayWindow } = await import('../overlay/window-management.js');
          
          // FIXED: Better window update logic
          if (result === "main") {
            if (window.overlayWindow && !window.overlayWindow.closed) {
              console.log(`${MODULE_ID} | Updating main overlay window`);
              updateOverlayWindow("main");
            }
          } else {
            if (window.overlayWindows && window.overlayWindows[result] && !window.overlayWindows[result].closed) {
              console.log(`${MODULE_ID} | Updating overlay window: ${result}`);
              updateOverlayWindow(result);
            }
          }
          
          // Refresh the layout manager to show updated usage
          this.render();
        } else {
          throw new Error(`Window configuration for "${result}" not found`);
        }
      } catch (error) {
        console.error(`${MODULE_ID} | Error assigning scene to window:`, error);
        ui.notifications.error("Failed to assign scene to window. Check console for details.");
      }
    }
  }

  async _onRename(event) {
    event.preventDefault();
    const oldName = event.currentTarget.dataset.layout;
    let newName = prompt("Enter a new name for this scene:", oldName);
    if (!newName || newName === oldName) return;

    const layouts = OverlayData.getLayouts();
    const validation = validateLayoutName(newName, layouts, oldName);
    if (!validation.isValid) {
      ui.notifications.error(validation.message);
      return;
    }

    try {
      // Get the layout data
      const layoutData = layouts[oldName];
      if (!layoutData) {
        ui.notifications.error(`Scene "${oldName}" not found.`);
        return;
      }
      
      console.log(`${MODULE_ID} | Renaming layout from "${oldName}" to "${newName}"`);
      
      // FIXED: Create a deep copy to avoid reference issues
      const layoutDataCopy = JSON.parse(JSON.stringify(layoutData));
      
      // Create new layout with new name
      await OverlayData.setLayout(newName, layoutDataCopy);
      
      // Update all windows that were using the old layout
      const windows = OverlayData.getOverlayWindows();
      const windowsToUpdate = [];
      
      for (const [windowId, windowConfig] of Object.entries(windows)) {
        if (windowConfig.activeLayout === oldName) {
          console.log(`${MODULE_ID} | Updating window ${windowId} from layout "${oldName}" to "${newName}"`);
          
          // FIXED: Create a copy of window config and update it
          const updatedWindowConfig = { ...windowConfig };
          updatedWindowConfig.activeLayout = newName;
          
          await OverlayData.setOverlayWindow(windowId, updatedWindowConfig);
          windowsToUpdate.push(windowId);
        }
      }
      
      // Update overlay windows to reflect the change
      if (windowsToUpdate.length > 0) {
        const { updateOverlayWindow } = await import('../overlay/window-management.js');
        
        for (const windowId of windowsToUpdate) {
          if (windowId === "main") {
            if (window.overlayWindow && !window.overlayWindow.closed) {
              updateOverlayWindow("main");
            }
          } else {
            if (window.overlayWindows && window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
              updateOverlayWindow(windowId);
            }
          }
        }
      }
      
      // Delete old layout after updating windows
      await OverlayData.deleteLayout(oldName);
      
      ui.notifications.info(`Scene renamed from "${oldName}" to "${newName}"`);
      
      this._refreshConfigWindows();
      this.render();
    } catch (error) {
      console.error(`${MODULE_ID} | Error renaming layout:`, error);
      ui.notifications.error(`Failed to rename scene: ${error.message}`);
    }
  }

  async _onDelete(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    
    if (layoutName === "Default") {
      ui.notifications.warn("Cannot delete the Default scene.");
      return;
    }
    
    try {
      const layouts = OverlayData.getLayouts();
      const layout = layouts[layoutName];
      if (!layout) {
        ui.notifications.warn(`Scene "${layoutName}" not found.`);
        return;
      }
      
      // Check for windows using this layout
      const windows = OverlayData.getOverlayWindows();
      const usedByWindows = Object.values(windows)
        .filter(w => w.activeLayout === layoutName)
        .map(w => w.name);
      
      if (usedByWindows.length > 0) {
        const windowNames = usedByWindows.join('", "');
        const confirmation = await Dialog.confirm({
          title: "Scene In Use",
          content: `This scene is currently used by the following windows: "${windowNames}". If you delete it, these windows will revert to the Default scene. Continue?`,
          yes: () => true,
          no: () => false
        });
        
        if (!confirmation) return;
        
        // Update windows to use Default layout
        const { updateOverlayWindow } = await import('../overlay/window-management.js');
        
        for (const windowId of Object.keys(windows)) {
          if (windows[windowId].activeLayout === layoutName) {
            // FIXED: Create a copy and update it
            const updatedConfig = { ...windows[windowId] };
            updatedConfig.activeLayout = "Default";
            
            await OverlayData.setOverlayWindow(windowId, updatedConfig);
            
            // Update the overlay window if it's open
            if (windowId === "main") {
              if (window.overlayWindow && !window.overlayWindow.closed) {
                updateOverlayWindow("main");
              }
            } else {
              if (window.overlayWindows && window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
                updateOverlayWindow(windowId);
              }
            }
          }
        }
      }
      
      // Final confirmation
      if (!await Dialog.confirm({
        title: "Delete Scene",
        content: `Are you sure you want to delete scene: ${layoutName}?`,
        yes: () => true,
        no: () => false
      })) return;
      
      console.log(`${MODULE_ID} | Deleting layout: ${layoutName}`);
      await OverlayData.deleteLayout(layoutName);
      ui.notifications.info(`Scene "${layoutName}" deleted.`);
      
      this._refreshConfigWindows();
      this.render();
    } catch (error) {
      console.error("Failed to delete layout:", error);
      ui.notifications.error(`Failed to delete scene: ${error.message}`);
    }
  }

  async _onExport(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    const layouts = OverlayData.getLayouts();
    
    try {
      const layoutData = JSON.parse(JSON.stringify(layouts[layoutName]));
      const data = JSON.stringify(layoutData, null, 2);
      
      const dialog = new Dialog({
        title: `Export Scene: ${layoutName}`,
        content: `
          <div>
            <p>Copy this JSON to save your scene or click "Download" to save as a file:</p>
            <textarea id="export-json" rows="15" style="width:100%; font-family: monospace; white-space: pre; overflow-x: auto;">${data}</textarea>
          </div>
        `,
        buttons: {
          copy: {
            icon: '<i class="fas fa-copy"></i>',
            label: "Copy to Clipboard",
            callback: () => {
              const textarea = document.getElementById('export-json');
              textarea.select();
              document.execCommand('copy');
              ui.notifications.info("Scene JSON copied to clipboard");
            }
          },
          download: {
            icon: '<i class="fas fa-download"></i>',
            label: "Download JSON",
            callback: () => {
              downloadAsFile(data, `${layoutName}-scene.json`);
            }
          },
          close: {
            icon: '<i class="fas fa-times"></i>',
            label: "Close"
          }
        },
        default: "copy",
        width: 600,
        height: 400
      });
      
      dialog.render(true);
    } catch (error) {
      console.error("Export error:", error);
      ui.notifications.error(`Failed to export scene: ${error.message}`);
    }
  }

  async _onImport(event) {
    event.preventDefault();
    const layoutName = prompt("Enter the name for the imported scene:");
    if (!layoutName) return;
    
    const layouts = OverlayData.getLayouts();
    const validation = validateLayoutName(layoutName, layouts);
    if (!validation.isValid) {
      ui.notifications.error(validation.message);
      return;
    }
    
    const dialog = new Dialog({
      title: "Import Scene JSON",
      content: `
        <form>
          <div class="form-group">
            <label>Paste the JSON for the scene:</label>
            <textarea id="import-json" rows="10" style="width:100%"></textarea>
          </div>
        </form>
      `,
      buttons: {
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: "Import",
          callback: async (html) => {
            try {
              const json = html.find("#import-json").val().trim();
              
              const normalizedJson = json
                .replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u0600-\u0604\u070F\u17B4\u17B5\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\uFFF0-\uFFFF]/g, "")
                .replace(/\\"/g, '"') 
                .replace(/\\\\/g, '\\');
              
              let importedLayout;
              try {
                importedLayout = JSON.parse(normalizedJson);
              } catch (parseError) {
                console.error("Parse error:", parseError);
                importedLayout = eval('(' + normalizedJson + ')');
              }
              
              if (!Array.isArray(importedLayout)) {
                throw new Error("Imported JSON is not a valid scene array");
              }
              
              console.log(`${MODULE_ID} | Importing layout: ${layoutName}`, importedLayout);
              await OverlayData.setLayout(layoutName, importedLayout);
              ui.notifications.info(`Imported scene: ${layoutName}`);
              
              this._refreshConfigWindows();
              this.render();
            } catch (e) {
              console.error("Import error:", e);
              ui.notifications.error(`Import failed: ${e.message}`);
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "import",
      width: 400
    });
    
    dialog.render(true);
  }

  async _onDuplicate(event) {
    event.preventDefault();
    
    if (!isPremiumActive()) {
      showPremiumRequiredDialog("Multiple scenes");
      return;
    }
    
    const originalLayoutName = event.currentTarget.dataset.layout;
    
    try {
      const layouts = OverlayData.getLayouts();
      
      if (!layouts[originalLayoutName]) {
        ui.notifications.error(`Scene "${originalLayoutName}" not found.`);
        return;
      }
      
      let baseName = originalLayoutName;
      let copyNumber = 1;
      let newLayoutName = `${baseName} (Copy)`;
      
      while (layouts[newLayoutName]) {
        copyNumber++;
        newLayoutName = `${baseName} (Copy ${copyNumber})`;
      }
      
      const customName = prompt("Enter a name for the duplicated scene:", newLayoutName);
      if (!customName) return;

      const validation = validateLayoutName(customName, layouts);
      if (!validation.isValid) {
        ui.notifications.error(validation.message);
        return;
      }
      
      // FIXED: Create a deep copy of the layout to avoid reference issues
      const originalLayout = layouts[originalLayoutName];
      const duplicatedLayout = JSON.parse(JSON.stringify(originalLayout));
      
      console.log(`${MODULE_ID} | Duplicating layout "${originalLayoutName}" as "${customName}"`);
      console.log("Original layout:", originalLayout);
      console.log("Duplicated layout:", duplicatedLayout);
      
      await OverlayData.setLayout(customName, duplicatedLayout);
      ui.notifications.info(`Scene "${originalLayoutName}" duplicated as "${customName}".`);
      
      this._refreshConfigWindows();
      this.render();
    } catch (error) {
      console.error("Duplication error:", error);
      ui.notifications.error(`Failed to duplicate scene: ${error.message}`);
    }
  }

  /**
   * Refresh any open config windows
   * @private
   */
  _refreshConfigWindows() {
    for (const app of Object.values(ui.windows)) {
      if (app.constructor.name === 'OverlayConfig') {
        app.render();
      }
    }
  }
}