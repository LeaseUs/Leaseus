import { Outlet, Link, useLocation } from "react-router";
import { Home, Wallet, Search, Award, User, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import bgImage from "../../assets/background.png";

export function Layout() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = [
    { icon: Home,          label: "Home",     path: "/home" },
    { icon: Wallet,        label: "Wallet",   path: "/home/wallet" },
    { icon: Search,        label: "Services", path: "/home/services" },
    { icon: MessageCircle, label: "Messages", path: "/home/messages" },
    { icon: Award,         label: "Loyalty",  path: "/home/loyalty" },
    { icon: User,          label: "Profile",  path: "/home/profile" },
  ];

  // ── Unread message count badge ─────────────────────────────────
  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to new messages in realtime
    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchUnreadCount()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get conversations where user is participant
      const { data: convos } = await supabase
        .from("conversations")
        .select("id")
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);

      if (!convos || convos.length === 0) return;

      const convoIds = convos.map(c => c.id);

      // Count unread messages not sent by this user
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convoIds)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      setUnreadCount(count || 0);
    } catch { /* silent */ }
  };

  return (
    <div
      className="h-screen flex flex-col max-w-md mx-auto relative"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg border-t border-white/20 px-2 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== "/home" && location.pathname.startsWith(item.path));
            const isMessages = item.path === "/home/messages";

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
                  {/* Unread badge on Messages icon */}
                  {isMessages && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#10B981] rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
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
