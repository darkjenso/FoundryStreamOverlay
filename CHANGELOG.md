# Changelog

All notable changes to this project will be documented in this file.

All notable changes to **Foundry Stream Overlay** will be documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 18 April 2026

### Breaking

- **Free / Pro split** - Foundry Stream Overlay is now distributed as two separate modules:
  - **Foundry Stream Overlay Free** (`foundrystreamoverlay`) - one scene, basic animations, all core streaming features.
  - **Foundry Stream Overlay Pro** (`foundrystreamoverlaypro`) - everything in Free plus unlimited scenes, advanced animations, slideshow, multiple overlay windows, and no watermark. Distributed exclusively to Patreon subscribers.
  - If you were using Pro features in v4.x, download the Pro zip from Patreon and install it in place of the Free module. **All your scenes and settings are preserved** - both versions share the same data storage namespace.
- **Activation key system removed** - There is no longer an activation key, no server validation, and no Premium Status dialog. Pro features are unlocked simply by running the Pro module. The `activationKey` and `isPremium` settings have been removed.

### Added

- **True OBS transparency on /stream** - The /stream page now renders with a fully transparent background. Add it as an OBS Browser Source (tick Allow transparency) and your overlay elements float over your stream with no green screen or chroma key required.
- **/stream overlay rendering** - Overlay items from the configured window are now correctly injected and rendered on the /stream page using inline style overrides and a high-z-index container, guaranteeing they appear above all Foundry UI.
- **MutationObserver on /stream** - Foundry UI elements (canvas, navigation, hotbar, chat bubbles, etc.) that are dynamically added after page load are automatically hidden, keeping the overlay clean.
- **Get Pro button in Free settings** - An Upgrade to Foundry Stream Overlay Pro button appears in module settings when running the Free version, linking directly to the Patreon page.
- **One-time split announcement** - The first time a GM loads the Free version after upgrading from v4.x, a dialog explains the Free/Pro split and how to obtain the Pro version. Shown once, never again.
- **Conflict detection (Pro)** - If both the Free and Pro modules are active simultaneously, the Pro version detects this on load and shows a dialog prompting the GM to disable the Free version, preventing duplicate hooks and settings conflicts.
- **Overlay window on /stream is now a dropdown** - The plain text field has been replaced with a dropdown list of all configured overlay windows, defaulting to the first available window. The choices are refreshed from live data after OverlayData initialises.
- **PACKAGING.md** - Developer reference documenting the two-file packaging process (which files to swap, build commands, zip naming, and the user upgrade path).

### Changed

