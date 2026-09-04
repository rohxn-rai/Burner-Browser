import { useState, useEffect } from "react";
import { Extension } from "./ExtensionCard";

interface ExtensionModalProps {
  onClose: () => void;
  onSave: (data: Omit<Extension, "id">) => void;
  initialData?: Extension | null;
}

export function ExtensionModal({
  onClose,
  onSave,
  initialData,
}: ExtensionModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"url" | "folder">("url");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setValue(initialData.value);
    }
  }, [initialData]);

  const handleSave = () => {
    if (!name.trim() || !value.trim()) return;
    onSave({ name, type, value });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-primary">
            {initialData ? "Edit Extension" : "Add Extension"}
          </h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Type Toggle */}
          <div className="flex rounded-lg p-1 bg-overlay border border-border">
            <button
              onClick={() => {
                setType("url");
                setValue("");
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                type === "url"
                  ? "bg-hover text-primary shadow-xs"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Web Store URL
            </button>
            <button
              onClick={() => {
                setType("folder");
                setValue("");
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                type === "folder"
                  ? "bg-hover text-primary shadow-xs"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Local Folder
            </button>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-secondary">
              Extension Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. React Developer Tools"
              className="input"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-secondary">
              {type === "url" ? "Chrome Web Store URL" : "Local Folder Path"}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                type === "url"
                  ? "https://chromewebstore.google.com/..."
                  : "C:\\Users\\... or /Users/..."
              }
              className="input font-mono"
            />
            {type === "folder" && (
              <p className="mt-2 text-xs text-tertiary">
                Provide the absolute path to the unpacked extension folder (the
                folder containing manifest.json).
              </p>
            )}
          </div>
        </div>

        <div className="p-5 bg-overlay border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !value.trim()}
            className="btn-primary cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
