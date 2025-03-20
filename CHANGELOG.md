# Changelog

All notable changes to this project will be documented in this file.

## [3.2.1] - 2025-03-20

### New
- Added a "custom" data field for other details to be tracked or from other game systems. Unsure if working, will need testing.

## [3.2.1] - 2025-03-19

### Bug Fixes
- Accidentally uploaded a earlier test  file causing only one font to appear. 
-  Working through bugs to get triggered animations working. still ongoing

## [3.2.0] - 2025-03-17

### Added
- New Animation Manager interface for creating complex animations and multiple animations
 - Ability to add multiple animations to a single overlay item
 - Support for different types of animations:
   - Continuous animations (ongoing effects)
   - Entrance animations (one-time effects when item appears)
   - Trigger-based animations (activated by specific events) *new*

### Trigger-Based Animations - Still testing -
- Introduced dynamic animations triggered by game events
- HP Change Animations
 - Animations can now be triggered when:
   - HP decreases
   - HP increases
   - HP falls below a specific threshold
- Added specific animation effects for HP changes
 - Damage animations with color and movement effects
 - Healing animations with positive color indicators
- Animation trigger for status effects

### Improvements

- Simplified overlay configuration interface


### Bug Fixes
- Improved stability of animation rendering

## [3.1.1] - 2025-03-17
### Added
- Duplicate layout functionality for easily creating variations of existing layouts
- Layout name length validation to prevent issues with excessively long names
- Premium feature messaging in the layout manager interface

### Fixed
- Issue with layout deletion not working properly for certain layouts
- Text animation issues when using centered text alignment
- Image animation functionality restored
- Improved import/export process for layout configurations
- Enhanced error handling and user feedback throughout the interface

### Improved
- More robust JSON handling for layout import/export
- Better visual feedback for premium vs. free features
- Additional safeguards when manipulating layout data

## [3.1.0] - 2025-03-20
### Added
- Text centering functionality for all text elements, that way when HP for example updates from double or triple to single digits, it stays centered on the location it was placed.
- Auto-save for configuration changes so all changes appear immediatly. no more neeed for the save button!
- Scrollable layout configuration interface

### Improved
- Enhanced user experience with visual feedback on auto-save
- More intuitive configuration panel with fixed header and footer
- Better visual organization of configuration elements

### Fixed
- Incorrect class data display for DnD5e characters, was previously just saying "N/A"
- Layout management for large numbers of overlay elements

## [3.0.0] - 2025-03-16
### Added
- Premium feature tier system
- Comprehensive slideshow functionality
- Advanced animation options
- Multiple layout management for premium users
- Patreon integration for premium feature activation
- Enhanced macro support for layout and overlay control
- Compendium of example macros

### Premium Features
- Multiple layout creation
- Entrance and continuous animations
- Slideshow mode with customizable transitions
- Removal of promotional footer

### Improvements
- Refined settings interface
- More flexible data path selection
- Improved performance and stability
- Enhanced cross-system compatibility

## [2.2.0] - 2025-03-15
- Added a dedicated Slideshow Settings window, allowing users to create and manage a slideshow of overlay layouts.
- Users can add multiple layouts to the slideshow with individual duration settings and reorder them.
- Introduced a "Random Order" option that shuffles the layouts randomly instead of cycling through them sequentially.
- Improved UI aesthetics by placing the layout dropdown inline with the add button, and by featuring play/pause icons on the start/stop slideshow buttons.


## [2.1.1] - 2025-03-14
Added back the font options

## [2.1.0] - 2025-03-14
- Added a layout manager—users can now save multiple different layouts, import and export layouts, and dynamically change the layout as needed.
- Users can use a macro as below to change layouts without going into the settings:

```
// Replace "MyLayoutName" with the layout you wish to activate.
let newLayout = "MyLayoutName";
game.settings.set("foundrystreamoverlay", "activeLayout", newLayout)
  .then(() => {
    ui.notifications.info(`Active layout set to ${newLayout}`);
    if (window.foundryStreamOverlayApp) {
      window.foundryStreamOverlayApp.render();
    }
  })
  .catch(err => console.error("Failed to set active layout:", err));
```



## [2.0.0] - 2025-03-14
a complete rework of the module, adds loads of customisable options and data to make whatever kind of overlay you want!
### Added
- Dynamic overlay configuration with per-item text styling and animations.
- New "Add Image" functionality for background images.
- Order controls to manage layering (Up/Down buttons).

### Changed
- Updated Foundry compatibility settings.
- Improved configuration UI with a reorder column.

### Fixed
- Z-index layering issues.
- Several UI glitches in the overlay settings.

## [1.4.4] - 2025-01-13
### Fixed
- Minor bug fixes with actor data retrieval.
