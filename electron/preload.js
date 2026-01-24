const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  
  // App version (useful for displaying in settings)
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Window controls (optional - for custom title bar if needed later)
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Check if running in Electron
  isElectron: true,
});

// Log that preload script loaded successfully
console.log('Electron preload script loaded');
