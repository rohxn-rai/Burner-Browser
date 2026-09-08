import { useState, useMemo, useEffect } from "react";
import { ExtensionModal } from "./ExtensionModal";
import { ExtensionCard, Extension } from "./ExtensionCard";

export function ExtensionsTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingExtension, setEditingExtension] = useState<Extension | null>(
    null,
  );
  const [extensions, setExtensions] = useState<Extension[]>([]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.browserManager.getSettings();
        if (settings?.extensions) {
          // Backfill enabled=true for any extension saved before this feature
          setExtensions(
            settings.extensions.map((ext) => ({
              ...ext,
              enabled: ext.enabled ?? true,
            })),
          );
        }
      } catch (err) {
        console.error("Failed to load extensions:", err);
      }
    };
    loadSettings();
  }, []);

  const updateAndSaveExtensions = async (newExtensions: Extension[]) => {
    setExtensions(newExtensions);
    try {
      await window.browserManager.saveExtensions(newExtensions);
    } catch (err) {
      console.error("Failed to save extensions:", err);
    }
  };

  const handleSave = (data: Omit<Extension, "id" | "enabled">) => {
    if (editingExtension) {
      const updatedExtensions = extensions.map((ext) =>
        ext.id === editingExtension.id ? { ...ext, ...data } : ext,
      );
      updateAndSaveExtensions(updatedExtensions);
    } else {
      const newExtension: Extension = {
        id: crypto.randomUUID(),
        ...data,
        enabled: true,
      };
      updateAndSaveExtensions([...extensions, newExtension]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    updateAndSaveExtensions(extensions.filter((ext) => ext.id !== id));
  };

  const handleToggle = (id: string) => {
    const updated = extensions.map((ext) =>
      ext.id === id ? { ...ext, enabled: !ext.enabled } : ext,
    );
    updateAndSaveExtensions(updated);
  };

  const openAddModal = () => {
    setEditingExtension(null);
    setIsModalOpen(true);
  };

  const openEditModal = (extension: Extension) => {
    setEditingExtension(extension);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExtension(null);
  };

  const filteredExtensions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return extensions.filter(
      (ext) =>
        ext.name.toLowerCase().includes(query) ||
        ext.value.toLowerCase().includes(query) ||
        ext.type.toLowerCase().includes(query),
    );
  }, [extensions, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-tertiary">
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search extensions..."
            className="input pl-10 shadow-sm"
          />
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary p-3 rounded-lg flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <span>+</span> Add Extension
        </button>
      </div>

      {/* Extensions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredExtensions.map((ext) => (
          <ExtensionCard
            key={ext.id}
            extension={ext}
            onDelete={() => handleDelete(ext.id)}
            onEdit={() => openEditModal(ext)}
            onToggle={() => handleToggle(ext.id)}
          />
        ))}

        {/* Empty States */}
        {extensions.length === 0 && (
          <div className="col-span-full p-10 text-center rounded-xl border-2 border-dashed border-border text-tertiary">
            No extensions added yet. Click the button above to add one.
          </div>
        )}

        {extensions.length > 0 && filteredExtensions.length === 0 && (
          <div className="col-span-full p-10 text-center rounded-xl bg-surface border border-border text-tertiary">
            No extensions found matching "{searchQuery}".
          </div>
        )}
      </div>

      {isModalOpen && (
        <ExtensionModal
          onClose={closeModal}
          onSave={handleSave}
          initialData={editingExtension}
        />
      )}
    </div>
  );
}
