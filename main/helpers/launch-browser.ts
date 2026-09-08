import path from "path";
import fs from "fs";
import https from "https";
import { spawn, ChildProcess, execSync } from "child_process";
import { app, ipcMain } from "electron";
import AdmZip from "adm-zip";
import {
  Browser,
  getInstalledBrowsers,
  computeExecutablePath,
} from "@puppeteer/browsers";

const cacheDir = path.join(app.getPath("userData"), "chromium");
const profilesDir = path.join(app.getPath("userData"), "profiles");
const extCacheDir = path.join(app.getPath("userData"), "extension-cache");

interface Bookmark {
  id: string;
  title: string;
  url: string;
}

interface Extension {
  id: string;
  name: string;
  type: "url" | "folder";
  value: string;
  enabled?: boolean;
}

interface LaunchConfig {
  startUrl: string;
  bookmarks: Bookmark[];
  extensions: Extension[];
}

interface Session {
  process: ChildProcess;
  profileDir: string;
  startUrl: string;
  pid: number;
}

const sessions = new Map<string, Session>();

/** Checks if a PID is still actively running on the OS */
function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e.code === "EPERM";
  }
}

async function getChromiumExecutable(): Promise<string> {
  const installed = await getInstalledBrowsers({ cacheDir });
  const builds = installed.filter((b) => b.browser === Browser.CHROMIUM);
  if (builds.length === 0) {
    throw new Error(
      "Chromium is not installed. Please install it from the home screen first.",
    );
  }
  builds.sort((a, b) => parseInt(a.buildId, 10) - parseInt(b.buildId, 10));
  const latest = builds[builds.length - 1];
  return computeExecutablePath({
    browser: Browser.CHROMIUM,
    buildId: latest.buildId,
    cacheDir,
  });
}

function downloadToBuffer(url: string, maxRedirects = 10): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error("Too many redirects"));
    }
    https
      .get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return resolve(
            downloadToBuffer(res.headers.location, maxRedirects - 1),
          );
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function extractExtensionId(url: string): string | null {
  const match = url.match(/\/([a-z]{32})(?:[/?]|$)/i);
  return match ? match[1] : null;
}

async function getUnpackedExtensionPath(webStoreUrl: string): Promise<string> {
  const extId = extractExtensionId(webStoreUrl);
  if (!extId) {
    throw new Error(`Could not extract extension ID from URL: ${webStoreUrl}`);
  }

  const destDir = path.join(extCacheDir, extId);

  // Always re-download to get the latest version — delete any previously cached copy first
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  const crxUrl =
    `https://clients2.google.com/service/update2/crx` +
    `?response=redirect&prodversion=130.0.0.0&acceptformat=crx3` +
    `&x=id%3D${extId}%26uc`;

  const crxBuffer = await downloadToBuffer(crxUrl);

  const magic = crxBuffer.slice(0, 4).toString("ascii");
  if (magic !== "Cr24") {
    throw new Error(`Not a valid CRX file (magic: ${magic})`);
  }
  const headerSize = crxBuffer.readUInt32LE(8);
  const zipStart = 12 + headerSize;
  const zipBuffer = crxBuffer.slice(zipStart);

  fs.mkdirSync(destDir, { recursive: true });
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(destDir, true);

  return destDir;
}

function writeBookmarks(profileDir: string, bookmarks: Bookmark[]): void {
  const defaultDir = path.join(profileDir, "Default");
  fs.mkdirSync(defaultDir, { recursive: true });

  const bookmarkChildren = bookmarks.map((b, i) => ({
    date_added: String(Date.now() + i),
    guid: b.id,
    id: String(i + 2),
    name: b.title,
    type: "url",
    url: b.url,
  }));

  const bookmarksJson = {
    checksum: "",
    roots: {
      bookmark_bar: {
        children: bookmarkChildren,
        date_added: String(Date.now()),
        date_last_used: "0",
        date_modified: String(Date.now()),
        guid: "0bc5d13f-2cba-48a8-9801-7d1abe8bf748",
        id: "1",
        name: "Bookmarks bar",
        type: "folder",
      },
      other: {
        children: [],
        date_added: String(Date.now()),
        date_last_used: "0",
        date_modified: "0",
        guid: "82b081ec-3dd3-493c-b9c1-917f7b207c0e",
        id: "2",
        name: "Other bookmarks",
        type: "folder",
      },
      synced: {
        children: [],
        date_added: String(Date.now()),
        date_last_used: "0",
        date_modified: "0",
        guid: "4cf2e351-0e85-532b-bb37-df045d8f8d0f",
        id: "3",
        name: "Mobile bookmarks",
        type: "folder",
      },
    },
    version: 1,
  };

  fs.writeFileSync(
    path.join(defaultDir, "Bookmarks"),
    JSON.stringify(bookmarksJson, null, 2),
    "utf-8",
  );
}

