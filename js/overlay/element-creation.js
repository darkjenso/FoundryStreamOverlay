// Enhanced dice animation system with proper BG3 style and simple animations
import { renderItemWithAnimations } from './animation-system.js';

/**
 * Creates a dice element for the overlay with improved visibility handling
 * @param {Object} item - The processed dice item
 * @param {Window} overlayWindow - The overlay window object
 * @returns {HTMLDivElement} The created dice element
 */
export function createDiceElement(item, overlayWindow) {
  const div = overlayWindow.document.createElement("div");
  
  // Base styling with dice-specific classes
  div.className = "overlay-item dice-item";
  div.style.cssText = "";
  
    const styleProperties = {
      position: "absolute",
      top: `${item.top}px`,
      left: `${item.left}px`,
      fontSize: `${item.fontSize}px`,
      fontFamily: item.fontFamily,
      color: item.fontColor,
      zIndex: item.renderOrder + 1000, // Higher z-index for dice
      fontWeight: item.bold ? "bold" : "normal",
      textAlign: "center",
      minWidth: "80px",
      transformOrigin: "center",
      transform: "translateX(-50%)",
      background: "none",
      backgroundColor: "transparent",
      padding: "0",
      margin: "0",
      border: "none",
      borderRadius: "0",
      boxShadow: "none",
      backdropFilter: "none",
      outline: "none",
      userSelect: "none",
      pointerEvents: "none",
      transition: "opacity 0.5s ease",
      overflow: "visible"
    };
  
  // Apply each style individually
  for (const [property, value] of Object.entries(styleProperties)) {
    div.style[property] = value;
  }
  
  // Add font stroke if needed
  if (item.fontStroke) {
    div.classList.add('text-stroked', 'dice-stroked');
    div.style.setProperty('--stroke-color', item.fontStrokeColor);
    div.style.webkitTextStroke = `${item.fontStrokeWidth}px ${item.fontStrokeColor}`;
    div.style.textStroke = `${item.fontStrokeWidth}px ${item.fontStrokeColor}`;
    div.style.paintOrder = "stroke fill";
  }
  
  if (!item.dropShadow) {
    div.style.setProperty('text-shadow', 'none', 'important');
    div.style.setProperty('filter', 'none', 'important');
  }
  
  // FIXED: Proper initial content and visibility handling
  if (item.alwaysVisible) {
    div.textContent = item.displayValue || item.diceType;
    div.style.setProperty('opacity', '1', 'important');
    div.classList.add('visible');
  } else {
    // Start completely hidden - no placeholder content visible
    div.textContent = item.diceType; // Still set content for sizing, but hidden
    div.style.setProperty('opacity', '0', 'important');
    div.style.setProperty('display', 'block', 'important'); // Ensure it can become visible
    div.classList.add('hidden');
  }
  
  // Store dice configuration
  div.dataset.diceType = item.diceType;
  if (item.itemIndex !== undefined) {
    div.dataset.index = item.itemIndex;
  }
  div.dataset.style = item.style;
  div.dataset.alwaysVisible = item.alwaysVisible;
  div.dataset.rollAnimation = item.rollAnimation;
  div.dataset.rollDuration = item.rollDuration;
  div.dataset.rollSpeed = item.rollSpeed;
  div.dataset.originalColor = item.fontColor;
  div.dataset.originalContent = div.textContent;
  
  
  return div;
}

/**
 * FIXED: Triggers a dice roll animation with proper BG3 style sequence
 * @param {HTMLElement} diceElement - The dice element to animate
 * @param {Object} rollData - The roll data from Foundry
 * @param {Window} overlayWindow - The overlay window
 */
