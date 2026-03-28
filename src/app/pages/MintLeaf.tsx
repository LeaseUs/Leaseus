import { useState, useEffect, useCallback } from "react";
import {
  Leaf, QrCode, Gift, Lock, Clock, CheckCircle,
  Loader2, Copy, Share2, AlertCircle, Download,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { MintLeafCard } from "./components/MintLeafCard";
import mintleafLogo from "../../assets/mintleaf-logo.png";

export function MintLeaf() {
  const [activeTab, setActiveTab]         = useState<"create" | "claim" | "owned">("create");
  const [profile, setProfile]             = useState<any>(null);
  const [ownedMintLeafs, setOwnedMintLeafs] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [creating, setCreating]           = useState(false);
  const [claiming, setClaiming]           = useState(false);
  const [createdMintLeaf, setCreatedMintLeaf] = useState<any>(null);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");
  const [copied, setCopied]               = useState(false);
  const [showCardFor, setShowCardFor]     = useState<string | null>(null);

  // Create form
  const [amount, setAmount]               = useState("");
  const [pin, setPin]                     = useState("");
  const [message, setMessage]             = useState("");
  const [mintleafType, setMintleafType]   = useState("standard");

  // Claim form
  const [claimToken, setClaimToken]       = useState("");
  const [claimPin, setClaimPin]           = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, leus_balance, subscription_tier")
        .eq("id", user.id).single();
      setProfile(profileData);

      const { data: mintleafData } = await supabase
        .from("mintleafs")
        .select("*, profiles!claimer_id(full_name, email)")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      setOwnedMintLeafs(mintleafData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getCreationFee = () => {
    const tier      = profile?.subscription_tier || "basic";
    const feeRates: Record<string, number> = { basic: 0.01, standard: 0.005, premium: 0 };
    return Number(amount) * (feeRates[tier] || 0.01);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const leusamount = Number(amount);
      const fee        = getCreationFee();
      const total      = leusamount + fee;

      if (Number(profile?.leus_balance) < total) {
        setError(`Insufficient LEUS. You need ᛃ${total.toFixed(2)} but have ᛃ${Number(profile?.leus_balance).toFixed(2)}.`);
        setCreating(false); return;
      }
      if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
        setError("PIN must be 4-6 digits."); setCreating(false); return;
      }

      // Try edge function first
      try {
        const { data, error: fnError } = await supabase.functions.invoke("create-mintleaf", {
          body: { leus_amount: leusamount, pin, type: mintleafType, message: message || null },
        });
        if (fnError) throw fnError;
        await supabase.from("profiles")
          .update({ leus_balance: Number(profile.leus_balance) - total }).eq("id", user.id);
        setCreatedMintLeaf(data);
      } catch {
        // Fallback: direct DB insert
        const qrToken = crypto.randomUUID();
        const { data: mintData, error: insertError } = await supabase
          .from("mintleafs")
          .insert({
            creator_id: user.id, leus_amount: leusamount,
            creation_fee_leus: fee, pin_hash: pin,
            type: mintleafType, message: message || null,
            qr_token: qrToken, status: "active",
          }).select().single();
        if (insertError) throw insertError;
        await supabase.from("profiles")
          .update({ leus_balance: Number(profile.leus_balance) - total }).eq("id", user.id);
        setCreatedMintLeaf({ ...mintData, qr_token: qrToken });
      }

      setAmount(""); setPin(""); setMessage("");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to create MintLeaf.");
    } finally { setCreating(false); }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setClaiming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const { data, error: fnError } = await supabase.functions.invoke("claim-mintleaf", {
          body: { qr_token: claimToken, pin: claimPin },
        });
        if (fnError) throw fnError;
        setSuccess(`🎉 Successfully claimed ᛃ${data?.leus_amount || "?"} LEUS!`);
      } catch {
        // Fallback
        const { data: mintData, error: fetchError } = await supabase
          .from("mintleafs").select("*").eq("qr_token", claimToken).single();
        if (fetchError || !mintData) { setError("MintLeaf not found."); setClaiming(false); return; }
        if (mintData.status !== "active") { setError("Already claimed or expired."); setClaiming(false); return; }
        if (mintData.creator_id === user.id) { setError("You cannot claim your own MintLeaf."); setClaiming(false); return; }
        if (mintData.pin_hash !== claimPin) { setError("Incorrect PIN."); setClaiming(false); return; }

        await supabase.from("mintleafs").update({
          status: "claimed", claimer_id: user.id, claimed_at: new Date().toISOString(),
        }).eq("id", mintData.id);
        await supabase.from("profiles")
          .update({ leus_balance: Number(profile.leus_balance) + Number(mintData.leus_amount) })
          .eq("id", user.id);
        setSuccess(`🎉 Successfully claimed ᛃ${mintData.leus_amount} LEUS!`);
      }

      setClaimToken(""); setClaimPin(""); fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to claim MintLeaf.");
    } finally { setClaiming(false); }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (token: string, amount: number) => {
    if (navigator.share) {
      navigator.share({ title: "LeaseUs MintLeaf", text: `I'm sending you ᛃ${amount} LEUS! Code: ${token}` });
    } else {
      handleCopyToken(token);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#10B981]/90 to-[#14B8A6]/90 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-2">
          <img src={mintleafLogo} alt="MintLeaf" className="w-8 h-8 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <h1 className="text-xl text-white">MintLeaf</h1>
        </div>
        <p className="text-white/90 text-sm">Create and share LEUS value with anyone</p>
        <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 inline-flex items-center gap-2">
          <Leaf className="w-4 h-4 text-white" />
          <span className="text-white text-sm">Balance: ᛃ{Number(profile?.leus_balance || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Info */}
      <div className="mx-4 mt-4 bg-blue-50/80 backdrop-blur-md border border-blue-200/50 rounded-xl p-4">
        <h3 className="text-sm text-blue-800 mb-1 flex items-center gap-2">
          <Gift className="w-4 h-4" />What is MintLeaf?
        </h3>
        <p className="text-xs text-blue-700">Lock LEUS coins and share via QR code or card. Recipients claim with a PIN. Perfect for gifts and payments!</p>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 bg-white/80 backdrop-blur-md rounded-xl p-1 shadow-sm border border-white/30">
          {[
            { key: "create", label: "Create" },
            { key: "claim",  label: "Claim" },
            { key: "owned",  label: `My MintLeafs (${ownedMintLeafs.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => { setActiveTab(key as any); setError(""); setSuccess(""); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${activeTab === key ? "bg-[#10B981] text-white" : "text-gray-600"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 pb-6">

        {/* ── CREATE TAB ── */}
        {activeTab === "create" && (
          <>
            {!createdMintLeaf ? (
              <form onSubmit={handleCreate} className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-sm space-y-4 border border-white/30">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

                {/* Type */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">MintLeaf Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "standard",   label: "Standard",   desc: "Anyone with PIN can claim" },
                      { value: "single_use", label: "Single Use", desc: "One-time claim only" },
                    ].map(t => (
                      <button key={t.value} type="button" onClick={() => setMintleafType(t.value)}
                        className={`p-3 rounded-xl border text-left transition-colors ${mintleafType === t.value ? "border-[#10B981] bg-[#10B981]/10" : "border-gray-200 bg-gray-50"}`}>
                        <p className="text-xs font-semibold text-gray-800">{t.label}</p>
                        <p className="text-xs text-gray-500">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">LEUS Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">ᛃ</span>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0.00" min="1" step="0.01" required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Available: ᛃ{Number(profile?.leus_balance || 0).toFixed(2)}</p>
                </div>

                {/* PIN */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Create PIN (4-6 digits)</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                      placeholder="Enter PIN" minLength={4} maxLength={6} pattern="[0-9]*" required
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Share this PIN with the recipient</p>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Message <span className="text-gray-400">(optional)</span></label>
                  <input type="text" value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Happy Birthday! 🎉"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
                </div>

                {/* Summary */}
                {amount && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Amount to lock:</span>
                      <span className="text-gray-800">ᛃ{Number(amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Creation fee ({profile?.subscription_tier === "premium" ? "0%" : profile?.subscription_tier === "standard" ? "0.5%" : "1%"}):</span>
                      <span className="text-gray-800">ᛃ{getCreationFee().toFixed(4)}</span>
                    </div>
                    <div className="h-px bg-gray-200" />
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-800">Total deducted:</span>
                      <span className="text-[#10B981]">ᛃ{(Number(amount) + getCreationFee()).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={creating}
                  className="w-full bg-[#10B981] text-white py-3 rounded-xl hover:bg-[#0d9668] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                  {creating ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><Leaf className="w-4 h-4" />Create MintLeaf</>}
                </button>
              </form>
            ) : (
              /* ── SUCCESS: show card + QR + actions ── */
              <div className="space-y-4">
                <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm text-center border border-white/30">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-[#10B981]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">MintLeaf Created!</h3>
                  <p className="text-sm text-gray-600 mb-4">ᛃ{createdMintLeaf.leus_amount} ready to share</p>

                  {/* QR Code */}
                  <div className="w-56 h-56 mx-auto rounded-xl overflow-hidden mb-4 border border-gray-200">
                    {createdMintLeaf.qr_image_url ? (
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`leaseus://mintleaf/${createdMintLeaf.qr_token}`)}`}
                        alt="QR Code" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <QrCode className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Token */}
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">MintLeaf Code</p>
                    <p className="font-mono text-xs text-gray-800 break-all">{createdMintLeaf.qr_token}</p>
                  </div>

                  {createdMintLeaf.message && (
                    <div className="bg-green-50 rounded-xl p-3 mb-3">
                      <p className="text-sm text-green-700">"{createdMintLeaf.message}"</p>
                    </div>
                  )}

                  <div className="flex gap-2 mb-3">
                    <button onClick={() => handleCopyToken(createdMintLeaf.qr_token)}
                      className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                      <Copy className="w-4 h-4" />{copied ? "Copied!" : "Copy Code"}
                    </button>
                    <button onClick={() => handleShare(createdMintLeaf.qr_token, createdMintLeaf.leus_amount)}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#10B981] text-white py-2.5 rounded-xl hover:bg-[#0d9668] transition-colors text-sm">
                      <Share2 className="w-4 h-4" />Share
                    </button>
                  </div>

                  <button onClick={() => setCreatedMintLeaf(null)}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    Create Another
                  </button>
                </div>

                {/* ── Downloadable LEUS Card ── */}
                <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-white/30">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#1E3A8A]" />Download LEUS Card
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">Save this card and share it physically or digitally. The recipient can scan the QR pattern to claim.</p>
                  <MintLeafCard
                    amount={createdMintLeaf.leus_amount}
                    qrToken={createdMintLeaf.qr_token}
                    recipientName={createdMintLeaf.message || undefined}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CLAIM TAB ── */}
        {activeTab === "claim" && (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-white/30">
            {error   && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}

            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">MintLeaf Code</label>
                <input type="text" value={claimToken} onChange={e => setClaimToken(e.target.value)}
                  placeholder="Paste MintLeaf code here" required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">PIN</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="password" value={claimPin} onChange={e => setClaimPin(e.target.value)}
                    placeholder="Enter PIN from sender" required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">Make sure you have the correct code and PIN. Each MintLeaf can only be claimed once.</p>
              </div>
              <button type="submit" disabled={claiming}
                className="w-full bg-[#10B981] text-white py-3 rounded-xl hover:bg-[#0d9668] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                {claiming ? <><Loader2 className="w-4 h-4 animate-spin" />Claiming...</> : <><Gift className="w-4 h-4" />Claim LEUS</>}
              </button>
            </form>
          </div>
        )}

        {/* ── OWNED TAB ── */}
        {activeTab === "owned" && (
          <div className="space-y-3">
            {ownedMintLeafs.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 text-center border border-white/30">
                <Leaf className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No MintLeafs created yet</p>
                <button onClick={() => setActiveTab("create")}
                  className="mt-4 bg-[#10B981] text-white px-6 py-2 rounded-xl text-sm hover:bg-[#0d9668] transition-colors">
                  Create First MintLeaf
                </button>
              </div>
            ) : ownedMintLeafs.map(mintleaf => (
              <div key={mintleaf.id} className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/30 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold text-[#10B981]">ᛃ{Number(mintleaf.leus_amount).toFixed(2)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          mintleaf.status === "active"  ? "bg-green-100 text-green-700" :
                          mintleaf.status === "claimed" ? "bg-gray-100 text-gray-600" :
                          "bg-red-100 text-red-600"
                        }`}>{mintleaf.status}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />Created {formatDate(mintleaf.created_at)}
                      </div>
                    </div>
                    {mintleaf.status === "active" && (
                      <button onClick={() => handleShare(mintleaf.qr_token, mintleaf.leus_amount)}
                        className="flex items-center gap-1 text-xs text-[#10B981] bg-green-50 px-3 py-1.5 rounded-lg">
                        <Share2 className="w-3 h-3" />Share
                      </button>
                    )}
                  </div>

                  {mintleaf.message && (
                    <p className="text-xs text-gray-500 italic mb-2">"{mintleaf.message}"</p>
                  )}

                  {mintleaf.status === "claimed" && mintleaf.profiles && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Claimed by {mintleaf.profiles.full_name || "someone"}
                      {mintleaf.claimed_at && ` on ${formatDate(mintleaf.claimed_at)}`}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {mintleaf.status === "active" && (
                  <div className="flex border-t border-gray-100">
                    <button onClick={() => handleCopyToken(mintleaf.qr_token)}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                      <Copy className="w-3.5 h-3.5" />Copy Code
                    </button>
                    <button
                      onClick={() => setShowCardFor(showCardFor === mintleaf.id ? null : mintleaf.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-[#1E3A8A] hover:bg-blue-50 transition-colors border-x border-gray-100">
                      <Download className="w-3.5 h-3.5" />
                      {showCardFor === mintleaf.id ? "Hide Card" : "Download Card"}
                    </button>
                    <button onClick={() => handleShare(mintleaf.qr_token, mintleaf.leus_amount)}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-[#10B981] hover:bg-green-50 transition-colors">
                      <Share2 className="w-3.5 h-3.5" />Share
                    </button>
                  </div>
                )}

                {/* Expandable card download */}
                {showCardFor === mintleaf.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                    <MintLeafCard
                      amount={Number(mintleaf.leus_amount)}
                      qrToken={mintleaf.qr_token}
                      recipientName={mintleaf.message || undefined}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