function writePreferences(profileDir: string): void {
  const defaultDir = path.join(profileDir, "Default");
  fs.mkdirSync(defaultDir, { recursive: true });

  const prefs = {
    bookmark_bar: {
      show_on_all_tabs: true,
    },
  };

  fs.writeFileSync(
    path.join(defaultDir, "Preferences"),
    JSON.stringify(prefs, null, 2),
    "utf-8",
  );
}

const registerLaunchHandlers = () => {
  ipcMain.handle(
    "launch-browser-window",
    async (event, config: LaunchConfig) => {
      const { startUrl, bookmarks, extensions } = config;

      const executablePath = await getChromiumExecutable();

      const sessionId = crypto.randomUUID();
      const profileDir = path.join(profilesDir, sessionId);
      fs.mkdirSync(profileDir, { recursive: true });

      writePreferences(profileDir);
      if (bookmarks.length > 0) {
        writeBookmarks(profileDir, bookmarks);
      }

      const allExtensionPaths: string[] = [];

      for (const ext of extensions) {
        // Skip extensions that have been toggled off
        if (ext.enabled === false) continue;

        if (ext.type === "folder") {
          allExtensionPaths.push(ext.value);
        } else if (ext.type === "url") {
          const unpackedPath = await getUnpackedExtensionPath(ext.value);
          allExtensionPaths.push(unpackedPath);
        }
      }

      const args: string[] = [
        `--user-data-dir=${profileDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-sync",
        "--disable-translate",
      ];

      if (allExtensionPaths.length > 0) {
        args.push(`--load-extension=${allExtensionPaths.join(",")}`);
      }

      const resolvedUrl = startUrl || "chrome://newtab";
      args.push(resolvedUrl);

      const child = spawn(executablePath, args, {
        detached: true,
        stdio: "ignore",
      });
      child.unref();

      const childPid = child.pid ?? 0;

      sessions.set(sessionId, {
        process: child,
        profileDir,
        startUrl: resolvedUrl,
        pid: childPid,
      });

      child.on("exit", () => {
        sessions.delete(sessionId);
        try {
          fs.rmSync(profileDir, { recursive: true, force: true });
        } catch {}

        // Notify renderer that the window was closed
        if (!event.sender.isDestroyed()) {
          event.sender.send("browser-window-closed", sessionId);
        }
      });

      return { id: sessionId, pid: childPid };
    },
  );

  // Periodic or on-mount status query for active sessions
  ipcMain.handle("get-active-browser-windows", async () => {
    for (const [id, session] of sessions.entries()) {
      if (session.pid && !isPidRunning(session.pid)) {
        sessions.delete(id);
        try {
          fs.rmSync(session.profileDir, { recursive: true, force: true });
        } catch {}
      }
    }

    return Array.from(sessions.entries()).map(([id, session]) => ({
      id,
      pid: session.pid,
      startUrl: session.startUrl,
    }));
  });

  ipcMain.handle("kill-browser-window", async (_event, id: string) => {
    const session = sessions.get(id);
    if (!session) {
      return { success: false, error: "Session not found" };
    }

    try {
      session.process.kill();
    } catch {}

    sessions.delete(id);

    try {
      fs.rmSync(session.profileDir, { recursive: true, force: true });
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    return { success: true };
  });

  // Kill every active browser session at once
  ipcMain.handle("kill-all-browser-windows", async () => {
    const errors: string[] = [];

    for (const [id, session] of sessions.entries()) {
      try {
        session.process.kill();
      } catch {}

      sessions.delete(id);

      try {
        fs.rmSync(session.profileDir, { recursive: true, force: true });
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    return errors.length === 0
      ? { success: true }
      : { success: false, error: errors.join("; ") };
  });

  // Bring a running browser session's window to the foreground
  ipcMain.handle("focus-browser-window", async (_event, id: string) => {
    const session = sessions.get(id);
    if (!session || !session.pid) {
      return { success: false, error: "Session not found" };
    }

    try {
      const { pid } = session;
      if (process.platform === "win32") {
        // PowerShell: use AppActivate via WScript.Shell on the target PID
        execSync(
          `powershell -Command "$wsh = New-Object -ComObject WScript.Shell; $wsh.AppActivate(${pid})"`,
          { windowsHide: true },
        );
      } else if (process.platform === "darwin") {
        execSync(
          `osascript -e 'tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true'`,
        );
      } else {
        // Linux — requires wmctrl to be installed
        execSync(`wmctrl -p -R ${pid}`);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
};

export default registerLaunchHandlers;