export function triggerDiceAnimation(diceElement, rollData) {
  const style = diceElement.dataset.style || "diceOnly";
  const alwaysVisible = diceElement.dataset.alwaysVisible === "true";
  const rollAnim = diceElement.dataset.rollAnimation === "true";
  const rollDuration = Number(diceElement.dataset.rollDuration) || 1000;
  const rollSpeed = Number(diceElement.dataset.rollSpeed) || 10;

  clearDiceTimers(diceElement);

  const base = rollData.baseRoll ?? rollData.total;
  const total = rollData.total;
  let finalText = base.toString();

  if (style === "total") {
    finalText = total.toString();
  } else if (style === "expanded") {
    const mods = (rollData.modifiers || [])
      .map(m => (m.value >= 0 ? `+${m.value}` : m.value))
      .join(", ");
    finalText = mods ? `${base}(${mods})${total}` : `${base}(${total})`;
  } else if (style === "expandedNoBonuses") {
    finalText = `${base}(${total})`;
  } else if (style === "flyingBonuses") {
    finalText = total.toString();
  }

  const showFinal = () => {
    diceElement.textContent = finalText;
    diceElement.classList.add('landing');
    setTimeout(() => diceElement.classList.remove('landing'), 2000);
    startFadeOut();
  };


  // Fixed version of the runFlyingBonuses function
  const runFlyingBonuses = () => {
    diceElement.classList.add('animating');
    diceElement.innerHTML = '<span class="dice-number"></span>';
    const numberSpan = diceElement.querySelector('.dice-number');
    numberSpan.textContent = base.toString();
    
    // Make sure the dice element has proper positioning context
    diceElement.style.position = 'relative';
    
    let runningTotal = base;
    const mods = rollData.modifiers || [];

    const startDelay = 1000; // wait before first modifier
    const arcDuration = 1200; // arc animation time
    const pauseDuration = 600; // pause after each crash
    const step = arcDuration + pauseDuration;

    mods.forEach((m, idx) => {
      setTimeout(() => {
        const modEl = document.createElement('div');
        modEl.className = 'modifier-element';
        const label = m.label ? `${m.label} ` : '';
        modEl.textContent = `${label}${m.value >= 0 ? `+${m.value}` : m.value}`;
        
        // FIXED: Set proper positioning for modifier elements
        modEl.style.position = 'absolute';
        modEl.style.left = '50%';
        modEl.style.top = '0';
        modEl.style.transform = 'translateX(-50%)';
        modEl.style.zIndex = '1200';
        modEl.style.pointerEvents = 'none';
        modEl.style.fontWeight = 'bold';
        modEl.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
        modEl.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.4))';
        modEl.style.color = m.value >= 0 ? '#4ade80' : '#ef4444'; // Green for positive, red for negative
        
        diceElement.appendChild(modEl);

        // FIXED: Animation that properly positions relative to the dice element
        const animation = modEl.animate([
          { 
            transform: 'translateX(-50%) translateY(-2em)', 
            opacity: 0,
            scale: 0.8
          },
          { 
            transform: 'translateX(-50%) translateY(-3em)', 
            opacity: 1, 
            scale: 1.1,
            offset: 0.5 
          },
          { 
            transform: 'translateX(-50%) translateY(0em)', 
            opacity: 1,
            scale: 1.0
          }
        ], {
          duration: arcDuration,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // easeOutQuad for nice arc
          fill: 'forwards'
        });

        setTimeout(() => {
          // Add crash effect to the main dice element
          diceElement.classList.add('modifier-crash');
          runningTotal += m.value;
          numberSpan.textContent = runningTotal;
          
          // Flash effect on the modifier before it disappears
          modEl.style.color = '#ffffff';
          modEl.style.textShadow = '0 0 10px currentColor';
          
          // Remove modifier element after a brief flash
          setTimeout(() => {
            if (modEl.parentElement === diceElement) {
              diceElement.removeChild(modEl);
            }
          }, 300);
          
          setTimeout(() => diceElement.classList.remove('modifier-crash'), 700);
        }, arcDuration);
      }, startDelay + idx * step);
    });

    const delay = startDelay + mods.length * step + arcDuration;
    setTimeout(() => {
      // Add dramatic final flourish - BG3 style
      diceElement.classList.add('final-flourish');
      
      // Add extra shine effect to the number
      const numberSpan = diceElement.querySelector('.dice-number');
      if (numberSpan) {
        numberSpan.style.color = '#ffd700'; // Gold color
        numberSpan.style.textShadow = '0 0 30px #ffd700, 0 0 60px #ffaa00, 2px 2px 4px rgba(0,0,0,0.8)';
        numberSpan.style.filter = 'drop-shadow(0 0 20px rgba(255,215,0,0.8))';
      }
      
      setTimeout(() => {
        diceElement.classList.remove('final-flourish');
        diceElement.classList.add('landing');
        
        // Gradually restore original styling
        if (numberSpan) {
          numberSpan.style.transition = 'all 1s ease-out';
          numberSpan.style.color = diceElement.dataset.originalColor || '#ffffff';
          numberSpan.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
          numberSpan.style.filter = 'drop-shadow(0 0 8px rgba(255,255,255,0.3))';
        }
        
        setTimeout(() => {
          diceElement.classList.remove('landing');
          diceElement.classList.remove('animating');
          
          // Clear any inline styles
          if (numberSpan) {
            numberSpan.style.transition = '';
          }
        }, 1500);
      }, 1200); // Flourish duration
      
      startFadeOut();
    }, delay);
  };

  const startFadeOut = () => {
    if (!alwaysVisible) {
      diceElement.fadeTimeout = setTimeout(() => {
        diceElement.style.transition = "opacity 0.5s ease";
        diceElement.style.setProperty('opacity', '0', 'important');
        diceElement.resetTimeout = setTimeout(() => {
          diceElement.textContent = diceElement.dataset.originalContent || diceElement.dataset.diceType;
          diceElement.classList.remove('visible');
          diceElement.classList.add('hidden');
        }, 500);
      }, 10000);
    }
  };

  diceElement.style.setProperty('opacity', '1', 'important');
  diceElement.style.setProperty('display', 'block', 'important');
  diceElement.classList.remove('hidden');
  diceElement.classList.add('visible');

  if (rollAnim) {
    const range = getDiceRange(diceElement.dataset.diceType);
    const updateRandom = () => {
      const rand = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      diceElement.textContent = rand;
    };
    updateRandom();
    const interval = setInterval(updateRandom, rollSpeed);
    setTimeout(() => {
      clearInterval(interval);
      if (style === "flyingBonuses") {
        runFlyingBonuses();
      } else {
        showFinal();
      }    }, rollDuration);
  } else {
    if (style === "flyingBonuses") {
      runFlyingBonuses();
    } else {
      showFinal();
    }  }
}

