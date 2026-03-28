import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { fetchAuthBootstrap, getStoredAuthBootstrap } from "../../lib/authBootstrap";
import { supabase } from "../../lib/supabase";
import { Loader2, LayoutDashboard, MessageSquare, DollarSign, LogOut, UserCircle, ClipboardCheck, Landmark, ShieldCheck, Store } from "lucide-react";
import { AnalyticsTab } from "./admin/AnalyticsTab";
import { ChatsTab } from "./admin/ChatsTab";
import { FinancesTab } from "./admin/FinancesTab";
import { ApplicationsTab } from "./admin/ApplicationsTab";
import { EscrowTab } from "./admin/EscrowTab";
import { ProvidersTab } from "./admin/ProvidersTab";
import { AdminNav } from "../components/AdminNav";

type Tab = "analytics" | "providers" | "partners" | "escrow" | "chats" | "finances";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,58,138,0.16),_transparent_36%),linear-gradient(180deg,#f7fafc_0%,#edf4ff_48%,#f8fafc_100%)]">
      <div className="border-b border-white/50 bg-[#1E3A8A]/92 px-6 py-5 shadow-lg shadow-slate-300/30 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-white/70">Review provider applications, monitor finances, and control escrow.</p>
            <AdminNav current="dashboard" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/admin/profile")}
              className="rounded-2xl bg-white/15 px-3 py-2 text-sm text-white flex items-center gap-2"
            >
              <UserCircle className="w-4 h-4" />
              {profile?.full_name?.split(" ")[0] || "Profile"}
            </button>
            <button
              onClick={() => navigate("/admin/kyc")}
              className="rounded-2xl bg-white/15 px-3 py-2 text-sm text-white flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              KYC
            </button>
            <button
              onClick={() => navigate("/admin/partners")}
              className="rounded-2xl bg-white/15 px-3 py-2 text-sm text-white flex items-center gap-2"
            >
              <Store className="w-4 h-4" />
              Partners
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-2xl bg-white px-3 py-2 text-sm text-[#1E3A8A] flex items-center gap-2 disabled:opacity-70"
            >
              {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Logout
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-6 p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-[#1E3A8A]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Providers</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Service professionals and local businesses that complete KYC, skills assessment, DBS checks, and right-to-work verification.
                </p>
                <button
                  onClick={() => setActiveTab("providers")}
                  className="mt-3 rounded-2xl bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white"
                >
                  Review Provider Applications
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">LEUS Partners</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Business partners that join the LEUS partner network to appear on the map and accept rewards-related traffic.
                </p>
                <button
                  onClick={() => setActiveTab("partners")}
                  className="mt-3 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
                >
                  Review LEUS Partner Applications
                </button>
              </div>
            </div>
          </div>
        </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar */}
        <div className="w-full rounded-3xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-slate-200/60 backdrop-blur md:w-72 md:self-start">
          <div className="mb-3 px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin Tools</p>
          </div>
          <div className="space-y-2">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-2 rounded-2xl px-4 py-3 text-left ${
              activeTab === "analytics"
                ? "bg-[#1E3A8A] text-white shadow-md shadow-blue-900/20"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("providers")}
            className={`w-full flex items-center gap-2 rounded-2xl px-4 py-3 text-left ${
              activeTab === "providers"
                ? "bg-[#1E3A8A] text-white shadow-md shadow-blue-900/20"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Providers
          </button>
          <button
            onClick={() => setActiveTab("partners")}
            className={`w-full flex items-center gap-2 rounded-2xl px-4 py-3 text-left ${
              activeTab === "partners"
                ? "bg-[#1E3A8A] text-white shadow-md shadow-blue-900/20"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            LEUS Partners
          </button>
          <button
            onClick={() => setActiveTab("escrow")}
            className={`w-full flex items-center gap-2 rounded-2xl px-4 py-3 text-left ${
              activeTab === "escrow"
                ? "bg-[#1E3A8A] text-white shadow-md shadow-blue-900/20"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Landmark className="w-4 h-4" />
            Escrow
          </button>
          <button
            onClick={() => setActiveTab("chats")}
            className={`w-full flex items-center gap-2 rounded-2xl px-4 py-3 text-left ${
              activeTab === "chats"
                ? "bg-[#1E3A8A] text-white shadow-md shadow-blue-900/20"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chats
          </button>
          <button
            onClick={() => setActiveTab("finances")}
            className={`w-full flex items-center gap-2 rounded-2xl px-4 py-3 text-left ${
              activeTab === "finances"
                ? "bg-[#1E3A8A] text-white shadow-md shadow-blue-900/20"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Finances
          </button>
        </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "providers" && <ProvidersTab />}
          {activeTab === "partners" && <ApplicationsTab />}
          {activeTab === "escrow" && <EscrowTab />}
          {activeTab === "chats" && <ChatsTab />}
          {activeTab === "finances" && <FinancesTab />}
        </div>
      </div>
      </div>
    </div>
  );
}
