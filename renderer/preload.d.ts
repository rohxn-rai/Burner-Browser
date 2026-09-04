import { IpcHandler } from "../main/preload";

declare global {
  interface Window {
    ipc: IpcHandler;
  }
}

declare global {
  interface Window {
    browserManager: {
      checkBrowser: () => Promise<{
        installed: boolean;
        version: string | null;
      }>;

      checkUpdate: (currentVersion: string) => Promise<{
        latestVersion: string;
        updateAvailable: boolean;
      }>;

      installBrowser: (version?: string) => Promise<{
        success: boolean;
        version: string;
      }>;

      uninstallBrowser: () => Promise<{ success: boolean; error?: string }>;

      onDownloadProgress: (callback: (percent: number) => void) => void;

      removeDownloadProgressListener: () => void;

      launchBrowserWindow: (config: {
        startUrl: string;
        bookmarks: { id: string; title: string; url: string }[];
        extensions: {
          id: string;
          name: string;
          type: "url" | "folder";
          value: string;
        }[];
      }) => Promise<{ id: string; pid: number }>;

      killBrowserWindow: (
        id: string,
      ) => Promise<{ success: boolean; error?: string }>;

      getActiveBrowserWindows: () => Promise<
        {
          id: string;
          pid: number;
          startUrl: string;
        }[]
      >;

      onWindowClosed: (callback: (id: string) => void) => void;

      removeWindowClosedListener: () => void;

      getSettings: () => Promise<{
        startUrl: string;
        bookmarks: { id: string; title: string; url: string }[];
        extensions: {
          id: string;
          name: string;
          type: "url" | "folder";
          value: string;
        }[];
      }>;

      saveGeneralSettings: (data: {
        startUrl: string;
      }) => Promise<{ success: boolean; error?: string }>;

      saveBookmarks: (
        bookmarks: { id: string; title: string; url: string }[],
      ) => Promise<{ success: boolean; error?: string }>;

      saveExtensions: (
        extensions: {
          id: string;
          name: string;
          type: "url" | "folder";
          value: string;
        }[],
      ) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
