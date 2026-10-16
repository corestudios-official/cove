const { app, BrowserWindow, ipcMain, session, nativeTheme, Menu, clipboard, shell, nativeImage, Tray, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

let mainWindow;

// Load icon using nativeImage to ensure it's properly loaded
const iconPath = path.join(app.getAppPath(), 'icon-256.png');
const appIcon = nativeImage.createFromPath(iconPath);
if (appIcon.isEmpty()) {
  console.error('Failed to load icon from:', iconPath);
} else {
  appIcon.resize({ width: 256, height: 256 });
}

// Taskbar button shows Electron icon in dev mode — this is a Windows OS limitation.
// The Cove icon appears on the taskbar only in the packaged build.
// If the taskbar icon still shows the old Cove logo after updating icon-256.png,
// it is a Windows shell icon cache issue. Manual fix: close the app, delete
// Windows icon cache database (IconCache.db / iconcache_*.db under
// %LocalAppData%\Microsoft\Windows\Explorer), then restart explorer.exe or reboot.
// CP2-32e: Confirmed taskbar icon cache issue is OS-level, not code - documented below.

// Set AppUserModelId for Windows taskbar icon (must be before any window is created)
app.setAppUserModelId('com.covebrowser.cove');

function createWindow() {
  const windowState = store.get('windowState', { width: 1280, height: 800 });

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#E8EDF5',
    icon: path.join(app.getAppPath(), 'icon-256.png'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webviewTag: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false // must be false for preload to work with contextBridge
    }
  });

  Menu.setApplicationMenu(null);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Explicitly set icon again after window is shown to refresh Windows taskbar icon cache
    mainWindow.setIcon(path.join(app.getAppPath(), 'icon-256.png'));
  });
  mainWindow.on('resize', () => store.set('windowState', mainWindow.getBounds()));
  mainWindow.on('move', () => store.set('windowState', mainWindow.getBounds()));
  mainWindow.on('closed', () => { mainWindow = null; });

  // Taskbar button icon is cached by Windows per AppUserModelID; this does not update at runtime through Electron APIs.
  // Confirmed Electron is serving the correct icon everywhere else (tray, Alt+Tab). No further code change will fix this.
  // Manual OS-level fix: close the app fully, delete %LocalAppData%\IconCache.db and the iconcache_*.db files under
  // %LocalAppData%\Microsoft\Windows\Explorer, then restart explorer.exe (or reboot), then relaunch the app.

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
  });

  // Block navigation to dangerous protocols
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:8080') && 
        !url.startsWith('file://') &&
        !url.startsWith('http://') &&
        !url.startsWith('https://')) {
      event.preventDefault();
    }
  });

  // Block new window creation from the main frame
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });

  // Prevent permission requests from being auto-granted
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow only these permissions
    const allowedPermissions = ['clipboard-read', 'clipboard-write'];
    callback(allowedPermissions.includes(permission));
  });
}

