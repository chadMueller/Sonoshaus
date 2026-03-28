const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sonohaus', {
  isElectron: true,

  startOAuthServer: (port) => ipcRenderer.invoke('oauth:start-server', port),

  stopOAuthServer: () => ipcRenderer.invoke('oauth:stop-server'),

  onOAuthCode: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('oauth:code-received', handler);
    return () => ipcRenderer.removeListener('oauth:code-received', handler);
  },

  openExternal: (url) => ipcRenderer.invoke('oauth:open-external', url),
});
