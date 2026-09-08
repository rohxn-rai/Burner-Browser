import { useRouter } from "next/router";
import { Tabs } from "../../components/Tabs";
import { BrowserTab } from "../../components/BrowserTab";
import { ExtensionsTab } from "../../components/ExtensionsTab";
import { BookmarksTab } from "../../components/BookmarksTab";
import { LogOut } from "lucide-react";
import { useActiveSessionGuard } from "../../hooks/useActiveSessionGuard";
import { ActiveSessionDialog } from "../../components/ActiveSessionDialog";

const Home = () => {
  const router = useRouter();
  const { guardAction, dialogProps } = useActiveSessionGuard();

  const tabs = [
    { id: "browser", label: "Browser", content: <BrowserTab /> },
    { id: "extensions", label: "Extensions", content: <ExtensionsTab /> },
    { id: "bookmarks", label: "Bookmarks", content: <BookmarksTab /> },
  ];

  const handleLogout = () => {
    guardAction("close", () => {
      router.push("/home");
    });
  };

  return (
    <>
      <ActiveSessionDialog {...dialogProps} />
      <div className="flex flex-col mx-auto font-sans min-h-screen text-primary">
        <header className="flex flex-row justify-between items-center sticky top-0 mb-4 px-8 pt-10 pb-6 bg-base border-b border-border app-drag">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Temporary Browser Manager
            </h1>
            <p className="mt-2 text-secondary">
              Manage your isolated browsing sessions.
            </p>
          </div>
          <div className="app-no-drag">
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border text-secondary hover:text-primary hover:border-accent transition-colors cursor-pointer"
              title="Go back"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <Tabs tabs={tabs} />
      </div>
    </>
  );
};

export default Home;
