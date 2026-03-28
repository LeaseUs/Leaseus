import { useNavigate } from "react-router";
import { LayoutDashboard, ShieldCheck, Store, UserCircle } from "lucide-react";

type AdminRoute = "dashboard" | "providers" | "partners" | "profile";

export function AdminNav({ current }: { current: AdminRoute }) {
  const navigate = useNavigate();

  const items: Array<{ key: AdminRoute; label: string; icon: typeof LayoutDashboard; path: string }> = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { key: "providers", label: "Providers", icon: ShieldCheck, path: "/admin/kyc" },
    { key: "partners", label: "LEUS Partners", icon: Store, path: "/admin/partners" },
    { key: "profile", label: "Profile", icon: UserCircle, path: "/admin/profile" },
  ];

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active = current === item.key;
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`rounded-2xl px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
              active ? "bg-white text-[#1E3A8A]" : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
