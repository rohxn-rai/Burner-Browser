import { useState, useMemo, useEffect } from "react";
import { BookmarkModal } from "./BookmarkModal";
import { BookmarkCard, Bookmark } from "./BookmarkCard";

export function BookmarksTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.browserManager.getSettings();
        if (settings?.bookmarks) {
          setBookmarks(settings.bookmarks);
        }
      } catch (err) {
        console.error("Failed to load bookmarks:", err);
      }
    };
    loadSettings();
  }, []);

  const updateAndSaveBookmarks = async (newBookmarks: Bookmark[]) => {
    setBookmarks(newBookmarks);
    try {
      await window.browserManager.saveBookmarks(newBookmarks);
    } catch (err) {
      console.error("Failed to save bookmarks:", err);
    }
  };

  const handleSave = (title: string, url: string) => {
    if (editingBookmark) {
      // Update existing bookmark
      const updatedBookmarks = bookmarks.map((b) =>
        b.id === editingBookmark.id ? { ...b, title, url } : b,
      );
      updateAndSaveBookmarks(updatedBookmarks);
    } else {
      // Add new bookmark
      const newBookmark: Bookmark = {
        id: crypto.randomUUID(),
        title,
        url,
      };
      updateAndSaveBookmarks([...bookmarks, newBookmark]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    updateAndSaveBookmarks(bookmarks.filter((b) => b.id !== id));
  };

  const openAddModal = () => {
    setEditingBookmark(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBookmark(null);
  };

  const filteredBookmarks = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query),
    );
  }, [bookmarks, searchQuery]);

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
            placeholder="Search bookmarks..."
            className="input pl-10 shadow-sm"
          />
        </div>

        <button
          onClick={openAddModal}
          className="btn-primary p-3 rounded-lg flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <span>+</span> Add Bookmark
        </button>
      </div>

      {/* Bookmarks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredBookmarks.map((bookmark) => (
          <BookmarkCard
            key={bookmark.id}
            bookmark={bookmark}
            onDelete={() => handleDelete(bookmark.id)}
            onEdit={() => openEditModal(bookmark)}
          />
        ))}

        {/* Empty States */}
        {bookmarks.length === 0 && (
          <div className="col-span-full p-10 text-center rounded-xl border-2 border-dashed border-border text-tertiary">
            No bookmarks added yet. Click the button above to add one.
          </div>
        )}

        {bookmarks.length > 0 && filteredBookmarks.length === 0 && (
          <div className="col-span-full p-10 text-center rounded-xl bg-surface border border-border text-tertiary">
            No bookmarks found matching "{searchQuery}".
          </div>
        )}
      </div>

      {isModalOpen && (
        <BookmarkModal
          onClose={closeModal}
          onSave={handleSave}
          initialData={editingBookmark}
        />
      )}
    </div>
  );
}
