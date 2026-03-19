import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface BalanceContextType {
  hidden: boolean;
  toggleHidden: () => void;
}

const BalanceContext = createContext<BalanceContextType>({
  hidden: false,
  toggleHidden: () => {},
});

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(() => {
    return localStorage.getItem("balanceHidden") === "true";
  });

  const toggleHidden = () => {
    setHidden((prev) => {
      localStorage.setItem("balanceHidden", String(!prev));
      return !prev;
    });
  };

  return (
    <BalanceContext.Provider value={{ hidden, toggleHidden }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  return useContext(BalanceContext);
}

// Helper component — use this anywhere you show a balance
export function BalanceDisplay({
  value,
  currency = "",
  className = "",
}: {
  value: string | number;
  currency?: string;
  className?: string;
}) {
  const { hidden } = useBalance();

  if (hidden) {
    return (
      <span className={`tracking-widest ${className}`}>
        {currency}••••••
      </span>
    );
  }

  return (
    <span className={className}>
      {currency}{value}
    </span>
  );
}