function clearDiceTimers(element) {
  if (element.fadeTimeout) {
    clearTimeout(element.fadeTimeout);
    delete element.fadeTimeout;
  }
  if (element.resetTimeout) {
    clearTimeout(element.resetTimeout);
    delete element.resetTimeout;
  }
}

function getDiceRange(diceType) {
  const faces = parseInt(diceType?.replace('d', '')) || 20;
  return { min: 1, max: faces };
}



// Export other existing functions (image and text creation)
export function createImageElement(item, overlayWindow) {
  const img = overlayWindow.document.createElement("img");
  
  img.className = "overlay-item";
  img.src = item.imagePath;
  
  img.style.cssText = `
    position: absolute;
    top: ${item.top}px;
    left: ${item.left}px;
    width: ${item.imageSize}px;
    z-index: ${item.renderOrder};
  `;
  
  // Apply animations if needed
  if (item.animations && item.animations.length > 0) {
    renderItemWithAnimations(item, img, overlayWindow);
  } 
  else {
    const hasEntrance = item.entranceAnimation !== "none";
    const hasContinuous = item.animation !== "none";
    
    if (hasEntrance) {
      img.classList.add(item.entranceAnimation);
      img.style.animationDelay = `${item.entranceDelay}s`;
      img.style.animationDuration = `${item.entranceDuration}s`;
      
      if (hasContinuous) {
        img.addEventListener('animationend', () => {
          img.className = "overlay-item";
          void img.offsetWidth;
          img.className = `overlay-item ${item.animation}`;
          img.style.animationDelay = `${item.animationDelay}s`;
          img.style.animationDuration = `${item.animationDuration}s`;
        }, {once: true});
      }
    } else if (hasContinuous) {
      img.classList.add(item.animation);
      img.style.animationDelay = `${item.animationDelay}s`;
      img.style.animationDuration = `${item.animationDuration}s`;
    }
  }
  
  return img;
}

