import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Download, Loader2, Trash2, RefreshCw } from "lucide-react";

type AppStatus = "loading" | "not-installed" | "installed";

interface UpdateInfo {
  available: boolean;
  newVersion?: string;
  checked: boolean;
}

const Home = () => {
  const router = useRouter();
  const [status, setStatus] = useState<AppStatus>("loading");
  const [version, setVersion] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    (async () => {
      await checkInstallation();
      await checkForUpdates();
    })();

    if (window.browserManager?.onDownloadProgress) {
      window.browserManager.onDownloadProgress((percent: number) => {
        setProgress(percent);
      });
    }

    return () => {
      window.browserManager?.removeDownloadProgressListener?.();
    };
  }, []);

  const checkInstallation = async (): Promise<string> => {
    const result = await window.browserManager.checkBrowser();
    if (result.installed) {
      setVersion(result.version);
      setStatus("installed");
      return result.version || "";
    } else {
      setVersion(null);
      setStatus("not-installed");
      return "";
    }
  };

  const checkForUpdates = async (verToCheck?: string) => {
    const targetVersion = verToCheck !== undefined ? verToCheck : version || "";
    setIsCheckingUpdate(true);

    try {
      const info = await window.browserManager.checkUpdate(targetVersion);
      setUpdateInfo({
        available: info.updateAvailable,
        newVersion: info.latestVersion,
        checked: true,
      });
      if (!info.updateAvailable && info.latestVersion) {
        setVersion(info.latestVersion);
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownload = async (targetVersion = "latest") => {
    setIsDownloading(true);
    setProgress(0);

    try {
      const result = await window.browserManager.installBrowser(targetVersion);
      if (result.success) {
        setVersion(result.version);
        setStatus("installed");
        setUpdateInfo(null);
      }
    } catch (error) {
      console.error("Failed to download:", error);
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const handleUpdateDownload = async (targetVersion?: string) => {
    if (!targetVersion) return;
    setIsDownloading(true);
    setProgress(0);

    try {
      const uninstallResult = await window.browserManager.uninstallBrowser();
      if (!uninstallResult.success) {
        throw new Error(
          uninstallResult.error ?? "Failed to remove previous version",
        );
      }

      const result = await window.browserManager.installBrowser(targetVersion);
      if (result.success) {
        setVersion(result.version);
        setStatus("installed");
        setUpdateInfo(null);
      }
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const handleUninstall = async () => {
    setIsDownloading(true);
    try {
      const result = await window.browserManager.uninstallBrowser();
      if (result.success) {
        setVersion(null);
        setStatus("not-installed");
        setUpdateInfo(null);
      }
    } catch (error) {
      console.error("Uninstall error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLaunchApp = () => {
    router.push("/index");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm bg-base text-secondary">
        Starting up…
      </div>
    );
  }

  const RING_SIZE = 56;
  const STROKE = 3;
  const RADIUS = (RING_SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  const updateAvailable = status === "installed" && !!updateInfo?.available;
  const alreadyLatest =
    status === "installed" && !!updateInfo?.checked && !updateInfo?.available;

  const label = isDownloading
    ? progress >= 100
      ? "Installing…"
      : `Downloading ${progress}%`
    : status === "not-installed"
      ? "Chromium not installed"
      : isCheckingUpdate
        ? "Checking for updates…"
        : updateAvailable
          ? "Update available"
          : alreadyLatest
            ? "Already at latest version"
            : "Chromium installed";

  const handleIconClick = () => {
    if (status === "not-installed") return handleDownload();
    if (updateAvailable) return handleUpdateDownload(updateInfo?.newVersion);
    return;
  };

  return (
    <div className="min-h-screen flex flex-col font-[ui-sans-serif,system-ui,sans-serif] bg-base">
      {/* Draggable title bar strip — matches titleBarOverlay height (32px) */}
      <div className="h-8 w-full app-drag shrink-0" />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-90 flex flex-col gap-3">
          {/* Title */}
          <div className="flex self-center mb-4">
            <h2 className="text-2xl text-primary font-medium">
              Temporary Browser Manager
            </h2>
          </div>

          {/* Top row — check for update + uninstall */}
          <div className="flex items-end justify-between px-2 pt-1">
            {status === "installed" && (
              <div className="flex flex-row justify-between w-full">
                <button
                  onClick={() => checkForUpdates()}
                  disabled={isDownloading || isCheckingUpdate}
                  className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isCheckingUpdate ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  {isCheckingUpdate ? "Checking…" : "Check for update"}
                </button>
                <button
                  onClick={handleUninstall}
                  disabled={isDownloading || isCheckingUpdate}
                  className="flex items-center gap-1 text-[11px] text-danger hover:text-danger-hover transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 size={12} />
                  Uninstall
                </button>
              </div>
            )}
          </div>

          {/* Card 1 — status / install / update */}
          <div className="rounded-xl p-5 flex items-center gap-4 bg-surface border border-border shadow-xs">
            {/* Icon / progress slot */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              {isDownloading ? (
                <>
                  <svg
                    viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                    width={56}
                    height={56}
                    className="-rotate-90"
                  >
                    <circle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RADIUS}
                      strokeWidth={STROKE}
                      fill="transparent"
                      className="stroke-border"
                    />
                    <circle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RADIUS}
                      strokeWidth={STROKE}
                      fill="transparent"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      className="stroke-accent transition-all duration-150 ease-out"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-medium tabular-nums text-primary">
                    {progress < 100 ? `${progress}%` : ""}
                  </span>
                </>
              ) : (
                <button
                  onClick={handleIconClick}
                  disabled={status === "installed" && !updateAvailable}
                  title={
                    status === "not-installed"
                      ? "Download Chromium"
                      : updateAvailable
                        ? "Download update"
                        : undefined
                  }
                  className={`w-14 h-14 rounded-full border flex items-center justify-center transition-colors ${
                    status === "not-installed"
                      ? "bg-accent-muted border-accent-border text-accent hover:bg-accent-muted/80 cursor-pointer"
                      : updateAvailable
                        ? "bg-warn-muted border-warn-border text-warn hover:bg-warn-muted/80 cursor-pointer"
                        : "bg-overlay border-border text-secondary cursor-default opacity-60"
                  }`}
                >
                  <Download size={20} />
                </button>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-[14px] font-medium leading-tight truncate text-center ${
                  updateAvailable
                    ? "text-warn"
                    : alreadyLatest
                      ? "text-green-500"
                      : "text-primary"
                }`}
              >
                {label}
              </p>
            </div>
          </div>

          {/* Card 2 — launch */}
          <button
            onClick={handleLaunchApp}
            disabled={status !== "installed" || isDownloading}
            className={`rounded-xl border p-5 flex items-center justify-center gap-2 text-[15px] font-medium transition-colors ${
              status === "installed" && !isDownloading
                ? "border-accent-border bg-accent text-white hover:bg-accent-hover cursor-pointer"
                : "border-border bg-surface text-tertiary cursor-not-allowed"
            }`}
          >
            Launch App
          </button>

          {/* Footer row — version info */}
          <div className="flex items-start justify-start px-2 pt-1">
            <div className="flex flex-col">
              <p className="text-[11px] font-mono tabular-nums text-tertiary">
                Current: {version ? `v${version}` : "v —"}
              </p>
              {updateInfo?.checked && updateInfo?.newVersion && (
                <p
                  className={`text-[11px] font-mono tabular-nums ${
                    updateAvailable ? "text-warn" : "text-tertiary"
                  }`}
                >
                  Latest : {`v${updateInfo.newVersion}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
