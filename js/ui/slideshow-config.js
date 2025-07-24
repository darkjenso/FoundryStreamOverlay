// Slideshow Configuration UI Component - FIXED IMPORTS
import { MODULE_ID, LAYOUT_TRANSITIONS } from '../core/constants.js';
import { isPremiumActive, showPremiumRequiredDialog } from '../premium/validation.js';
import OverlayData from '../../data-storage.js';

export class SlideshowConfig extends FormApplication {
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
    const slideshow = OverlayData.getSlideshow();
    const layouts = OverlayData.getLayouts();
    const availableLayouts = Object.keys(layouts);
    
    const windows = OverlayData.getOverlayWindows() || {
      "main": { id: "main", name: "Main Overlay" }
    };
    
    return {
      slideshowItems: slideshow.list,
      availableLayouts,
      windows,
      random: slideshow.random,
      transition: slideshow.transition,
      transitionDuration: slideshow.transitionDuration,
      targetWindow: slideshow.targetWindow || "main"
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
    const selectedLayout = $(event.currentTarget).closest("form").find("#new-layout-dropdown").val();
    const slideshow = OverlayData.getSlideshow();
    
    slideshow.list.push({ layout: selectedLayout, duration: 10 });
    await OverlayData.setSlideshow(slideshow);
    this.render();
  }

  async _onRemoveItem(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const slideshow = OverlayData.getSlideshow();
    
    slideshow.list.splice(index, 1);
    await OverlayData.setSlideshow(slideshow);
    this.render();
  }

  async _onMoveUp(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const slideshow = OverlayData.getSlideshow();
    
    if (index > 0) {
      [slideshow.list[index - 1], slideshow.list[index]] = 
      [slideshow.list[index], slideshow.list[index - 1]];
      
      await OverlayData.setSlideshow(slideshow);
      await this._updateAllWindows();
      this.render();
    }
  }
  
  async _onMoveDown(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const slideshow = OverlayData.getSlideshow();
    
    if (index < slideshow.list.length - 1) {
      [slideshow.list[index], slideshow.list[index + 1]] = 
      [slideshow.list[index + 1], slideshow.list[index]];
      
      await OverlayData.setSlideshow(slideshow);
      await this._updateAllWindows();
      this.render();
    }
  }

