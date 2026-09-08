import { GuardedAction } from "../hooks/useActiveSessionGuard";

interface ActiveSessionDialogProps {
  open: boolean;
  sessionCount: number;
  action: GuardedAction;
  onConfirm: () => void;
  onCancel: () => void;
}

const COPY: Record<
  GuardedAction,
  { title: string; body: (n: number) => string; confirm: string }
> = {
  update: {
    title: "Install update?",
    body: (n) =>
      `You have ${n} active session${n > 1 ? "s" : ""}. Installing the update will close ${n > 1 ? "them" : "it"}.`,
    confirm: "Close & Install",
  },
  uninstall: {
    title: "Uninstall Chromium?",
    body: (n) =>
      `You have ${n} active session${n > 1 ? "s" : ""}. Uninstalling will close ${n > 1 ? "them" : "it"}.`,
    confirm: "Close & Uninstall",
  },
  close: {
    title: "Leave this page?",
    body: (n) =>
      `You have ${n} active session${n > 1 ? "s" : ""} still running. Going back will close ${n > 1 ? "them" : "it"}.`,
    confirm: "Close & Leave",
  },
};

export function ActiveSessionDialog({
  open,
  sessionCount,
  action,
  onConfirm,
  onCancel,
}: ActiveSessionDialogProps) {
  if (!open) return null;

  const { title, body, confirm } = COPY[action];

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="mb-2 text-base font-semibold text-primary">{title}</h2>

        {/* Body */}
        <p className="mb-6 text-sm text-secondary">{body(sessionCount)}</p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border bg-overlay px-4 py-2 text-sm font-medium text-secondary transition-colors hover:border-accent hover:text-primary cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-hover cursor-pointer"
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
