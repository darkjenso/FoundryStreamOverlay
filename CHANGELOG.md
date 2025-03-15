# Changelog

All notable changes to this project will be documented in this file.

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
