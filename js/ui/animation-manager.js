// Animation Manager UI Component - FIXED VERSION
import { MODULE_ID, ANIMATION_TYPES } from '../core/constants.js';
import { isPremiumActive, showPremiumRequiredDialog } from '../premium/validation.js';
import OverlayData from '../../data-storage.js';

export class AnimationManager extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Animation Manager",
      id: "foundrystreamoverlay-animation-manager",
      template: `modules/${MODULE_ID}/templates/animation-manager.html`,
      width: 700,
      height: "auto",
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "continuous"}]
    });
  }

  constructor(item, itemIndex, parentConfig) {
    super();
    
    this.item = foundry.utils.deepClone(item); // FIXED: Deep clone to avoid reference issues
    this.itemIndex = itemIndex;
    this.parentConfig = parentConfig;
    
    // Ensure animations array exists
    if (!this.item.animations) {
      this.item.animations = [];
    }
  }

  // FIXED: Check premium status in render instead of constructor
  async render(force = false, options = {}) {
    if (!isPremiumActive()) {
      showPremiumRequiredDialog("The Animation Manager");
      return null;
    }
    
    return super.render(force, options);
  }
  
  getData() {
    const allActors = game.actors.contents.filter(a => a.type === "character" || a.hasPlayerOwner);
    
    return {
      item: this.item,
      allActors: allActors, 
      continuousAnimations: ANIMATION_TYPES.CONTINUOUS,
      activeAnimations: (this.item.animations || []).filter(a => a.type === 'continuous'),
      isPremium: isPremiumActive()
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    console.log("Animation Manager activating listeners");
    
    html.find(".add-animation").click(this._onAddAnimation.bind(this));
    html.find(".remove-animation").click(this._onRemoveAnimation.bind(this));

    html.find('.tabs .item').click(ev => {
      const tab = $(ev.currentTarget).data('tab');
      this._tabs[0].activate(tab);
    });
  }
  
  async _onAddAnimation(event) {
    event.preventDefault();
    
    const html = $(event.currentTarget).closest('form');
    const type = $(event.currentTarget).data('type');
    const animation = html.find(`#${type}-animation`).val();
    
    if (!animation || animation === "none") {
      ui.notifications.warn("Please select an animation");
      return;
    }
    
    console.log(`Adding ${type} animation: ${animation}`);
    
    if (type !== "continuous") return;
    
    const newAnimation = {
      type: type,
      animation: animation,
      delay: 0,
      duration: Number(html.find(`#${type}-duration`).val()) || 1.5
    };
    
    // FIXED: Ensure animations array exists and add to it properly
    if (!this.item.animations) {
      this.item.animations = [];
    }
    
    this.item.animations.push(newAnimation);
    
    console.log("Added animation:", newAnimation);
    console.log("Current animations:", this.item.animations);
    
    // FIXED: Save immediately and wait for completion
    const saveSuccess = await this._saveItemAnimations();
    if (saveSuccess) {
      ui.notifications.info(`${type} animation added successfully`);
      this.render(); // Re-render to show the new animation
    } else {
      ui.notifications.error("Failed to save animation");
    }
  }
  
  async _onRemoveAnimation(event) {
    event.preventDefault();
    const type = $(event.currentTarget).data('type');
    const index = Number($(event.currentTarget).data('index'));

    if (type !== 'continuous') return;
    
    console.log(`Removing ${type} animation at index ${index}`);
    
    const animations = this.item.animations || [];
    let removeIndex = -1;
    let typeCount = 0;
    
    for (let i = 0; i < animations.length; i++) {
      if (animations[i].type === type) {
        if (typeCount === index) {
          removeIndex = i;
          break;
        }
        typeCount++;
      }
    }
    
    if (removeIndex >= 0) {
      this.item.animations.splice(removeIndex, 1);
      
      console.log("Removed animation, remaining:", this.item.animations);
      
      const saveSuccess = await this._saveItemAnimations();
      if (saveSuccess) {
        ui.notifications.info("Animation removed");
        this.render();
      } else {
        ui.notifications.error("Failed to remove animation");
      }
    }
  }
  
  // FIXED: Improved save method with better error handling and immediate overlay updates
  async _saveItemAnimations() {
    try {
      console.log("Saving animations for item at index", this.itemIndex);
      console.log("Animations to save:", this.item.animations);
      
      const layouts = OverlayData.getLayouts();
      const activeLayout = OverlayData.getActiveLayout() || "Default";
      
      if (!layouts[activeLayout]) {
        console.error("Active layout not found:", activeLayout);
        return false;
      }
      
      if (!layouts[activeLayout][this.itemIndex]) {
        console.error("Item not found at index:", this.itemIndex);
        return false;
      }
      
      // FIXED: Update the layout data properly
      const layoutItems = [...layouts[activeLayout]]; // Create a copy
      layoutItems[this.itemIndex] = { ...layoutItems[this.itemIndex] }; // Copy the item
      
      // Update animations
      layoutItems[this.itemIndex].animations = [...(this.item.animations || [])];
      
      
      console.log("Saving layout with updated item:", layoutItems[this.itemIndex]);
      
      // Save the updated layout
      await OverlayData.setLayout(activeLayout, layoutItems);
      
      // FIXED: Update parent config if it exists
      if (this.parentConfig && this.parentConfig.render) {
        this.parentConfig.render();
      }
      
      // FIXED: Force immediate overlay window update
      await this._updateOverlayWindows();
      
      console.log("Animation save completed successfully");
      return true;
      
    } catch (error) {
      console.error("Error saving animations:", error);
      return false;
    }
  }
  
  // FIXED: New method to properly update overlay windows
  async _updateOverlayWindows() {
    try {
      // Import the function dynamically to avoid circular dependencies
      const { updateOverlayWindow } = await import('../overlay/window-management.js');
      
      // Update main window if open
      if (window.overlayWindow && !window.overlayWindow.closed) {
        updateOverlayWindow("main");
      }
      
      // Update all other windows if they exist
      if (window.overlayWindows) {
        for (const [windowId, overlayWindow] of Object.entries(window.overlayWindows)) {
          if (overlayWindow && !overlayWindow.closed) {
            updateOverlayWindow(windowId);
          }
        }
      }
      
      console.log("Overlay windows updated after animation save");
      
    } catch (error) {
      console.error("Error updating overlay windows:", error);
    }
  }
  
  async _updateObject(event, formData) {
    // FIXED: Handle form data for duration changes
    console.log("Updating object with form data:", formData);
    
    for (const [key, value] of Object.entries(formData)) {
      const parts = key.split('.');
      if (parts.length === 3) {  
        const type = parts[0];
        const index = Number(parts[1]);
        const property = parts[2];
        
        const animations = this.item.animations || [];
        let targetIndex = -1;
        let typeCount = 0;
        
        for (let i = 0; i < animations.length; i++) {
          if (animations[i].type === type) {
            if (typeCount === index) {
              targetIndex = i;
              break;
            }
            typeCount++;
          }
        }
        
        if (targetIndex >= 0) {
          this.item.animations[targetIndex][property] = Number(value);
          console.log(`Updated animation ${targetIndex} ${property} to ${value}`);
        }
      }
    }
    
    await this._saveItemAnimations();
  }

  // FIXED: Static method to open animation manager with premium check
  static async openForItem(item, itemIndex, parentConfig) {
    if (!isPremiumActive()) {
      showPremiumRequiredDialog("The Animation Manager");
      return null;
    }
    
    console.log("Opening Animation Manager for item:", item);
    
    const manager = new AnimationManager(item, itemIndex, parentConfig);
    return manager.render(true);
  }
}