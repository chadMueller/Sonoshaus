const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sonohaus', {
  isElectron: true,
  openBridgeInstaller: () => ipcRenderer.invoke('sonohaus:open-bridge-installer'),
  openExternal: (url) => ipcRenderer.invoke('sonohaus:open-external', url),
  fullscreen: {
    isActive: () => ipcRenderer.invoke('sonohaus:fullscreen-is-active'),
    toggle: () => ipcRenderer.invoke('sonohaus:fullscreen-toggle'),
    set: (value) => ipcRenderer.invoke('sonohaus:fullscreen-set', value),
    onChanged: (callback) => {
      const listener = (_event, isFullscreen) => callback(Boolean(isFullscreen));
      ipcRenderer.on('sonohaus:fullscreen-changed', listener);
      return () => ipcRenderer.removeListener('sonohaus:fullscreen-changed', listener);
    },
  },
});
