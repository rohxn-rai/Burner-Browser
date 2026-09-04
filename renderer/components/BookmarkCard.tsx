export interface Bookmark {
  id: string;
  title: string;
  url: string;
}

interface BookmarkCardProps {
  bookmark: Bookmark;
  onDelete: () => void;
  onEdit: () => void;
}

export function BookmarkCard({
  bookmark,
  onDelete,
  onEdit,
}: BookmarkCardProps) {
  return (
    <div className="group relative p-5 rounded-xl transition-all flex flex-col gap-1 cursor-pointer bg-surface border border-border hover:bg-hover hover:border-border-subtle shadow-md">
      <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
        {/* Edit Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 rounded-md transition-colors bg-overlay text-secondary hover:text-accent cursor-pointer"
          title="Edit Bookmark"
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

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-md transition-colors bg-overlay text-secondary hover:text-danger cursor-pointer"
          title="Delete Bookmark"
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

      <h3 className="font-semibold pr-16 truncate text-primary">
        {bookmark.title}
      </h3>
      <p className="text-sm truncate text-secondary">{bookmark.url}</p>
    </div>
  );
}