export function createTextElement(item, overlayWindow) {
  const div = overlayWindow.document.createElement("div");
  
  div.className = "overlay-item";
  div.style.cssText = "";
  
  const styleProperties = {
    position: "absolute",
    top: `${item.top}px`,
    left: `${item.left}px`,
    fontSize: `${item.fontSize}px`,
    fontFamily: item.fontFamily,
    color: item.fontColor,
    zIndex: item.renderOrder,
    fontWeight: item.bold ? "bold" : "normal",
    textAlign: "center",
    minWidth: "80px",
    transformOrigin: "center",
    transform: "translateX(-50%)",
    background: "none",
    backgroundColor: "transparent",
    padding: "0",
    margin: "0",
    border: "none",
    borderRadius: "0",
    boxShadow: "none",
    backdropFilter: "none",
    outline: "none"
  };
  
  for (const [property, value] of Object.entries(styleProperties)) {
    div.style[property] = value;
  }
  
  if (item.fontStroke) {
    div.classList.add('text-stroked');
    div.style.setProperty('--stroke-color', item.fontStrokeColor);
    div.style.webkitTextStroke = `${item.fontStrokeWidth}px ${item.fontStrokeColor}`;
    div.style.textStroke = `${item.fontStrokeWidth}px ${item.fontStrokeColor}`;
    div.style.paintOrder = "stroke fill";
  }
 
  if (item.dropShadow) {
    div.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
  }

  div.textContent = item.type === "static" ? item.content : item.data;
  
  if (item.type === "data") {
    div.dataset.path = item.dataPath === "custom" ? item.customPath : item.dataPath;
  }
  
  if (item.animations && item.animations.length > 0) {
    renderItemWithAnimations(item, div, overlayWindow);
  } 
  else {
    const hasEntrance = item.entranceAnimation !== "none";
    const hasContinuous = item.animation !== "none";
    
    if (hasEntrance) {
      div.classList.add(item.entranceAnimation);
      div.style.animationDelay = `${item.entranceDelay}s`;
      div.style.animationDuration = `${item.entranceDuration}s`;
      
      if (hasContinuous) {
        div.addEventListener('animationend', () => {
          div.className = "overlay-item";
          if (item.fontStroke) {
            div.classList.add('text-stroked');
          }
          void div.offsetWidth;
          div.className = `overlay-item ${item.animation}`;
          if (item.fontStroke) {
            div.classList.add('text-stroked');
          }
          div.style.animationDelay = `${item.animationDelay}s`;
          div.style.animationDuration = `${item.animationDuration}s`;
        }, {once: true});
      }
    } else if (hasContinuous) {
      div.classList.add(item.animation);
      div.style.animationDelay = `${item.animationDelay}s`;
      div.style.animationDuration = `${item.animationDuration}s`;
    }
  }
  
  return div;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function lerpColor(start, end, t) {
  const s = hexToRgb(start);
  const e = hexToRgb(end);
  const r = Math.round(s.r * t + e.r * (1 - t));
  const g = Math.round(s.g * t + e.g * (1 - t));
  const b = Math.round(s.b * t + e.b * (1 - t));
  return rgbToHex(r, g, b);
}

export function createHpBarElement(item, overlayWindow) {
  const container = overlayWindow.document.createElement('div');
  container.className = 'overlay-item hp-bar';
  container.style.position = 'absolute';
  container.style.top = `${item.top}px`;
  container.style.left = `${item.left}px`;
  container.style.width = `${item.barWidth}px`;
  container.style.height = `${item.barHeight}px`;
  container.style.zIndex = item.renderOrder;
  container.style.setProperty('background', item.showBackground ? item.backgroundColor : 'transparent', 'important');
  container.style.overflow = 'hidden';
  container.style.setProperty('border-radius', item.rounded ? `${item.cornerRadius}px` : '0', 'important');

  if (item.dropShadow) {
    container.style.setProperty('box-shadow', '2px 2px 4px rgba(0,0,0,0.5)', 'important');
  }

  const fill = overlayWindow.document.createElement('div');
  fill.className = 'hp-bar-fill';
  fill.style.position = 'absolute';
  fill.style.left = '0';
  fill.style.bottom = '0';
  fill.style.width = '100%';
  fill.style.height = '100%';
  fill.style.transformOrigin = 'left';
  fill.style.borderRadius = item.rounded ? `${item.cornerRadius}px` : '0';

  const pct = Math.round(item.pct * 100);
  if (item.orientation === 'rtl') {
    fill.style.right = '0';
    fill.style.left = 'auto';
    fill.style.transformOrigin = 'right';
    fill.style.width = `${pct}%`;
  } else if (item.orientation === 'ttb') {
    fill.style.top = '0';
    fill.style.bottom = 'auto';
    fill.style.height = `${pct}%`;
  } else if (item.orientation === 'btt') {
    fill.style.bottom = '0';
    fill.style.height = `${pct}%`;
  } else {
    fill.style.width = `${pct}%`;
  }

  if (item.gradient) {
    const color = lerpColor(item.startColor, item.endColor, item.pct);
    fill.style.background = color;
  } else {
    fill.style.background = item.singleColor;
  }

  container.appendChild(fill);

  if (item.outline) {
    const outlineDiv = overlayWindow.document.createElement('div');
    outlineDiv.style.position = 'absolute';
    outlineDiv.style.top = '0';
    outlineDiv.style.left = '0';
    outlineDiv.style.width = '100%';
    outlineDiv.style.height = '100%';
    outlineDiv.style.pointerEvents = 'none';
    outlineDiv.style.boxSizing = 'border-box';
    outlineDiv.style.border = `${item.outlineWidth}px solid ${item.outlineColor}`;
    outlineDiv.style.borderRadius = item.rounded ? `${item.cornerRadius}px` : '0';
    container.appendChild(outlineDiv);
  }


  if (item.animations && item.animations.length > 0) {
    renderItemWithAnimations(item, container, overlayWindow);
  } else {
    const hasEntrance = item.entranceAnimation !== 'none';
    const hasContinuous = item.animation !== 'none';

    if (hasEntrance) {
      container.classList.add(item.entranceAnimation);
      container.style.animationDelay = `${item.entranceDelay}s`;
      container.style.animationDuration = `${item.entranceDuration}s`;

      if (hasContinuous) {
        container.addEventListener('animationend', () => {
          container.className = 'overlay-item hp-bar';
          void container.offsetWidth;
          container.className = `overlay-item hp-bar ${item.animation}`;
          container.style.animationDelay = `${item.animationDelay}s`;
          container.style.animationDuration = `${item.animationDuration}s`;
        }, { once: true });
      }
    } else if (hasContinuous) {
      container.classList.add(item.animation);
      container.style.animationDelay = `${item.animationDelay}s`;
      container.style.animationDuration = `${item.animationDuration}s`;
    }
  }

  return container;
}

export function addPromoFooter(container, overlayWindow) {
  const promoFooter = overlayWindow.document.createElement("div");
  promoFooter.style.cssText = `
    position: absolute;
    bottom: 5px;
    right: 10px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    font-family: Arial, sans-serif;
    z-index: 9999;
  `;
  promoFooter.innerHTML = `Made by Jen. <a href="https://www.patreon.com/c/jenzelta" target="_blank" style="color:#FF424D;">Support on Patreon for premium features</a>`;
  container.appendChild(promoFooter);
}