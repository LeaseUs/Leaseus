import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { fetchAuthBootstrap, getStoredAuthBootstrap } from "../../lib/authBootstrap";
import { supabase } from "../../lib/supabase";
import { Loader2, LayoutDashboard, MessageSquare, DollarSign, ShieldCheck, Store, LogOut, UserCircle } from "lucide-react";
import { AnalyticsTab } from "./admin/AnalyticsTab";
import { ChatsTab } from "./admin/ChatsTab";
import { FinancesTab } from "./admin/FinancesTab";

type Tab = "analytics" | "chats" | "finances";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      const cached = getStoredAuthBootstrap();
      if (cached?.profile?.role === "admin") {
        setIsAdmin(true);
        setLoading(false);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      const bootstrap = await fetchAuthBootstrap(user.id);
      if (bootstrap.profile?.role !== "admin") {
        navigate("/home");
        return;
      }
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(profileData || null);
      setIsAdmin(true);
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem("isLoggedIn");
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E3A8A] px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/profile")}
              className="px-3 py-2 rounded-lg bg-white/15 text-white text-sm flex items-center gap-2"
            >
              <UserCircle className="w-4 h-4" />
              {profile?.full_name?.split(" ")[0] || "Profile"}
            </button>
            <button
              onClick={() => navigate("/admin/kyc")}
              className="px-3 py-2 rounded-lg bg-white/15 text-white text-sm flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              KYC
            </button>
            <button
              onClick={() => navigate("/admin/partners")}
              className="px-3 py-2 rounded-lg bg-white/15 text-white text-sm flex items-center gap-2"
            >
              <Store className="w-4 h-4" />
              Partners
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3 py-2 rounded-lg bg-white text-[#1E3A8A] text-sm flex items-center gap-2 disabled:opacity-70"
            >
              {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Logout
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white border-r border-gray-200 p-4 space-y-2">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left ${
              activeTab === "analytics"
                ? "bg-[#1E3A8A] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("chats")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left ${
              activeTab === "chats"
                ? "bg-[#1E3A8A] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chats
          </button>
          <button
            onClick={() => setActiveTab("finances")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left ${
              activeTab === "finances"
                ? "bg-[#1E3A8A] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Finances
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "chats" && <ChatsTab />}
          {activeTab === "finances" && <FinancesTab />}
        </div>
      </div>
    </div>
  );
}
