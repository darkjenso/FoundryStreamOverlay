# Packaging Guide — Free vs Pro

Both distributions come from **this single codebase**.
Only **two files** differ between them.

---

## Differences at a glance

| | Free | Pro |
|---|---|---|
| `module.json` id | `foundrystreamoverlay` | `foundrystreamoverlaypro` |
| `module.json` title | "Foundry Stream Overlay Free" | "Foundry Stream Overlay Pro" |
| `validation.js` → `isPremiumActive()` | `return false` | `return true` |
| Watermark on overlay | ✅ "FREE — Upgrade to Pro" | ❌ none |
| Settings "Get Pro" button | ✅ visible | ❌ hidden |
| One-time split announcement | ✅ shown once | ❌ not shown |
| Conflict detection (both installed) | ❌ not checked | ✅ warns and prompts |
| All feature gates | enforced | bypassed |

Settings data (`layouts`, `windows`, scenes) is stored under `MODULE_ID = "foundrystreamoverlay"` in **both** versions — data is shared and preserved on upgrade.

---

## Free build

1. `module.json` is already the free version — leave it as-is.
2. `js/premium/validation.js` is already the free version — leave it as-is.
3. Zip the whole directory.
   - Optionally exclude: `module-pro.json`, `validation-pro.js`, `PACKAGING.md`
4. Name: `foundrystreamoverlay-free-4.2.0.zip`

## Pro build (Windows commands)

```bat
REM 1. Copy the module directory to a temp folder
xcopy /E /I "foundrystreamoverlay" "fso-pro-build"

REM 2. Swap the two files
copy /Y "fso-pro-build\module-pro.json"                       "fso-pro-build\module.json"
copy /Y "fso-pro-build\js\premium\validation-pro.js"          "fso-pro-build\js\premium\validation.js"

REM 3. Zip fso-pro-build\ → foundrystreamoverlaypro-4.2.0.zip
REM    (use 7-Zip, Windows Explorer, or a CI script)

REM 4. Clean up temp folder
rmdir /S /Q fso-pro-build
```

Name: `foundrystreamoverlaypro-4.2.0.zip`

---

## User upgrade path (Free → Pro)

1. Open Foundry → **Game Settings → Manage Modules**.
2. Disable (or uninstall) **Foundry Stream Overlay Free**.
3. Install the Pro zip.
4. Enable **Foundry Stream Overlay Pro**.
5. All scenes, layouts, and settings are intact — nothing is lost.

If a user installs both by mistake and enables both, the Pro version detects the conflict and shows a dialog asking them to disable the Free version.

---

## Bumping the version

Update `"version"` in **both** `module.json` and `module-pro.json`.
