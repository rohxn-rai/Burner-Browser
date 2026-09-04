import path from "path";
import { app, ipcMain } from "electron";
import {
  install,
  Browser,
  detectBrowserPlatform,
  getInstalledBrowsers,
  resolveBuildId,
  uninstall,
} from "@puppeteer/browsers";

const cacheDir = path.join(app.getPath("userData"), "chromium");
const platform = detectBrowserPlatform();

interface MilestoneInfo {
  milestone: number;
  chromium_branch: string;
  chromium_main_branch_position: number;
}

let milestonesCache: MilestoneInfo[] | null = null;
let lastMilestonesFetch = 0;

/** Fetches Chromium milestone branch positions for semantic version mapping */
async function fetchMilestones(): Promise<MilestoneInfo[]> {
  const now = Date.now();
  if (milestonesCache && now - lastMilestonesFetch < 3600000) {
    return milestonesCache;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      "https://chromiumdash.appspot.com/fetch_milestones",
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as MilestoneInfo[];
    data.sort(
      (a, b) =>
        b.chromium_main_branch_position - a.chromium_main_branch_position,
    );
    milestonesCache = data;
    lastMilestonesFetch = now;
    return data;
  } catch (err) {
    console.warn("Failed to fetch Chromium milestones:", err);
    return milestonesCache ?? [];
  }
}

/** Converts a Chromium snapshot revision (e.g. 1689847) to a semantic version (e.g. 154.0.8037.432) */
export async function revisionToSemanticVersion(
  revision: string | null | undefined,
): Promise<string> {
  if (!revision) return "";
  const revNum = parseInt(revision, 10);
  if (isNaN(revNum)) return revision;

  const milestones = await fetchMilestones();
  for (const m of milestones) {
    if (revNum >= m.chromium_main_branch_position) {
      const offset = revNum - m.chromium_main_branch_position;
      return `${m.milestone}.0.${m.chromium_branch}.${offset}`;
    }
  }

  return revision;
}

/** Converts a semantic version (e.g. 154.0.8037.432) back to a Chromium snapshot revision (e.g. 1689847) */
export async function semanticVersionToRevision(
  version: string | null | undefined,
): Promise<string> {
  if (!version || version === "latest") return "latest";
  // If it's already a pure numeric revision ID (e.g. "1689847")
  if (/^\d+$/.test(version)) return version;

  const parts = version.split(".").map(Number);
  if (parts.length >= 3) {
    const milestone = parts[0];
    const branch = String(parts[2]);
    const offset = parts.length >= 4 ? parts[3] : 0;
    const milestones = await fetchMilestones();
    const m = milestones.find(
      (item) => item.milestone === milestone || item.chromium_branch === branch,
    );
    if (m) {
      return String(m.chromium_main_branch_position + offset);
    }
  }

  return version;
}

const registerBrowserHandlers = () => {
  // 1. Detect if Chromium is installed strictly in our app's data folder
  ipcMain.handle("check-browser", async () => {
    const installed = await getInstalledBrowsers({ cacheDir });
    const chromiumInstalls = installed.filter(
      (b) => b.browser === Browser.CHROMIUM,
    );

    if (chromiumInstalls.length > 0) {
      chromiumInstalls.sort(
        (a, b) => parseInt(a.buildId, 10) - parseInt(b.buildId, 10),
      );
      const latestInstall = chromiumInstalls[chromiumInstalls.length - 1];
      const semVer = await revisionToSemanticVersion(latestInstall.buildId);
      return {
        installed: true,
        version: semVer,
        buildId: latestInstall.buildId,
      };
    }
    return { installed: false, version: null, buildId: null };
  });

  // 2. Check for a newer version online
  ipcMain.handle("check-update", async (event, currentVersion) => {
    if (!platform) throw new Error("Unsupported platform");

    const latestBuildId = await resolveBuildId(
      Browser.CHROMIUM,
      platform,
      "latest",
    );
    const latestSemVer = await revisionToSemanticVersion(latestBuildId);
    const currentSemVer = await revisionToSemanticVersion(currentVersion);

    return {
      latestVersion: latestSemVer,
      latestBuildId,
      updateAvailable:
        !!currentVersion &&
        currentVersion !== latestSemVer &&
        currentVersion !== latestBuildId &&
        currentSemVer !== latestSemVer,
    };
  });

  // 3. Download and install Chromium into the AppData/App Support folder
  ipcMain.handle("install-browser", async (event, targetVersion = "latest") => {
    if (!platform) throw new Error("Unsupported platform");

    const resolvedRevision = await semanticVersionToRevision(targetVersion);

    const buildId = await resolveBuildId(
      Browser.CHROMIUM,
      platform,
      resolvedRevision,
    );

    let lastPercent = 0;

    await install({
      browser: Browser.CHROMIUM,
      buildId,
      cacheDir,
      platform,
      downloadProgressCallback: (downloadedBytes, totalBytes) => {
        // Calculate percentage
        const percent = Math.round((downloadedBytes / totalBytes) * 100);

        if (percent !== lastPercent) {
          lastPercent = percent;
          event.sender.send("download-progress", percent);
        }
      },
    });

    const semVer = await revisionToSemanticVersion(buildId);
    return { success: true, version: semVer, buildId };
  });

  // 4. Uninstall all downloaded versions of Chromium
  ipcMain.handle("uninstall-browser", async () => {
    try {
      const installed = await getInstalledBrowsers({ cacheDir });
      const chromiumInstalls = installed.filter(
        (b) => b.browser === Browser.CHROMIUM,
      );

      // Loop through and uninstall every version found in the directory
      for (const item of chromiumInstalls) {
        await uninstall({
          browser: Browser.CHROMIUM,
          buildId: item.buildId,
          cacheDir,
          platform,
        });
      }
      return { success: true };
    } catch (error: any) {
      console.error(error);
      return { success: false, error: error.message };
    }
  });
};

export default registerBrowserHandlers;
