import { Outlet, Link, useLocation } from "react-router";
import { Home, Wallet, Search, CalendarCheck, User, MessageCircle, Bot } from "lucide-react";
import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { supabase } from "../../lib/supabase";

const AIChatWidget = lazy(async () => {
  const mod = await import("./AIChatWidget");
  return { default: mod.AIChatWidget };
});

export function Layout() {
  const location                        = useLocation();
  const [unreadCount, setUnreadCount]   = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [showAIWidget, setShowAIWidget] = useState(false);

  const navItems = [
    { icon: Home,          label: "Home",     path: "/home" },
    { icon: Wallet,        label: "Wallet",   path: "/home/wallet" },
    { icon: Search,        label: "Services", path: "/home/services" },
    { icon: MessageCircle, label: "Messages", path: "/home/messages" },
    { icon: CalendarCheck, label: "Bookings", path: "/home/bookings" },
    { icon: User,          label: "Profile",  path: "/home/profile" },
  ];

  const fetchCounts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ── Unread messages ──────────────────────────────────────
      const { data: convos } = await supabase
        .from("conversations").select("id")
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);

      if (convos && convos.length > 0) {
        const { count } = await supabase
          .from("messages").select("*", { count: "exact", head: true })
          .in("conversation_id", convos.map(c => c.id))
          .eq("is_read", false).neq("sender_id", user.id);
        setUnreadCount(count || 0);
      }

      // ── Pending bookings ─────────────────────────────────────
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();

      const isProvider = profile?.role === "provider" || profile?.role === "local_business";

      const { count: bookingCount } = await supabase
        .from("bookings").select("*", { count: "exact", head: true })
        .eq(isProvider ? "provider_id" : "client_id", user.id)
        .eq("status", "pending");

      setPendingBookings(bookingCount || 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCounts();

    const channel = supabase
      .channel("nav-counts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => fetchCounts())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => fetchCounts())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, () => fetchCounts())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings" }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCounts]);

  return (
    <div className="leaseus-app-shell h-screen flex flex-col max-w-md mx-auto">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* AI Chat Widget — lazy loaded on demand so it doesn't slow every page */}
      {showAIWidget ? (
        <Suspense fallback={null}>
          <AIChatWidget defaultOpen />
        </Suspense>
      ) : (
        <button
          onClick={() => setShowAIWidget(true)}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E3A8A] text-white shadow-lg transition-all hover:bg-[#152d6b]"
          aria-label="Open LeaseUs AI"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg border-t border-white/20 px-2 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon      = item.icon;
            const isActive  = location.pathname === item.path ||
              (item.path !== "/home" && location.pathname.startsWith(item.path));
            const isMessages = item.path === "/home/messages";
            const isBookings = item.path === "/home/bookings";

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors relative ${
                  isActive ? "text-[#1E3A8A]" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? "fill-[#1E3A8A]" : ""}`} />

                  {/* Unread messages badge */}
                  {isMessages && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#10B981] rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}

                  {/* Pending bookings badge */}
                  {isBookings && pendingBookings > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {pendingBookings > 9 ? "9+" : pendingBookings}
                    </span>
                  )}
                </div>
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
