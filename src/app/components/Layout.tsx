import { Outlet, Link, useLocation } from "react-router";
import { Home, Wallet, Search, Award, User } from "lucide-react";
import bgImage from "figma:asset/26efaf54209cf3936abcb1e97f9969d980464042.png";

export function Layout() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: Wallet, label: "Wallet", path: "/home/wallet" },
    { icon: Search, label: "Services", path: "/home/services" },
    { icon: Award, label: "Loyalty", path: "/home/loyalty" },
    { icon: User, label: "Profile", path: "/home/profile" },
  ];

  return (
    <div 
      className="h-screen flex flex-col max-w-md mx-auto relative"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg border-t border-white/20 px-4 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-[#1E3A8A]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "fill-[#1E3A8A]" : ""}`} />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}