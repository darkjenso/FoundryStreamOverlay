// Animation Manager UI Component - FIXED LAYOUT CONTEXT VERSION
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

  constructor(item, itemIndex, parentConfig, layoutName) {
    super();
    
    this.item = foundry.utils.deepClone(item);
    this.itemIndex = itemIndex;
    this.parentConfig = parentConfig;
    
    // FIXED: Store the specific layout context
    this.layoutName = layoutName || "Default";
    
    console.log(`${MODULE_ID} | Animation Manager created for item ${itemIndex} in layout: ${this.layoutName}`);
    
    // Ensure animations array exists
    if (!this.item.animations) {
      this.item.animations = [];
    }
  }

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
      isPremium: isPremiumActive(),
      layoutName: this.layoutName, // Include layout context for debugging
      itemIndex: this.itemIndex
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    console.log(`${MODULE_ID} | Animation Manager activating listeners for layout: ${this.layoutName}`);
    
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
    
    console.log(`${MODULE_ID} | Adding ${type} animation: ${animation} to layout: ${this.layoutName}`);
    
    if (type !== "continuous") return;
    
    const newAnimation = {
      type: type,
      animation: animation,
      delay: 0,
      duration: Number(html.find(`#${type}-duration`).val()) || 1.5
    };
    
    if (!this.item.animations) {
      this.item.animations = [];
    }
    
    this.item.animations.push(newAnimation);
    
    console.log("Added animation:", newAnimation);
    console.log("Current animations:", this.item.animations);
    
    const saveSuccess = await this._saveItemAnimations();
    if (saveSuccess) {
      ui.notifications.info(`${type} animation added successfully`);
      this.render();
    } else {
      ui.notifications.error("Failed to save animation");
    }
  }
  
  async _onRemoveAnimation(event) {
    event.preventDefault();
    const type = $(event.currentTarget).data('type');
    const index = Number($(event.currentTarget).data('index'));

    if (type !== 'continuous') return;
    
    console.log(`${MODULE_ID} | Removing ${type} animation at index ${index} from layout: ${this.layoutName}`);
    
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
  
  // FIXED: Save to the specific layout context, not global active layout
  async _saveItemAnimations() {
    try {
      console.log(`${MODULE_ID} | Saving animations for item ${this.itemIndex} in layout: ${this.layoutName}`);
      console.log("Animations to save:", this.item.animations);
      
      const layouts = OverlayData.getLayouts();
      
      // FIXED: Use the specific layout we're working with
      if (!layouts[this.layoutName]) {
        console.error(`Layout not found: ${this.layoutName}`);
        return false;
      }
      
      if (!layouts[this.layoutName][this.itemIndex]) {
        console.error(`Item not found at index: ${this.itemIndex} in layout: ${this.layoutName}`);
        return false;
      }
      
      // Create a copy of the layout data
      const layoutItems = [...layouts[this.layoutName]];
      layoutItems[this.itemIndex] = { ...layoutItems[this.itemIndex] };
      
      // Update animations
      layoutItems[this.itemIndex].animations = [...(this.item.animations || [])];
      
      console.log(`${MODULE_ID} | Saving layout ${this.layoutName} with updated item:`, layoutItems[this.itemIndex]);
      
      // Save the updated layout
      await OverlayData.setLayout(this.layoutName, layoutItems);
      
      // Update parent config if it exists
      if (this.parentConfig && this.parentConfig.render) {
        this.parentConfig.render();
      }
      
      // Force immediate overlay window update
      await this._updateOverlayWindows();
      
      console.log(`${MODULE_ID} | Animation save completed successfully for layout: ${this.layoutName}`);
      return true;
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error saving animations:`, error);
      return false;
    }
  }
  
  async _updateOverlayWindows() {
    try {
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
      
      console.log(`${MODULE_ID} | Overlay windows updated after animation save`);
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error updating overlay windows:`, error);
    }
  }
  
  async _updateObject(event, formData) {
    console.log(`${MODULE_ID} | Updating animation object with form data for layout: ${this.layoutName}`, formData);
    
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
          console.log(`Updated animation ${targetIndex} ${property} to ${value} in layout: ${this.layoutName}`);
        }
      }
    }
    
    await this._saveItemAnimations();
  }

  // FIXED: Static method with layout context
  static async openForItem(item, itemIndex, parentConfig, layoutName = null) {
    if (!isPremiumActive()) {
      showPremiumRequiredDialog("The Animation Manager");
      return null;
    }
    
    // FIXED: Determine the layout context
    let contextLayout = layoutName;
    if (!contextLayout && parentConfig && parentConfig._selectedLayout) {
      contextLayout = parentConfig._selectedLayout;
    }
    if (!contextLayout) {
      contextLayout = "Default";
    }
    
    console.log(`${MODULE_ID} | Opening Animation Manager for item ${itemIndex} in layout: ${contextLayout}`);
    
    const manager = new AnimationManager(item, itemIndex, parentConfig, contextLayout);
    return manager.render(true);
  }
}