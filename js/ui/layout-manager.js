// Layout Manager UI Component
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
      width: 600,
      height: "auto",
      closeOnSubmit: true
    });
  }

getData() {
    const layouts = OverlayData.getLayouts();
    const activeLayout = OverlayData.getActiveLayout() || "Default";
    const isPremium = isPremiumActive();
    
    if (!isPremium && activeLayout !== "Default") {
      game.settings.set(MODULE_ID, "activeLayout", "Default");
    }
    
    // FIXED: Calculate which layouts are in use by which windows
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
    
    // Also check the global active layout setting
    const globalActiveLayout = activeLayout;
    if (globalActiveLayout && globalActiveLayout !== "Default") {
      if (!layoutUsage[globalActiveLayout]) {
        layoutUsage[globalActiveLayout] = [];
      }
      if (!layoutUsage[globalActiveLayout].includes("Global Setting")) {
        layoutUsage[globalActiveLayout].push("Global Setting");
      }
    }
    
    console.log(`${MODULE_ID} | Layout usage:`, layoutUsage);
    
    return { 
      layouts, 
      activeLayout: isPremium ? activeLayout : "Default", 
      isPremium,
      layoutUsage // Add usage information
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
  }

  async _onCreateNewLayout(event) {
    event.preventDefault();
    
    const layouts = OverlayData.getLayouts();
    
    if (!canCreateLayout(layouts)) {
      return;
    }
    
    const layoutName = prompt("Enter a new layout name:");
    if (!layoutName) return;

    const validation = validateLayoutName(layoutName, layouts);
    if (!validation.isValid) {
      ui.notifications.error(validation.message);
      return;
    }
    
    await OverlayData.setLayout(layoutName, []);
    ui.notifications.info(`Layout "${layoutName}" created.`);
    
    this._refreshConfigWindows();
    this.render();
  }

    async _onEditLayout(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    try {
      const { OverlayConfig } = await import('./overlay-config.js');
      const configApp = new OverlayConfig();
      configApp._selectedLayout = layoutName;
      configApp.render(true);
    } catch (error) {
      console.error('Failed to open layout config:', error);
      ui.notifications.error('Failed to open layout configuration.');
    }
  }

  async _onRename(event) {
    event.preventDefault();
    const oldName = event.currentTarget.dataset.layout;
    let newName = prompt("Enter a new name for this layout:", oldName);
    if (!newName || newName === oldName) return;

    const layouts = OverlayData.getLayouts();
    const validation = validateLayoutName(newName, layouts, oldName);
    if (!validation.isValid) {
      ui.notifications.error(validation.message);
      return;
    }

    // Get the layout data
    const layoutData = layouts[oldName];
    
    // Create new layout with new name
    await OverlayData.setLayout(newName, layoutData);
    
    // Delete old layout
    await OverlayData.deleteLayout(oldName);
    
    // Update active layout if it was the renamed one
    const activeLayout = OverlayData.getActiveLayout();
    if (activeLayout === oldName) {
      await game.settings.set(MODULE_ID, "activeLayout", newName);
    }
    
    this._refreshConfigWindows();
    this.render();
  }

  async _onDelete(event) {
    event.preventDefault();
    const layoutName = event.currentTarget.dataset.layout;
    
    if (layoutName === "Default") {
      ui.notifications.warn("Cannot delete the Default layout.");
      return;
    }
    
    try {
      const layout = OverlayData.getLayout(layoutName);
      if (!layout) {
        ui.notifications.warn(`Layout "${layoutName}" not found.`);
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
          title: "Layout In Use",
          content: `This layout is currently used by the following windows: "${windowNames}". If you delete it, these windows will revert to the Default layout. Continue?`,
          yes: () => true,
          no: () => false
        });
        
        if (!confirmation) return;
        
        // Update windows to use Default layout
        for (const windowId of Object.keys(windows)) {
          if (windows[windowId].activeLayout === layoutName) {
            const updatedConfig = { ...windows[windowId], activeLayout: "Default" };
            await OverlayData.setOverlayWindow(windowId, updatedConfig);
          }
        }
      }
      
      // Final confirmation
      if (!await Dialog.confirm({
        title: "Delete Layout",
        content: `Are you sure you want to delete layout: ${layoutName}?`,
        yes: () => true,
        no: () => false
      })) return;
      
      await OverlayData.deleteLayout(layoutName);
      ui.notifications.info(`Layout "${layoutName}" deleted.`);
      
      this._refreshConfigWindows();
      this.render();
    } catch (error) {
      console.error("Failed to delete layout:", error);
      ui.notifications.error(`Failed to delete layout: ${error.message}`);
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
        title: `Export Layout: ${layoutName}`,
        content: `
          <div>
            <p>Copy this JSON to save your layout or click "Download" to save as a file:</p>
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
              ui.notifications.info("Layout JSON copied to clipboard");
            }
          },
          download: {
            icon: '<i class="fas fa-download"></i>',
            label: "Download JSON",
            callback: () => {
              downloadAsFile(data, `${layoutName}-layout.json`);
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
      ui.notifications.error(`Failed to export layout: ${error.message}`);
    }
  }

  async _onImport(event) {
    event.preventDefault();
    const layoutName = prompt("Enter the name for the imported layout:");
    if (!layoutName) return;
    
    const dialog = new Dialog({
      title: "Import Layout JSON",
      content: `
        <form>
          <div class="form-group">
            <label>Paste the JSON for the layout:</label>
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
                throw new Error("Imported JSON is not a valid layout array");
              }
              
              await OverlayData.setLayout(layoutName, importedLayout);
              ui.notifications.info(`Imported layout: ${layoutName}`);
              
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
      showPremiumRequiredDialog("Multiple layouts");
      return;
    }
    
    const originalLayoutName = event.currentTarget.dataset.layout;
    
    try {
      const layouts = OverlayData.getLayouts();
      
      if (!layouts[originalLayoutName]) {
        ui.notifications.error(`Layout "${originalLayoutName}" not found.`);
        return;
      }
      
      let baseName = originalLayoutName;
      let copyNumber = 1;
      let newLayoutName = `${baseName} (Copy)`;
      
      while (layouts[newLayoutName]) {
        copyNumber++;
        newLayoutName = `${baseName} (Copy ${copyNumber})`;
      }
      
      const customName = prompt("Enter a name for the duplicated layout:", newLayoutName);
      if (!customName) return;

      const validation = validateLayoutName(customName, layouts);
      if (!validation.isValid) {
        ui.notifications.error(validation.message);
        return;
      }
      
      const duplicatedLayout = JSON.parse(JSON.stringify(layouts[originalLayoutName]));
      await OverlayData.setLayout(customName, duplicatedLayout);
      ui.notifications.info(`Layout "${originalLayoutName}" duplicated as "${customName}".`);
      
      this._refreshConfigWindows();
      this.render();
    } catch (error) {
      console.error("Duplication error:", error);
      ui.notifications.error(`Failed to duplicate layout: ${error.message}`);
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