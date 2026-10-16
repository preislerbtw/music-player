import type { ImportProgress } from "../utils/useLibrary";

interface HeaderProps {
  loading: boolean;
  importProgress: ImportProgress | null;
  onImport: () => void;
}

function Header({ loading, importProgress, onImport }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-5">
      <h1 className="text-xl font-bold">My Player</h1>
      <button
        className="cursor-pointer rounded-full bg-brand px-[18px] py-2.5 font-semibold text-white enabled:hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#444]"
        onClick={onImport}
        disabled={loading}
      >
        {loading
          ? importProgress
            ? `Importing ${importProgress.current}/${importProgress.total}...`
            : "Loading..."
          : "Import Folder"}
      </button>
    </header>
  );
}

export default Header;