  async _onStartSlideshow(event) {
    event.preventDefault();

    if (!isPremiumActive()) {
      showPremiumRequiredDialog("Slideshow feature");
      return;
    }
      
    const slideshow = OverlayData.getSlideshow();
    
    console.log("Starting slideshow with settings:", slideshow);
    
    if (slideshow.list.length === 0) {
      ui.notifications.warn("No layouts in slideshow.");
      return;
    }
    
    const windowId = slideshow.targetWindow || "main";
    const targetWindow = window.overlayWindows?.[windowId];
    
    if (!targetWindow || targetWindow.closed) {
      const { openOverlayWindow } = await import('../overlay/window-management.js');
      openOverlayWindow(windowId);
    }
    
    const checkWindowValidity = () => {
      const windowValid = window.overlayWindows 
        && window.overlayWindows[windowId] 
        && !window.overlayWindows[windowId].closed 
        && window.overlayWindows[windowId].document;
      
      const containerValid = windowValid && window.overlayWindows[windowId].document.getElementById('overlay-container');
      
      if (!windowValid || !containerValid) {
        console.error("Window validity check failed:", {
          windowExists: !!window.overlayWindows && !!window.overlayWindows[windowId],
          windowClosed: window.overlayWindows?.[windowId]?.closed,
          documentExists: windowValid,
          containerExists: containerValid
        });
      }
      
      return windowValid && containerValid;
    };
    
    const waitForWindow = (timeout = 5000) => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (checkWindowValidity()) {
            clearInterval(checkInterval);
            resolve();
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(new Error("Failed to initialize overlay window"));
          }
        }, 100);
      });
    };
    
    try {
      await waitForWindow();
      
      this._onStopSlideshow(null);
      
      window.foundryStreamSlideshowRunning = true;
      window.foundryStreamSlideshowIndex = 0;
      window.foundryStreamSlideshowWindow = windowId;
      
      const runSlide = async () => {
        console.log("Slideshow run started", {
          running: window.foundryStreamSlideshowRunning,
          windowId: window.foundryStreamSlideshowWindow,
          windowValid: checkWindowValidity()
        });
        
        if (!window.foundryStreamSlideshowRunning || !checkWindowValidity()) {
          console.log("Slideshow stopped due to invalid window or stopped state");
          this._onStopSlideshow(null);
          return;
        }
        
        const currentSlideshow = OverlayData.getSlideshow();
        
        if (currentSlideshow.list.length === 0) {
          console.log("No layouts in slideshow");
          this._onStopSlideshow(null);
          return;
        }
        
        let currentItem;
        let nextIndex;
        
        if (currentSlideshow.random) {
          nextIndex = Math.floor(Math.random() * currentSlideshow.list.length);
          currentItem = currentSlideshow.list[nextIndex];
        } else {
          nextIndex = window.foundryStreamSlideshowIndex;
          currentItem = currentSlideshow.list[nextIndex];
          window.foundryStreamSlideshowIndex = 
            (window.foundryStreamSlideshowIndex + 1) % currentSlideshow.list.length;
        }
        
        const overlayWindow = window.overlayWindows[windowId];
        const container = overlayWindow.document.getElementById("overlay-container");
        if (!container) {
          console.error("Overlay container not found!");
          this._onStopSlideshow(null);
          return;
        }
        
        const transition = currentSlideshow.transition || "none";
        const transitionDuration = currentSlideshow.transitionDuration || 0.5;
        
        try {
          const windows = OverlayData.getOverlayWindows();
          const windowConfig = windows[windowId] || windows.main;
          const currentLayoutName = windowConfig.activeLayout;
          const nextLayoutName = currentItem.layout;
          
          console.log(`Transitioning from ${currentLayoutName} to ${nextLayoutName} in window ${windowId}`);
          
          if (currentLayoutName !== nextLayoutName) {
            // Update the window config with the new layout
            const updatedConfig = { ...windowConfig, activeLayout: nextLayoutName };
            await OverlayData.setOverlayWindow(windowId, updatedConfig);
            
            const { updateOverlayWindow } = await import('../overlay/window-management.js');
            updateOverlayWindow(windowId);
            
            const tempDiv = overlayWindow.document.createElement('div');
            tempDiv.innerHTML = container.innerHTML;
            
            // Temporarily set window back to previous layout
            const revertConfig = { ...windowConfig, activeLayout: currentLayoutName };
            await OverlayData.setOverlayWindow(windowId, revertConfig);
            
            const { updateOverlayWindow: updateOverlay } = await import('../overlay/window-management.js');
            updateOverlay(windowId);
            
            if (transition !== "none" && LAYOUT_TRANSITIONS[transition]) {
              try {
                console.log(`Executing ${transition} transition`);
                await LAYOUT_TRANSITIONS[transition].execute(container, transitionDuration, tempDiv.innerHTML);
              } catch (transitionError) {
                console.error("Transition error:", transitionError);
                container.innerHTML = tempDiv.innerHTML;
              }
            }
            
            // Set window to the new layout after transition
            await OverlayData.setOverlayWindow(windowId, updatedConfig);
            const { updateOverlayWindow: updateFinal } = await import('../overlay/window-management.js');
            updateFinal(windowId);
          }
          
          window.foundryStreamSlideshowTimeout = setTimeout(
            () => runSlide(), 
            currentItem.duration * 1000
          );
        } catch (error) {
          console.error("Slideshow iteration error:", error);
          this._onStopSlideshow(null);
        }
      };
      
      
      await runSlide();
      
      ui.notifications.info(`Slideshow started on ${windowId === "main" ? "Main Window" : "Window " + windowId}!`);
    } catch (initError) {
      console.error("Slideshow initialization error:", initError);
      ui.notifications.error(`Failed to start slideshow. Please open window ${windowId} first.`);
      this._onStopSlideshow(null);
    }
    
    if (game.settings.get(MODULE_ID, "autoSyncStandalone")) {
      try {
        const { liveSync } = await import('../utils/live-sync.js');
        liveSync.queueSync("slideshow-change");
      } catch (error) {
        // Live sync not available
      }
    }
  }

  _onStopSlideshow(event) {
    if (event) event.preventDefault();
    
    if (window.foundryStreamSlideshowTimeout) {
      clearTimeout(window.foundryStreamSlideshowTimeout);
      window.foundryStreamSlideshowTimeout = null;
    }
    
    window.foundryStreamSlideshowRunning = false;
    window.foundryStreamSlideshowIndex = 0;
    window.foundryStreamSlideshowWindow = null;
    
    if (event) {
      ui.notifications.info("Slideshow stopped.");
    }
  }

  async _updateObject(event, formData) {
    event.preventDefault();
    
    console.log("Slideshow form data:", formData);
    
    const slideshowData = { 
      list: [], 
      random: false,
      transition: "none",
      transitionDuration: 0.5,
      targetWindow: formData.targetWindow || "main"
    };
    const temp = {};
    
    for (let [key, value] of Object.entries(formData)) {
      const [field, index] = key.split("-");
      if (index !== undefined) {
        if (!temp[index]) temp[index] = {};
        temp[index][field] = value;
      }
    }
    
    for (let key in temp) {
      if (temp[key].layout) {
        slideshowData.list.push({
          layout: temp[key].layout,
          duration: Number(temp[key].duration) || 10
        });
      }
    }
    
    slideshowData.random = formData.random === "on";
    slideshowData.transition = formData.transition || "none";
    slideshowData.transitionDuration = Number(formData.transitionDuration) || 0.5;
    
    console.log("Processed slideshow data:", slideshowData);
    
    await OverlayData.setSlideshow(slideshowData);
    ui.notifications.info("Slideshow configuration saved.");
  }

  async _updateAllWindows() {
    try {
      const { updateOverlayWindow } = await import('../overlay/window-management.js');
      
      if (window.overlayWindow && !window.overlayWindow.closed) {
        updateOverlayWindow("main");
      }
      
      const windows = OverlayData.getOverlayWindows() || {};
      if (window.overlayWindows) {
        for (const [windowId, windowConfig] of Object.entries(windows)) {
          if (window.overlayWindows[windowId] && !window.overlayWindows[windowId].closed) {
            updateOverlayWindow(windowId);
          }
        }
      }
    } catch (error) {
      console.error("Error updating overlay windows:", error);
    }
  }
}