const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sonohaus', {
  isElectron: true,
  openBridgeInstaller: () => ipcRenderer.invoke('sonohaus:open-bridge-installer'),
  openExternal: (url) => ipcRenderer.invoke('sonohaus:open-external', url),
});
