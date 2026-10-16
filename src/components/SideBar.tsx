import { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import type { Folder } from "../types";

interface ContextMenuState {
  x: number;
  y: number;
  folder: Folder;
}

interface SideBarProps {
  folders: Folder[];
  selectedPath?: string;
  onSelect: (folder: Folder) => void;
  onRemove: (folder: Folder) => void;
}

function SideBar({ folders, selectedPath, onSelect, onRemove }: SideBarProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleRightClick = (
    e: MouseEvent<HTMLButtonElement>,
    folder: Folder
  ) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, folder });
  };

  const handleRemove = () => {
    if (!contextMenu) return;
    onRemove(contextMenu.folder);
    setContextMenu(null);
  };

  return (
    <aside className="w-[220px] shrink-0 overflow-y-auto border-r border-line bg-black px-2 py-4">
      <p className="mb-2 px-2 text-[11px] font-bold uppercase text-muted">
        Your Library
      </p>
      {folders.length === 0 && <p className="px-2 text-sm">No folders yet.</p>}
      {folders.map((folder) => (
        <button
          type="button"
          key={folder.path}
          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md p-2 text-left ${
            selectedPath === folder.path
              ? "bg-surface-active"
              : "hover:bg-surface"
          }`}
          onClick={() => onSelect(folder)}
          onContextMenu={(e) => handleRightClick(e, folder)}
        >
          <span className="text-xl"></span>
          <span>
            <span className="block text-[13px] font-medium text-white">
              {folder.name}
            </span>
            <span className="block text-[11px] text-muted">
              {folder.tracks.length} músicas
            </span>
          </span>
        </button>
      ))}

      {contextMenu && (
        <div
          className="fixed z-[1000] min-w-[180px] rounded-md border border-[#3a3a3a] bg-[#282828] p-1 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-[13px] text-white hover:bg-[#01ff6b] hover:text-[#298b4b]"
            onClick={handleRemove}
          >
            Remove Folder
          </button>
        </div>
      )}
    </aside>
  );
}

export default SideBar;