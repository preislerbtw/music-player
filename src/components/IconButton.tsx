import type { ReactNode } from "react";

interface IconButtonProps {
  label: string;
  onClick?: () => void;
  active?: boolean;
  children: ReactNode;
}

function IconButton({ label, onClick, active, children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`cursor-pointer ${
        active ? "text-brand" : "text-[#ccc] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default IconButton;