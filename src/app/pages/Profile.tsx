import { useState, useEffect, useRef } from "react";
import { User, ChevronRight, Bell, Shield, HelpCircle, FileText, LogOut, Camera, CheckCircle, AlertCircle, Loader2, X, Eye, EyeOff, Upload, BellOff } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

type Modal = "edit" | "password" | "photo" | "notifications" | "kyc" | null;

export function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeModal, setActiveModal] = useState<Modal>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit Info
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", bio: "" });

  // Password
  const [passwordForm, setPasswordForm] = useState({ newPass: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState({
    bookings: true, payments: true, messages: true, promotions: false, loyalty: true,
  });

  // KYC
  const [kycStep, setKycStep] = useState(1);
  const [kycDoc, setKycDoc] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
      setEditForm({ full_name: data?.full_name || "", phone: data?.phone || "", bio: data?.bio || "" });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => { setError(""); setSuccess(""); };
  const openModal = (modal: Modal) => { clearMessages(); setKycStep(1); setActiveModal(modal); };
  const closeModal = () => { setActiveModal(null); clearMessages(); };

  const handleSaveInfo = async () => {
    setSaving(true); clearMessages();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("profiles")
        .update({ full_name: editForm.full_name, phone: editForm.phone, bio: editForm.bio })
        .eq("id", user!.id);
      if (error) throw error;
      setSuccess("Profile updated successfully!");
      fetchProfile();
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    clearMessages();
    if (passwordForm.newPass !== passwordForm.confirm) { setError("Passwords don't match."); return; }
    if (passwordForm.newPass.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
      if (error) throw error;
      setSuccess("Password changed successfully!");
      setPasswordForm({ newPass: "", confirm: "" });
    } catch (err: any) {
      setError(err.message || "Failed to change password.");
    } finally { setSaving(false); }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true); clearMessages();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop();
      const path = `avatars/${user!.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user!.id);
      if (updateError) throw updateError;
      setSuccess("Photo updated!");
      fetchProfile();
      setTimeout(closeModal, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to upload photo. Make sure the avatars storage bucket exists in Supabase.");
    } finally { setSaving(false); }
  };

  const handleKycSubmit = async () => {
    if (!kycDoc) { setError("Please select a document to upload."); return; }
    setSaving(true); clearMessages();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = kycDoc.name.split(".").pop();
      const path = `kyc/${user!.id}/id_document.${ext}`;
      const { error: uploadError } = await supabase.storage.from("kyc-documents").upload(path, kycDoc, { upsert: true });
      if (uploadError) throw uploadError;
      setKycStep(3);
      fetchProfile();
    } catch (err: any) {
      setError(err.message || "Failed to submit. Make sure kyc-documents storage bucket exists in Supabase.");
    } finally { setSaving(false); }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate("/login");
  };

  const formatMemberSince = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const getInitials = (name: string) =>
    name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "?";

  const getTierLabel = (tier: string) => ({ basic: "Basic (Free)", standard: "Standard (£10/mo)", premium: "Premium (£25/mo)" }[tier] || "Basic (Free)");

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" /></div>;
  }

  return (
    <div className="min-h-screen">
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-12 rounded-b-3xl">
        <h1 className="text-xl text-white">Profile</h1>
      </div>

      <div className="mx-4 -mt-8 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/30">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} className="w-20 h-20 rounded-full object-cover" />
              : <div className="w-20 h-20 bg-gradient-to-br from-[#10B981] to-[#14B8A6] rounded-full flex items-center justify-center text-white text-2xl">{getInitials(profile?.full_name || "")}</div>
            }
            <button onClick={() => openModal("photo")} className="absolute bottom-0 right-0 w-6 h-6 bg-[#1E3A8A] rounded-full flex items-center justify-center border-2 border-white">
              <Camera className="w-3 h-3 text-white" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-lg text-gray-800 mb-1">{profile?.full_name || "User"}</h2>
            <p className="text-sm text-gray-500 mb-1">{profile?.email}</p>
            <p className="text-sm text-gray-500">{profile?.phone || "No phone added"}</p>
            {profile?.referral_code && (
              <div className="mt-2 flex items-center gap-1">
                <span className="text-xs text-gray-400">Referral:</span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-[#1E3A8A]">{profile.referral_code}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          {profile?.kyc_verified
            ? <><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-green-600">KYC Verified</span></>
            : <><AlertCircle className="w-4 h-4 text-orange-600" /><span className="text-sm text-orange-600">KYC Pending</span></>
          }
          <span className="text-sm text-gray-400 ml-auto">Member since {profile?.created_at ? formatMemberSince(profile.created_at) : "2026"}</span>
        </div>
      </div>

      <div className="mx-4 mt-4 bg-gradient-to-r from-[#1E3A8A]/90 to-[#10B981]/90 backdrop-blur-md rounded-xl p-4 text-white border border-white/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Current Plan</p>
            <p className="text-lg">{getTierLabel(profile?.subscription_tier || "basic")}</p>
          </div>
          {(!profile?.subscription_tier || profile.subscription_tier === "basic") && (
            <button onClick={() => navigate("/home/subscriptions")} className="bg-white text-[#1E3A8A] px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors">Upgrade</button>
          )}
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6 pb-6">
        {/* Account Section */}
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">Account</h3>
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30">
            {[
              { icon: User, label: "Personal Information", action: () => openModal("edit"), badge: null, badgeColor: "" },
              { icon: Shield, label: "Change Password", action: () => openModal("password"), badge: "Security", badgeColor: "blue" },
              { icon: FileText, label: "KYC Verification", action: () => openModal("kyc"), badge: profile?.kyc_verified ? "Verified" : "Pending", badgeColor: profile?.kyc_verified ? "green" : "orange" },
            ].map((item, i, arr) => {
              const Icon = item.icon;
              return (
                <button key={i} onClick={item.action} className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors ${i !== arr.length - 1 ? "border-b border-gray-100" : ""}`}>
                  <Icon className="w-5 h-5 text-gray-400" />
                  <span className="flex-1 text-left text-sm text-gray-700">{item.label}</span>
                  {item.badge && (
                    <span className={`text-xs px-2 py-1 rounded-full ${item.badgeColor === "green" ? "bg-green-100 text-green-700" : item.badgeColor === "orange" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>{item.badge}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">Preferences</h3>
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30">
            <button onClick={() => openModal("notifications")} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="flex-1 text-left text-sm text-gray-700">Notifications</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">Support</h3>
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30">
            {[{ icon: HelpCircle, label: "Help & Support" }, { icon: FileText, label: "Terms of Service" }, { icon: FileText, label: "Privacy Policy" }].map((item, i, arr) => {
              const Icon = item.icon;
              return (
                <button key={i} className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors ${i !== arr.length - 1 ? "border-b border-gray-100" : ""}`}>
                  <Icon className="w-5 h-5 text-gray-400" />
                  <span className="flex-1 text-left text-sm text-gray-700">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30">
          <button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors disabled:opacity-70">
            {loggingOut ? <Loader2 className="w-5 h-5 text-red-600 animate-spin" /> : <LogOut className="w-5 h-5 text-red-600" />}
            <span className="flex-1 text-left text-sm text-red-600">{loggingOut ? "Signing out..." : "Sign Out"}</span>
            <ChevronRight className="w-4 h-4 text-red-400" />
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pt-4">LeaseUs v1.0.0</p>
      </div>

      {/* ── MODALS ── */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center max-w-md mx-auto">
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">

            {/* Edit Personal Info */}
            {activeModal === "edit" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
                  <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Full Name</label>
                    <input type="text" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Phone Number</label>
                    <input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+44 7700 900123"
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Bio <span className="text-gray-400">(optional)</span></label>
                    <textarea value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Tell people about yourself..." rows={3}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none" />
                  </div>
                  <button onClick={handleSaveInfo} disabled={saving}
                    className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {/* Change Password */}
            {activeModal === "password" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Change Password</h2>
                  <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}
                <div className="space-y-4">
                  {[{ label: "New Password", key: "newPass" }, { label: "Confirm New Password", key: "confirm" }].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-sm text-gray-700 mb-2">{label}</label>
                      <div className="relative">
                        <input type={showPass ? "text" : "password"}
                          value={passwordForm[key as keyof typeof passwordForm]}
                          onChange={e => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                          placeholder="Min 8 characters"
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleChangePassword} disabled={saving}
                    className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : "Update Password"}
                  </button>
                </div>
              </>
            )}

            {/* Upload Photo */}
            {activeModal === "photo" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Profile Photo</h2>
                  <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}
                <div className="flex flex-col items-center gap-4">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="Current" className="w-24 h-24 rounded-full object-cover" />
                    : <div className="w-24 h-24 bg-gradient-to-br from-[#10B981] to-[#14B8A6] rounded-full flex items-center justify-center text-white text-3xl">{getInitials(profile?.full_name || "")}</div>
                  }
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  <button onClick={() => photoInputRef.current?.click()} disabled={saving}
                    className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Camera className="w-4 h-4" />Choose Photo</>}
                  </button>
                  <p className="text-xs text-gray-400">JPG, PNG or GIF. Max 5MB.</p>
                </div>
              </>
            )}

            {/* Notifications */}
            {activeModal === "notifications" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Notification Preferences</h2>
                  <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="space-y-3">
                  {[
                    { key: "bookings", label: "Booking Updates", desc: "Requests, confirmations, completions" },
                    { key: "payments", label: "Payment Alerts", desc: "Escrow holds, releases, wallet updates" },
                    { key: "messages", label: "Messages", desc: "New messages from providers or clients" },
                    { key: "loyalty", label: "Loyalty & Rewards", desc: "Points earned, tier upgrades, LEUS bonuses" },
                    { key: "promotions", label: "Promotions", desc: "Deals, offers and platform news" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        {notifPrefs[key as keyof typeof notifPrefs] ? <Bell className="w-5 h-5 text-[#10B981]" /> : <BellOff className="w-5 h-5 text-gray-400" />}
                        <div>
                          <p className="text-sm text-gray-800">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                      </div>
                      <button onClick={() => setNotifPrefs({ ...notifPrefs, [key]: !notifPrefs[key as keyof typeof notifPrefs] })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${notifPrefs[key as keyof typeof notifPrefs] ? "bg-[#10B981]" : "bg-gray-300"}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${notifPrefs[key as keyof typeof notifPrefs] ? "translate-x-7" : "translate-x-1"}`} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={closeModal} className="w-full mt-4 bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors">
                  Save Preferences
                </button>
              </>
            )}

            {/* KYC */}
            {activeModal === "kyc" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">KYC Verification</h2>
                  <button onClick={closeModal}><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                {kycStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Verify your identity to unlock full platform features and higher wallet limits.</p>
                    {["Passport", "National ID Card", "Driver's Licence"].map((doc) => (
                      <button key={doc} onClick={() => setKycStep(2)}
                        className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-[#10B981] transition-colors text-left">
                        <FileText className="w-5 h-5 text-[#1E3A8A]" />
                        <span className="flex-1 text-sm text-gray-700">{doc}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}

                {kycStep === 2 && (
                  <div className="space-y-4">
                    {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
                    <p className="text-sm text-gray-600">Upload a clear photo of your document.</p>
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={e => setKycDoc(e.target.files?.[0] || null)} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-[#10B981] transition-colors">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">{kycDoc ? kycDoc.name : "Tap to upload document"}</span>
                      <span className="text-xs text-gray-400">JPG, PNG or PDF. Max 10MB.</span>
                    </button>
                    <button onClick={handleKycSubmit} disabled={saving || !kycDoc}
                      className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                      {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : "Submit for Verification"}
                    </button>
                  </div>
                )}

                {kycStep === 3 && (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Document Submitted!</h3>
                    <p className="text-sm text-gray-600 text-center">We'll review your document within 24-48 hours and notify you once verified.</p>
                    <button onClick={closeModal} className="w-full bg-[#10B981] text-white py-3 rounded-xl hover:bg-[#0d9668] transition-colors">Done</button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

