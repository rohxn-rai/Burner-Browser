import { app, ipcMain, Menu, Tray, nativeImage } from "electron";
import serve from "electron-serve";
import path from "path";
import { createWindow } from "./helpers/create-window";
import registerBrowserHandlers from "./helpers/register-browser";
import registerLaunchHandlers from "./helpers/launch-browser";
import registerSettingsHandlers from "./helpers/settings";

const isProd = process.env.NODE_ENV === "production";

// Enforce single instance — if another instance tries to open, focus this one.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (staging)`);
}

let tray: Tray | null = null;
let isQuitting = false;

(async () => {
  await app.whenReady();

  Menu.setApplicationMenu(null);

  registerBrowserHandlers();
  registerLaunchHandlers();
  registerSettingsHandlers();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0d0d0d", // --color-surface
      symbolColor: "#888888", // --color-secondary
      height: 32,
    },
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.js"),
    },
  });

  if (isProd) {
    await mainWindow.loadURL("app://./home");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }

  // --- System tray setup ---
  const iconPath = isProd
    ? path.join(process.resourcesPath, "icon.ico")
    : path.join(import.meta.dirname, "..", "resources", "icon.ico");

  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Temporary Browser Manager");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Single-click on tray icon shows/focuses the window
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Intercept close — hide to tray instead of closing
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // When a second instance is launched, show the existing window
  app.on("second-instance", () => {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  });
})();

// Prevent the app from quitting when all windows are closed (we handle it via tray)
app.on("window-all-closed", () => {
  // Do nothing — keep running in the background
});

// Mark the app as intentionally quitting so the close handler allows it
app.on("before-quit", () => {
  isQuitting = true;
});

ipcMain.on("message", async (event, arg) => {
  event.reply("message", `${arg} World!`);
});
