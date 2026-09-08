import { useState, useCallback } from "react";

export type GuardedAction = "update" | "uninstall" | "close";

interface GuardState {
  open: boolean;
  sessionCount: number;
  action: GuardedAction;
  onConfirm: () => void;
}

const INITIAL_STATE: GuardState = {
  open: false,
  sessionCount: 0,
  action: "update",
  onConfirm: () => {},
};

/**
 * Provides a `guardAction` wrapper that intercepts destructive operations
 * (update, uninstall, close) when one or more Chromium sessions are active.
 *
 * Usage:
 *   const { guardAction, dialogProps } = useActiveSessionGuard();
 *   ...
 *   <button onClick={() => guardAction("uninstall", handleUninstall)} />
 *   <ActiveSessionDialog {...dialogProps} />
 */
export function useActiveSessionGuard() {
  const [guard, setGuard] = useState<GuardState>(INITIAL_STATE);

  /**
   * Call this before any destructive action.
   * @param action  - "update" | "uninstall" | "close"
   * @param proceed - The callback to run after the user confirms (or immediately
   *                  if no sessions are active). Receives no arguments.
   */
  const guardAction = useCallback(
    async (action: GuardedAction, proceed: () => void) => {
      const windows = await window.browserManager.getActiveBrowserWindows();

      if (windows.length === 0) {
        // No active sessions — run immediately, no dialog needed
        proceed();
        return;
      }

      const sessionIds: string[] = windows.map((w: { id: string }) => w.id);

      setGuard({
        open: true,
        sessionCount: windows.length,
        action,
        onConfirm: async () => {
          // Kill every active session before proceeding
          await Promise.allSettled(
            sessionIds.map((id) => window.browserManager.killBrowserWindow(id)),
          );
          setGuard(INITIAL_STATE);
          proceed();
        },
      });
    },
    [],
  );

  const handleCancel = useCallback(() => {
    setGuard(INITIAL_STATE);
  }, []);

  return {
    guardAction,
    /** Spread these directly onto <ActiveSessionDialog /> */
    dialogProps: {
      open: guard.open,
      sessionCount: guard.sessionCount,
      action: guard.action,
      onConfirm: guard.onConfirm,
      onCancel: handleCancel,
    },
  };
}