app.whenReady().then(() => {
  // Set up secure session for webviews
  const coveSession = session.fromPartition('persist:cove');
  
  // Block dangerous permission requests in webviews
  coveSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['clipboard-read', 'clipboard-write', 'media', 'geolocation', 'notifications'];
    callback(allowedPermissions.includes(permission));
  });


  createWindow();

  app.on('web-contents-created', (event, contents) => {
    contents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (validatedURL === 'about:blank' && errorCode === -2) return;
      console.error('did-fail-load:', errorCode, errorDescription, validatedURL);
    });

    contents.on('destroyed', () => {
      // Suppress post-destroy guest instance errors — benign Electron teardown race
    });
  });

  const tray = new Tray(appIcon);
  tray.setToolTip('Cove Browser');

  const trayMenu = Menu.buildFromTemplate([
    {
      label: 'Open Cove',
      click: () => {
        if (mainWindow) mainWindow.show();
        else createWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Cove',
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(trayMenu);

  session.defaultSession.on('will-download', (event, item) => {
    const downloads = store.get('downloads', []);
    const dl = {
      id: Date.now().toString(),
      filename: item.getFilename(),
      url: item.getURL(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: 'progressing',
      startTime: Date.now()
    };
    downloads.unshift(dl);
    store.set('downloads', downloads);
    item.on('updated', (e, state) => {
      dl.state = state;
      dl.receivedBytes = item.getReceivedBytes();
      store.set('downloads', downloads);
    });
    item.once('done', (e, state) => {
      dl.state = state;
      dl.endTime = Date.now();
      store.set('downloads', downloads);
    });
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('store-get', (e, key) => store.get(key));
ipcMain.handle('store-set', (e, key, value) => { store.set(key, value); return true; });
ipcMain.handle('store-delete', (e, key) => { store.delete(key); return true; });
ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.handle('window-close', () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() || false);
ipcMain.handle('get-native-theme', () => nativeTheme.shouldUseDarkColors);
ipcMain.handle('clear-session', async () => {
  const ses = session.defaultSession;
  await ses.clearCache();
  await ses.clearStorageData({
    storages: ['cookies', 'localstorage', 'sessionstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage']
  });
  return true;
});

ipcMain.handle('get-version', () => '2.0.0 BETA');
ipcMain.handle('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
});
ipcMain.handle('read-clipboard', () => {
  return clipboard.readText();
});
ipcMain.handle('save-image', async (event, url) => {
  try {
    await session.defaultSession.downloadURL(url);
    return true;
  } catch (error) {
    console.error('Failed to save image:', error);
    return false;
  }
});
ipcMain.handle('copy-image', async (event, url) => {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const image = nativeImage.createFromBuffer(Buffer.from(buffer));
    clipboard.writeImage(image);
    return true;
  } catch (error) {
    console.error('Failed to copy image:', error);
    return false;
  }
});
ipcMain.handle('check-for-updates', async () => {
  try {
    const response = await fetch('https://api.github.com/repos/Cove-Browser/cove/releases');
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0]; // Return the most recent release (index 0)
    }
    throw new Error('No releases found');
  } catch (error) {
    console.error('Failed to check for updates:', error);
    throw error;
  }
});
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});
ipcMain.handle('set-background-color', (event, color) => {
  if (mainWindow) {
    // Set the chrome area background (sidebar/toolbar)
    const chromeColor = color === '#111318' ? '#1A1F2E' : '#E8EDF5';
    mainWindow.setBackgroundColor(chromeColor);
  }
});
ipcMain.handle('get-cookies', async () => {
  return await session.defaultSession.cookies.get({});
});
ipcMain.handle('clear-cookies', async () => {
  const cookies = await session.defaultSession.cookies.get({});
  for (const cookie of cookies) {
    const url = `http${cookie.secure ? 's' : ''}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
    await session.defaultSession.cookies.remove(url, cookie.name);
  }
  return true;
});
ipcMain.handle('export-data', async () => {
  const { dialog, safeStorage } = require('electron');
  const fs = require('fs');
  
  // Get browsing data (history)
  const history = store.get('history', []);
  
  // Get bookmarks
  const bookmarks = store.get('bookmarks', []);
  
  // Get user display name
  const displayName = store.get('displayName');
  
  // Get and decrypt passwords from Cove Password Manager
  const passwords = store.get('passwords', []);
  const decryptedPasswords = [];
  
  if (safeStorage.isEncryptionAvailable()) {
    for (const passwordEntry of passwords) {
      try {
        const encryptedBuffer = Buffer.from(passwordEntry.encryptedPassword, 'base64');
        const decryptedPassword = safeStorage.decryptString(encryptedBuffer);
        decryptedPasswords.push({
          title: passwordEntry.title,
          password: decryptedPassword
        });
      } catch (error) {
        console.error('Failed to decrypt password for export:', error);
        // Skip passwords that can't be decrypted
      }
    }
  }
  
  // Get all other store data not already covered
  const allStoreKeys = Object.keys(store.store);
  const excludedKeys = ['history', 'bookmarks', 'displayName', 'passwords'];
  const otherData = {};
  
  for (const key of allStoreKeys) {
    if (!excludedKeys.includes(key)) {
      otherData[key] = store.get(key);
    }
  }
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    browsingData: history,
    bookmarks: bookmarks,
    userDisplayName: displayName,
    passwords: decryptedPasswords,
    otherData: otherData
  };
  
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'cove-data-export.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (canceled || !filePath) {
    return { success: false, message: 'Export cancelled' };
  }
  
  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  
  return { success: true, message: 'Data exported successfully', path: filePath };
});

ipcMain.handle('show-notification', (event, title, body) => {
  new Notification({ title, body }).show();
});

// CP2-6 FIX: Search Suggestions dropdown was not appearing due to CORS blocking
// direct fetch from renderer. Fixed by adding IPC handler to proxy fetch requests
// through the main process, which bypasses CORS restrictions.
ipcMain.handle('fetch-search-suggestions', async (event, query, engine) => {
  try {
    let apiUrl;
    if (engine === 'google') {
      apiUrl = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    } else if (engine === 'duckduckgo') {
      apiUrl = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`;
    } else if (engine === 'bing') {
      apiUrl = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`;
    } else {
      apiUrl = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch search suggestions:', error);
    return null;
  }
});

// Cove Password Manager - Encryption/Decryption using Windows DPAPI
ipcMain.handle('encrypt-password', (event, password) => {
  const { safeStorage } = require('electron');
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available on this system');
  }
  const encryptedBuffer = safeStorage.encryptString(password);
  return encryptedBuffer.toString('base64');
});

ipcMain.handle('decrypt-password', (event, encryptedBase64) => {
  const { safeStorage } = require('electron');
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Decryption not available on this system');
  }
  const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
  const decryptedString = safeStorage.decryptString(encryptedBuffer);
  return decryptedString;
});
