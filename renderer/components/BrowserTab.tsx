import { useState, useEffect } from "react";

interface ActiveWindow {
  id: string;
  pid: number;
  startUrl: string;
  name: string;
}

export function BrowserTab() {
  const [startUrl, setStartUrl] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [activeWindows, setActiveWindows] = useState<ActiveWindow[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial fetch of settings and active windows from main process
    const initData = async () => {
      try {
        const [settings, windows] = await Promise.all([
          window.browserManager.getSettings(),
          window.browserManager.getActiveBrowserWindows(),
        ]);
        if (settings?.startUrl) {
          setStartUrl(settings.startUrl);
        }
        // Active windows from main don't carry a name — backfill with the URL
        setActiveWindows(windows.map((w) => ({ ...w, name: w.startUrl })));
      } catch (err) {
        console.error("Failed to load initial browser tab data:", err);
      }
    };

    initData();

    // 2. Immediate update when main detects process exit
    window.browserManager.onWindowClosed((closedId: string) => {
      setActiveWindows((prev) => prev.filter((w) => w.id !== closedId));
    });

    // 3. Constant background polling check every 2 seconds
    const syncActiveWindows = async () => {
      try {
        const windows = await window.browserManager.getActiveBrowserWindows();
        // Merge: preserve any names we already have, only add genuinely new entries
        setActiveWindows((prev) => {
          const existingIds = new Set(prev.map((w) => w.id));
          const newEntries = windows
            .filter((w) => !existingIds.has(w.id))
            .map((w) => ({ ...w, name: w.startUrl }));
          // Remove sessions that are no longer reported
          const activeIds = new Set(windows.map((w) => w.id));
          const retained = prev.filter((w) => activeIds.has(w.id));
          return [...retained, ...newEntries];
        });
      } catch {}
    };
    const interval = setInterval(syncActiveWindows, 2000);

    return () => {
      clearInterval(interval);
      window.browserManager.removeWindowClosedListener();
    };
  }, []);

  const handleLaunch = async () => {
    setIsLaunching(true);
    setError(null);

    try {
      // Read latest bookmarks and extensions from settings
      const settings = await window.browserManager.getSettings();
      const bookmarks = settings?.bookmarks ?? [];
      const extensions = settings?.extensions ?? [];

      const result = await window.browserManager.launchBrowserWindow({
        startUrl,
        bookmarks,
        extensions,
      });

      const resolvedUrl = startUrl || "chrome://newtab";
      const resolvedName = sessionName.trim() || resolvedUrl;

      setActiveWindows((prev) => [
        ...prev,
        {
          id: result.id,
          pid: result.pid,
          startUrl: resolvedUrl,
          name: resolvedName,
        },
      ]);

      // Clear the name field after launch so the next session gets a fresh label
      setSessionName("");
    } catch (err: any) {
      setError(err?.message ?? "Failed to launch browser window.");
    } finally {
      setIsLaunching(false);
    }
  };

  const handleKill = async (id: string) => {
    try {
      await window.browserManager.killBrowserWindow(id);
    } catch {
      // Best-effort kill — remove from list regardless
    }
    setActiveWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const handleKillAll = async () => {
    try {
      await window.browserManager.killAllBrowserWindows();
    } catch {}
    setActiveWindows([]);
  };

  const handleFocus = async (id: string) => {
    try {
      await window.browserManager.focusBrowserWindow(id);
    } catch {}
  };

  return (
    <div className="space-y-8">
      <div className="bg-surface p-8 rounded-xl border border-border shadow-lg">
        <h2 className="mt-0 mb-6 text-2xl font-semibold text-primary">
          Launch Isolated Browser
        </h2>

        <div className="flex flex-col gap-4 mb-6">
          {/* Instance name */}
          <div>
            <label className="block mb-2 text-sm font-medium text-secondary">
              Session Name
            </label>
            <input
              type="text"
              value={sessionName}
              placeholder="Name your session..."
              onChange={(e) => setSessionName(e.target.value)}
              className="input"
            />
          </div>

          {/* Start URL */}
          <div>
            <label className="block mb-2 text-sm font-medium text-secondary">
              Start URL
            </label>
            <input
              type="text"
              value={startUrl}
              placeholder="https://example.com"
              onChange={(e) => {
                const val = e.target.value;
                setStartUrl(val);
                window.browserManager.saveGeneralSettings({ startUrl: val });
              }}
              className="input"
            />
            <p className="mt-2 text-xs text-tertiary">
              Each launch creates a fully isolated profile with its own cookies,
              session, and storage. Bookmarks and extensions are applied
              automatically. Web Store extensions are downloaded and cached on
              first launch.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-danger-muted border border-danger-border text-danger">
            {error}
          </div>
        )}

        <button
          onClick={handleLaunch}
          disabled={isLaunching}
          className="btn-primary py-3 px-6"
        >
          {isLaunching ? "Launching…" : "Launch Window"}
        </button>
      </div>

      <div className="bg-surface p-8 rounded-xl border border-border shadow-lg">
        <div className="flex items-center justify-between mt-0 mb-6">
          <h2 className="text-2xl font-semibold text-primary">
            Active Sessions
          </h2>
          <button
            onClick={handleKillAll}
            disabled={activeWindows.length < 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors bg-danger text-white hover:bg-danger-hover cursor-pointer disabled:bg-danger-muted disabled:text-white/25"
          >
            Kill All Process
          </button>
        </div>

        {activeWindows.length === 0 ? (
          <p className="italic text-sm text-secondary">No active windows.</p>
        ) : (
          activeWindows.map((win) => (
            <div
              key={win.id}
              className="flex justify-between items-center p-4 rounded-lg mb-3 bg-overlay border border-border"
            >
              <div className="flex flex-col gap-1 min-w-0 mr-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold shrink-0 bg-success-muted text-success border border-success-border">
                    Active
                  </span>
                  <span
                    className="text-sm font-medium truncate text-primary"
                    title={win.name}
                  >
                    {win.name}
                  </span>
                </div>
                <span
                  className="font-mono text-xs mt-0.5 truncate text-tertiary"
                  title={win.startUrl}
                >
                  {win.startUrl}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleFocus(win.id)}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-overlay border border-border text-primary hover:bg-surface cursor-pointer"
                >
                  Open
                </button>
                <button
                  onClick={() => handleKill(win.id)}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-danger text-white hover:bg-danger-hover cursor-pointer"
                >
                  Kill Process
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
