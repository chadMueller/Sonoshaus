const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sonohaus', {
  openBridgeInstaller: () => ipcRenderer.invoke('sonohaus:open-bridge-installer'),
});