- **Foundry v14 verified** - module.json compatibility.verified updated to 14. Minimum remains 12.
- **Watermark rebranded** - The free-tier promotional footer now reads Foundry Stream Overlay FREE - Upgrade to Pro with the Patreon link, replacing the generic previous text.
- **/stream canvas hidden via JavaScript** - The WebGL canvas (#board, #canvas) is hidden directly via element.style.setProperty rather than CSS alone, since WebGL pixels cannot be made transparent through CSS.
- **/stream styles use both body.fso-stream-active and body.stream** - Stream CSS now targets both classes so transparency and UI hiding apply regardless of which class Foundry sets first.
- **Module data storage unchanged** - Both Free and Pro continue to store all data under MODULE_ID = foundrystreamoverlay, so upgrading between versions is lossless.

### Removed

- **Activation key verification** - activationKey setting, isPremium setting, Premium Status dialog, V2 API key validation, expiration check scheduling, and the V2 upgrade notification on load.
- **activationKey / isPremium from data-storage.js** - These fields are no longer read from or written to Foundry settings.

### Fixed

- **All settings menu buttons broken** - Manage Scenes, Edit Scene, Open Overlay, Window Manager, and Slideshow buttons in the module settings menu all silently failed to open in v4.x. Root cause: async render() in the anonymous menu stub classes returned a Promise that Foundry discarded, swallowing all errors. Fixed by making render() synchronous (returns this) with .then()/.catch() for the async import.
- **super.defaultOptions crash on v14** - All FormApplication subclasses now use super.defaultOptions ?? {} to guard against undefined being returned, which could crash mergeObject on Foundry v14.
- **Overlay items not rendering on /stream** - Container positioning, overflow, and z-index are now set via inline style.cssText rather than CSS class rules, bypassing any Foundry stylesheet overrides.
- **Chat bubbles visible on /stream** - #chat-bubbles is now explicitly targeted for hiding alongside the other Foundry UI elements on the stream page.

---
## [4.0.0] – 24 July 2025

###  Breaking
- **Codebase refactor**: The monolithic `foundrystreamoverlay.js`/`foundrystreamoverlay-layouts.js` files have been replaced by a modular structure under `js/core`, `js/ui`, and `js/overlay`. Any macros, scripts, or modules that imported functions directly from the old files will need updating.
- **Socket usage removed**: The module no longer opens a socket and no longer depends on `socketlib`. If you relied on socket events from previous versions, migrate to the new hook/events exposed in `js/core/hooks.js`.
- **Template paths changed**: HTML templates have moved/been renamed (e.g. `templates/window-manager.html`, `templates/animation-manager.html`). Update any custom overrides.
- **CSS restructuring**: Styles have been split into multiple files (`styles/animations.css`, `styles/core-overlay.css`, etc.). Custom CSS that targeted the old selectors may need adjusting.
- **Upgrade impact**: Upgrading to 4.0 may delete or reset layouts created in 3.x. Be sure to back up your overlay data before upgrading!

### Added
- **Animation Manager UI** to create entrance and continuous animations per item.  
- **Full animation system** for overlay items (`animation-system.js`) with queueing, event hooks, and critical/fumble cues.  
- **Enhanced dice-roll detection** (`dice-roll-handler.js`) with richer roll metadata and improved modifier/critical detection.  
- **Overlay Data Management panel** to import/export/reset all layouts and settings in a single JSON file.  
- **Window & layout management improvements**: dedicated templates and controllers for opening, duplicating, and managing multiple overlay windows.  
- **Responsive CSS utilities** and separate stylesheets for cleaner theming and easier customisation.  
- **Premium validation layer** (`js/premium/validation.js`) centralised and surfaced in relevant UIs with clearer notices.  
- **New macros pack structure** (LMDB based) to ship example macros more reliably.  
- **Media metadata** (icon/cover) and author fields added to `module.json` for nicer display.  
- **Standalone companion app**: local server provides true transparent overlays (no green screen/window capture).

### Changed
- **Module initialisation** moved to `js/core/module-init.js`; all hooks consolidated in `js/core/hooks.js`.  
- **Storage handling** centralised in `data-storage.js` with safer reads/writes.  
- **Config & settings UIs** reworked (`foundrystreamoverlay-config.html`, `window-config.html`) for clarity and consistency.  
- **Premium checks** now run on render rather than at construction time to prevent hard crashes.

### Removed
- `blank-config.json` (obsolete).  
- Legacy templates (`foundrystreamoverlay.html`, `window-manager.htm`).  
- Direct dependency on `socketlib` and related socket code.

### Fixed
- Numerous issues with multiple windows/layouts not updating in real time.  
- Dice animations occasionally failing to trigger for inline rolls.  
- Various race conditions around HP change animations and overlay refreshes.


## [3.5.1] - 2025-07-09
- Added a duplicate button on the overlay items to make it easier to add more of the same items with formating and more
- Verified functionality for foundry 13

## [3.4.3] - 2025-03-26
### Bug Fixes
Fixed some issues with multiple windows and layouts

## [3.4.1] - 2025-03-26
### Bug Fixes
- Fixed issue preventing premium activation

## [3.4.1] - 2025-03-25
### Bug Fixes
- Fixed small bug stopping users to change layouts on the config

## [3.4.0] - 2025-03-25

### Bug Fixes
- Fixed an issue that free users wereable to duplicate layouts

### New
- Added new data management code to possibly fix previously bugged users. when used should allow the user to wipe the data or save the files as a backup
- Added new fuction for Premium users allowing them to set the opening sizes of windows 

## [3.3.5] - 2025-03-22

### Bug Fixes
- Fixed an issue where free users couldnt see their overlay, removing legacy activation code had an annoying side effect!

## [3.3.4] - 2025-03-22

### Bug Fixes
- Custom data paths should now be fixed
- Removed some legacy code: activate button on layouts manager removed as layouts set up on window manager.

## [3.3.3] - 2025-03-21

### Bug Fixes
- small code fix


## [3.3.2] - 2025-03-21
### Bug Fixes
- Problem with other systems not working in the custom field should now be fixed.

## [3.3.1] - 2025-03-21

### Bug Fixes
- Fixed issue where non-premium users could create more than one window
- Resolved layout refresh issues when creating/editing layouts
- Changes made to layouts now immediately update in all open windows
- Layout dropdown in configuration panel now updates in real-time when layouts are created/modified
- Improved performance when making changes to layouts in multiple windows

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
