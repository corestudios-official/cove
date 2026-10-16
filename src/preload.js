const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  getNativeTheme: () => ipcRenderer.invoke('get-native-theme'),
  setBackgroundColor: (color) => ipcRenderer.invoke('set-background-color', color),
  clearSession: () => ipcRenderer.invoke('clear-session'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  readFromClipboard: () => ipcRenderer.invoke('read-clipboard'),
  saveImage: (url) => ipcRenderer.invoke('save-image', url),
  copyImage: (url) => ipcRenderer.invoke('copy-image', url),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getCookies: () => ipcRenderer.invoke('get-cookies'),
  clearCookies: () => ipcRenderer.invoke('clear-cookies'),
  exportData: () => ipcRenderer.invoke('export-data'),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  fetchSearchSuggestions: (query, engine) => ipcRenderer.invoke('fetch-search-suggestions', query, engine),
  chromiumVersion: process.versions.chrome,
  encryptPassword: (password) => ipcRenderer.invoke('encrypt-password', password),
  decryptPassword: (encryptedBase64) => ipcRenderer.invoke('decrypt-password', encryptedBase64)
});
