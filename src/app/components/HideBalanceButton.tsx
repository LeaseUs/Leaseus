import { Eye, EyeOff } from "lucide-react";
import { useBalance } from "../context/BalanceContext";

interface HideBalanceButtonProps {
  className?: string;
  variant?: "icon" | "pill";
}

export function HideBalanceButton({ className = "", variant = "icon" }: HideBalanceButtonProps) {
  const { hidden, toggleHidden } = useBalance();

  if (variant === "pill") {
    return (
      <button
        onClick={toggleHidden}
        className={`flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs border border-white/30 hover:bg-white/30 transition-colors ${className}`}
      >
        {hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {hidden ? "Show balances" : "Hide balances"}
      </button>
    );
  }

  return (
    <button
      onClick={toggleHidden}
      className={`p-1.5 rounded-full hover:bg-white/20 transition-colors ${className}`}
      title={hidden ? "Show balances" : "Hide balances"}
    >
      {hidden ? (
        <EyeOff className="w-5 h-5 text-white" />
      ) : (
        <Eye className="w-5 h-5 text-white" />
      )}
    </button>
  );
}
