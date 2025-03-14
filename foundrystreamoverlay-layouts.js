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
      // If the old layout was active, update activeLayout.
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
  