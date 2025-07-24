# Foundry Stream Overlay 4.0

Create stunning, dynamic green‑screen overlays from your Foundry VTT game and drop them straight into OBS (or any broadcast software). Show live stats, dice rolls, animations and more—no browser-source fiddling each session.

![Overlay demo](https://i.imgur.com/aonls1x.jpeg)

## Main New Features in 4.0

- **Modular codebase**: Massive refactor into `js/core`, `js/ui`, and `js/overlay`, delivering faster load and reaction times.  
- **Redesigned UI**: Modernised look and improved functionality for all configuration and overlay windows.  
- **Dice roll display**: Live roll results on overlay with multiple styling/display options. Two premium extras:  
  - **Simple roll animation**: brief animation before the final number appears.  
  - **BG3 style**: incremental bonus values crash into and build up the displayed result.  
- **Fully customisable HP bars**: Tailor size, colour, segments—and soon extend with image overlays and rich graphics.  
- **Standalone companion app (coming soon)**: local server enabling true transparent overlays (no green screen). Development ongoing for a 4.x patch.

## Installation

1. In Foundry VTT, go to **Add‑on Modules → Install Module**.  
2. Paste the manifest URL:  
   `https://raw.githubusercontent.com/darkjenso/FoundryStreamOverlay/refs/heads/main/module.json`  
3. Click **Install**, then enable the module in your World.

> **Updating from ≤3.5.1?** Export your overlay data first (Module Settings → Data Management). Some CSS selectors and template paths have changed—double‑check any custom overlays/macros.  
> 🚨 **Warning:** Upgrading to 4.0 may **delete or reset** layouts created in 3.x. Back up all your layouts/settings before updating!

## Quick Start

1. **Open the Overlay Window** via module settings or macro. Point OBS to that URL (Browser Source + chroma key if needed).  
2. **Create/Load a Layout**: add HP bars, portraits, status effects, dice results, etc. Duplicate items with the new button to speed builds.  
3. **Add Animations (Premium)**: use the Animation Manager to define entrance/loop animations.  
4. **Save/Export** your setup to a JSON file for backup.

   ![config tool](https://i.imgur.com/7Z4W8oL.png)

## Features

- Multiple Overlay Windows  
- Layout System  
- Live Stat Tracking  
- Dice Roll Visuals with crit/fumble flair  
- Animation System with hooks and queues  
- Responsive Design across resolutions  
- Import/Export & Reset  

## Standalone Companion App (Coming Soon)

A separate app will spin up a local server and render true transparent overlays (alpha channel), removing the need for chroma key or window capture. First release will require an **active monthly Patreon subscription**.

## Premium vs Free

The core overlay is free. Premium unlocks advanced tools:

- **How to get Premium**: support on Patreon to receive a one‑time activation key.  
- **Activation**: one‑time for 4.x—no recurring online check.  
- **Future model may change**: subscription or per‑version keys may be introduced.

If opened without a licence, premium‑only UI shows a friendly purchase prompt.

## Configuration & Customisation

- **Settings**: *Configuration → Module Settings → Foundry Stream Overlay*  
- **CSS**: drop overrides into your theme or `styles/*.css`.  
- **Macros**: example pack in the compendium. Hooks are in `js/core/hooks.js`.

## Known Limitations

- Some systems need custom field mappings.  
- Many simultaneous animations may impact low‑end hardware.

## Known Issues

- Triggered/entrance animations are temporarily disabled due to integration issues with the companion app. A fix is in progress.

## Contributing & Support

Source‑Available Proprietary Licence (see `LICENCE.md`).  
Questions or tweaks? Open an issue on GitHub.
