import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("browserManager", {
  checkBrowser: () => ipcRenderer.invoke("check-browser"),
  checkUpdate: (currentVersion: string) =>
    ipcRenderer.invoke("check-update", currentVersion),
  installBrowser: (version?: string) =>
    ipcRenderer.invoke("install-browser", version),
  uninstallBrowser: () => ipcRenderer.invoke("uninstall-browser"),
  onDownloadProgress: (callback: (percent: number) => void) => {
    ipcRenderer.on("download-progress", (_event, percent) => callback(percent));
  },
  removeDownloadProgressListener: () => {
    ipcRenderer.removeAllListeners("download-progress");
  },

  launchBrowserWindow: (config: {
    startUrl: string;
    bookmarks: { id: string; title: string; url: string }[];
    extensions: {
      id: string;
      name: string;
      type: "url" | "folder";
      value: string;
    }[];
  }) => ipcRenderer.invoke("launch-browser-window", config),

  killBrowserWindow: (id: string) =>
    ipcRenderer.invoke("kill-browser-window", id),

  getActiveBrowserWindows: () =>
    ipcRenderer.invoke("get-active-browser-windows"),

  onWindowClosed: (callback: (id: string) => void) => {
    ipcRenderer.on("browser-window-closed", (_event, id) => callback(id));
  },
  removeWindowClosedListener: () => {
    ipcRenderer.removeAllListeners("browser-window-closed");
  },

  killAllBrowserWindows: () => ipcRenderer.invoke("kill-all-browser-windows"),

  focusBrowserWindow: (id: string) =>
    ipcRenderer.invoke("focus-browser-window", id),

  getSettings: () => ipcRenderer.invoke("settings-get"),
  saveGeneralSettings: (data: { startUrl: string }) =>
    ipcRenderer.invoke("settings-save-general", data),
  saveBookmarks: (bookmarks: { id: string; title: string; url: string }[]) =>
    ipcRenderer.invoke("settings-save-bookmarks", bookmarks),
  saveExtensions: (
    extensions: {
      id: string;
      name: string;
      type: "url" | "folder";
      value: string;
    }[],
  ) => ipcRenderer.invoke("settings-save-extensions", extensions),
});
