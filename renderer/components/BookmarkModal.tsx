import { useState, useEffect } from "react";

interface BookmarkModalProps {
  onClose: () => void;
  onSave: (title: string, url: string) => void;
  initialData?: { title: string; url: string } | null;
}

export function BookmarkModal({
  onClose,
  onSave,
  initialData,
}: BookmarkModalProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  // Pre-fill if editing
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setUrl(initialData.url);
    }
  }, [initialData]);

  const handleSave = () => {
    if (!title.trim() || !url.trim()) return;
    onSave(title, url);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-primary">
            {initialData ? "Edit Bookmark" : "Add New Bookmark"}
          </h2>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block mb-2 text-sm font-medium text-secondary">
              Name / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Next.js Documentation"
              autoFocus
              className="input"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-secondary">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://nextjs.org"
              className="input"
            />
          </div>
        </div>

        <div className="p-5 bg-overlay border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !url.trim()}
            className="btn-primary cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
