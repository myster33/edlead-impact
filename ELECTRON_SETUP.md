# edLEAD Admin Desktop Application Setup

This guide explains how to build the edLEAD Admin portal as a desktop application for Windows and macOS.

## Prerequisites

- Node.js 18+ installed
- npm or bun package manager
- For macOS builds: A Mac computer (required by Apple)
- For Windows builds: Windows or any OS with Wine installed

## Quick Start

### 1. Add Required Scripts to package.json

Add these scripts to your `package.json` file:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:8080 && electron .\"",
    "electron:build": "npm run build && electron-builder --config electron-builder.config.js",
    "electron:build:win": "npm run build && electron-builder --config electron-builder.config.js --win",
    "electron:build:mac": "npm run build && electron-builder --config electron-builder.config.js --mac"
  }
}
```

### 2. Prepare Icons

Before building, add your app icons to the `build/` folder:
- `build/icon.ico` - For Windows (256x256)
- `build/icon.icns` - For macOS
- `build/icon.png` - Fallback (512x512)

See `build/README.md` for detailed instructions on creating icons.

### 3. Development Mode

Run the app in development mode (connects to Vite dev server):

```bash
npm run electron:dev
```

This will:
1. Start the Vite development server
2. Wait for it to be ready
3. Launch the Electron app pointing to the dev server

### 4. Building for Production

**Build for Windows:**
```bash
npm run electron:build:win
```
Output: `release/edLEAD Admin Setup.exe`

**Build for macOS:**
```bash
npm run electron:build:mac
```
Output: `release/edLEAD Admin.dmg`

**Build for current platform:**
```bash
npm run electron:build
```

## Build Output

After building, installers will be in the `release/` folder:

| Platform | File | Size (approx) |
|----------|------|---------------|
| Windows | `edLEAD Admin Setup.exe` | ~150MB |
| macOS | `edLEAD Admin.dmg` | ~150MB |

## Configuration

### electron-builder.config.js

This file controls how the app is packaged:
- App name and ID
- Icon locations
- Installer options
- Platform-specific settings

### electron/main.js

The main Electron process:
- Window size and title
- Loading the app (dev server or built files)
- Security settings

### electron/preload.js

Bridges the renderer (web app) and Node.js:
- Exposes platform info to the web app
- Can be extended for native features

## Customization

### Change App Name
Edit `electron-builder.config.js`:
```js
productName: 'Your App Name',
```

### Change Window Size
Edit `electron/main.js`:
```js
mainWindow = new BrowserWindow({
  width: 1400,
  height: 900,
  minWidth: 1024,
  minHeight: 768,
});
```

### Add Auto-Updates
Install `electron-updater` and configure in `main.js`:
```bash
npm install electron-updater
```

## Troubleshooting

### "electron-squirrel-startup" error
This module handles Windows installer shortcuts. If not installed:
```bash
npm install electron-squirrel-startup
```

### White screen on load
- Check that the Vite build completed successfully
- Verify `dist/index.html` exists
- Check the console for errors (View > Toggle Developer Tools)

### Icons not showing
- Ensure icons are in the `build/` folder
- For Windows, the icon must be a proper `.ico` file
- For macOS, the icon must be a proper `.icns` file

### Build fails on macOS
- Ensure you have Xcode Command Line Tools installed
- Run: `xcode-select --install`

## Security Notes

1. **Code Signing** (Recommended for production)
   - Windows: Obtain a code signing certificate
   - macOS: Requires Apple Developer account and notarization

2. **Without Code Signing**
   - Windows: Users will see SmartScreen warning
   - macOS: Users need to right-click and select "Open"

## Next Steps

- [ ] Add app icons to `build/` folder
- [ ] Test in development mode
- [ ] Build for your target platform
- [ ] Consider adding auto-updates
- [ ] Consider code signing for production distribution
