export interface Extension {
  id: string;
  name: string;
  type: "url" | "folder";
  value: string;
  enabled: boolean;
}

interface ExtensionCardProps {
  extension: Extension;
  onDelete: () => void;
  onEdit: () => void;
  onToggle: () => void;
}

export function ExtensionCard({
  extension,
  onDelete,
  onEdit,
  onToggle,
}: ExtensionCardProps) {
  const isUrl = extension.type === "url";
  const isEnabled = extension.enabled;

  return (
    <div
      className={`group relative p-5 rounded-xl transition-all flex flex-col gap-2 cursor-pointer border shadow-md ${
        isEnabled
          ? "bg-surface border-border hover:bg-hover"
          : "bg-base border-border/50 opacity-60 hover:opacity-80"
      }`}
    >
      {/* Top-right controls: toggle always visible, edit/delete on hover */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {/* Edit Button — hover only */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 bg-overlay text-secondary hover:text-accent cursor-pointer"
          title="Edit Extension"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>

        {/* Delete Button — hover only */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 bg-overlay text-secondary hover:text-danger cursor-pointer"
          title="Delete Extension"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div>
        <span
          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
            isUrl
              ? "bg-tag-webstore-muted text-tag-webstore border border-tag-webstore-border"
              : "bg-tag-local-muted text-tag-local border border-tag-local-border"
          }`}
        >
          {isUrl ? "Web Store" : "Local Folder"}
        </span>
        <div className="flex flex-row justify-between">
          <h3 className="font-semibold pr-24 truncate text-primary">
            {extension.name}
          </h3>

          {/* Slide Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            title={isEnabled ? "Disable extension" : "Enable extension"}
            className="cursor-pointer shrink-0"
            aria-checked={isEnabled}
            role="switch"
          >
            {/* Track */}
            <div
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                isEnabled ? "bg-success" : "bg-black border border-border"
              }`}
            >
              {/* Thumb */}
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all duration-200 ${
                  isEnabled
                    ? "translate-x-4.5 bg-white"
                    : "translate-x-0.5 bg-tertiary"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      <p className="text-sm truncate text-secondary" title={extension.value}>
        {extension.value}
      </p>
    </div>
  );
}
