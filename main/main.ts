import { app, ipcMain, Menu } from "electron";
import serve from "electron-serve";
import path from "path";
import { createWindow } from "./helpers/create-window";
import registerBrowserHandlers from "./helpers/register-browser";
import registerLaunchHandlers from "./helpers/launch-browser";
import registerSettingsHandlers from "./helpers/settings";

const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (staging)`);
}

(async () => {
  await app.whenReady();

  // Remove the default application menu (File, Edit, View, Window)
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
})();

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.on("message", async (event, arg) => {
  event.reply("message", `${arg} World!`);
});
