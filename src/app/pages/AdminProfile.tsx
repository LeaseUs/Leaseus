import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, LogOut, Mail, Save, Shield, User } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function AdminProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", bio: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!data || data.role !== "admin") {
        navigate("/home");
        return;
      }

      setProfile(data);
      setForm({
        full_name: data.full_name || "",
        phone: data.phone || "",
        bio: data.bio || "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to load admin profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone: form.phone,
          bio: form.bio,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      setSuccess("Profile updated.");
      await fetchProfile();
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E3A8A] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Admin Profile</h1>
            <p className="text-sm text-white/70">Manage your account and access</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-3 py-2 rounded-lg bg-white/15 text-white text-sm flex items-center gap-2 disabled:opacity-70"
          >
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#10B981] text-white flex items-center justify-center font-bold text-lg">
              {profile?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "AD"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{profile?.full_name || "Admin"}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4 text-[#10B981]" />
                {profile?.role || "admin"}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Full Name</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Email</label>
                <div className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-600 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {profile?.email || "No email"}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Bio</label>
              <textarea
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
                placeholder="Add a short admin profile bio"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Admin Access</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#1E3A8A]" />
              Account ID: {profile?.id}
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#10B981]" />
              Role: {profile?.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
