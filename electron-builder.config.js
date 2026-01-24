/**
 * Electron Builder Configuration
 * 
 * This file configures how the desktop application is built and packaged.
 * Run: npm run electron:build:win (Windows) or npm run electron:build:mac (macOS)
 */

module.exports = {
  appId: 'com.edlead.admin',
  productName: 'edLEAD Admin',
  copyright: 'Copyright © 2025 edLEAD',
  
  // Directory configuration
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  
  // Files to include in the app
  files: [
    'dist/**/*',
    'electron/**/*',
    'build/**/*',
  ],
  
  // macOS configuration
  mac: {
    category: 'public.app-category.education',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'], // Support both Intel and Apple Silicon
      },
    ],
    icon: 'build/icon.icns',
    darkModeSupport: true,
  },
  
  // DMG configuration for macOS
  dmg: {
    contents: [
      {
        x: 130,
        y: 220,
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications',
      },
    ],
    window: {
      width: 540,
      height: 380,
    },
  },
  
  // Windows configuration
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'build/icon.ico',
  },
  
  // NSIS installer configuration for Windows
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    installerHeaderIcon: 'build/icon.ico',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'edLEAD Admin',
  },
  
  // Linux configuration (optional, for future use)
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Education',
    icon: 'build/icon.png',
  },
};
