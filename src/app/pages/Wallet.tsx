import { useState, useEffect } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, TrendingUp, Clock, Sparkles, QrCode, Camera, Gift, Lock, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface Transaction {
  id: string;
  type: string;
  fiat_delta_pence: number;
  leus_delta: number;
  points_delta: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

interface Profile {
  fiat_balance_pence: number;
  leus_balance: number;
  loyalty_points: number;
  subscription_tier: string;
}

export function Wallet() {
  const [activeTab, setActiveTab] = useState<"all" | "fiat" | "leus" | "mintleaf">("all");
  const [mintLeafSubTab, setMintLeafSubTab] = useState<"create" | "scan" | "owned">("create");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mintLeafs, setMintLeafs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [minting, setMinting] = useState(false);
  const [convertAmount, setConvertAmount] = useState("");
  const [showConvert, setShowConvert] = useState(false);
  const [convertDirection, setConvertDirection] = useState<"toLeus" | "toFiat">("toFiat");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [leusRate, setLeusRate] = useState(100);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("fiat_balance_pence, leus_balance, loyalty_points, subscription_tier")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData);

      const { data: txData } = await supabase
        .from("wallet_transactions")
        .select("id, type, fiat_delta_pence, leus_delta, points_delta, reference, notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (txData) setTransactions(txData);

      const { data: mintData } = await supabase
        .from("mintleafs")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (mintData) setMintLeafs(mintData);

      const { data: rateData } = await supabase
        .from("leus_rates")
        .select("rate_pence")
        .eq("is_active", true)
        .single();
      if (rateData) setLeusRate(rateData.rate_pence);

    } catch (err) {
      console.error("Wallet error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    setError(""); setSuccess("");
    if (!convertAmount || isNaN(Number(convertAmount))) {
      setError("Please enter a valid amount."); return;
    }
    setConverting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (convertDirection === "toLeus") {
        const pence = Math.round(Number(convertAmount) * 100);
        const { error } = await supabase.rpc("convert_fiat_to_leus", { p_user_id: user.id, p_pence: pence });
        if (error) throw error;
        setSuccess(`Converted £${convertAmount} to LEUS!`);
      } else {
        const { error } = await supabase.rpc("convert_leus_to_fiat", { p_user_id: user.id, p_leus: Number(convertAmount) });
        if (error) throw error;
        setSuccess(`Converted Ł${convertAmount} to GBP!`);
      }
      setConvertAmount(""); setShowConvert(false);
      fetchWalletData();
    } catch (err: any) {
      setError(err.message || "Conversion failed.");
    } finally {
      setConverting(false);
    }
  };

  const handleMintLeaf = async () => {
    setError(""); setSuccess("");
    if (!amount || Number(amount) <= 0) { setError("Enter a valid LEUS amount."); return; }
    if (!pin || pin.length < 4) { setError("PIN must be at least 4 digits."); return; }
    setMinting(true);
    try {
      const { error } = await supabase.functions.invoke("create-mintleaf", {
        body: { leus_amount: Number(amount), pin, type: "standard" },
      });
      if (error) throw error;
      setSuccess(`MintLeaf for Ł${amount} created!`);
      setAmount(""); setPin("");
      fetchWalletData();
    } catch (err: any) {
      setError(err.message || "Failed to create MintLeaf.");
    } finally {
      setMinting(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const getTxLabel = (tx: Transaction) => {
    if (tx.notes) return tx.notes;
    if (tx.reference) return tx.reference;
    return tx.type.replace(/_/g, " ");
  };

  const getTxAmount = (tx: Transaction) => {
    if (tx.leus_delta !== 0) return `${tx.leus_delta > 0 ? "+" : ""}Ł${Math.abs(tx.leus_delta).toFixed(2)}`;
    if (tx.fiat_delta_pence !== 0) return `${tx.fiat_delta_pence > 0 ? "+" : "-"}£${(Math.abs(tx.fiat_delta_pence) / 100).toFixed(2)}`;
    if (tx.points_delta !== 0) return `${tx.points_delta > 0 ? "+" : ""}${tx.points_delta} pts`;
    return "-";
  };

  const isPositive = (tx: Transaction) => tx.fiat_delta_pence > 0 || tx.leus_delta > 0 || tx.points_delta > 0;

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === "all") return true;
    if (activeTab === "fiat") return tx.fiat_delta_pence !== 0;
    if (activeTab === "leus") return tx.leus_delta !== 0;
    return true;
  });

  const fiatBalance = profile ? (profile.fiat_balance_pence / 100).toFixed(2) : "0.00";
  const leusBalance = profile ? Number(profile.leus_balance).toFixed(2) : "0.00";
  const totalPortfolio = profile
    ? ((profile.fiat_balance_pence / 100) + (Number(profile.leus_balance) * leusRate / 100)).toFixed(2)
    : "0.00";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-xl text-white mb-6">My Wallet</h1>
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 border border-white/30 mb-4">
          <p className="text-white/80 text-sm mb-2">Total Portfolio Value</p>
          <h2 className="text-white text-3xl mb-4">£{totalPortfolio}</h2>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
            <span className="text-[#10B981] capitalize">{profile?.subscription_tier || "basic"} tier</span>
            <span className="text-white/60">· {profile?.loyalty_points || 0} pts</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Fiat Balance</span>
              <span className="text-lg">£</span>
            </div>
            <p className="text-xl text-[#1E3A8A] mb-3">£{fiatBalance}</p>
            <div className="flex gap-2">
              <button onClick={() => { setConvertDirection("toLeus"); setShowConvert(true); }}
                className="flex-1 bg-[#1E3A8A] text-white text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                <ArrowLeftRight className="w-3 h-3" /> Convert
              </button>
              <button className="flex-1 border border-[#1E3A8A] text-[#1E3A8A] text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                <ArrowDownLeft className="w-3 h-3" /> Add
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#10B981]/90 to-[#14B8A6]/90 backdrop-blur-md rounded-xl p-4 text-white border border-white/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs opacity-90">LEUS Balance</span>
              <span className="text-lg">Ł</span>
            </div>
            <p className="text-xl mb-3">{leusBalance}</p>
            <div className="flex gap-2">
              <button onClick={() => { setConvertDirection("toFiat"); setShowConvert(true); }}
                className="flex-1 bg-white/20 text-white text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                <ArrowLeftRight className="w-3 h-3" /> Convert
              </button>
              <button className="flex-1 bg-white text-[#10B981] text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Pay
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Panel */}
      {showConvert && (
        <div className="mx-4 mt-4 bg-white/90 rounded-xl p-4 shadow-sm border border-white/30">
          <h4 className="text-sm text-gray-800 mb-3">{convertDirection === "toLeus" ? "GBP → LEUS" : "LEUS → GBP"}</h4>
          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
          {success && <p className="text-green-600 text-xs mb-2">{success}</p>}
          <input type="number" value={convertAmount} onChange={(e) => setConvertAmount(e.target.value)}
            placeholder={convertDirection === "toLeus" ? "Amount in £" : "Amount in LEUS"}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] mb-2" />
          <p className="text-xs text-gray-500 mb-3">1 LEUS = £{(leusRate / 100).toFixed(2)} · 0.5% spread</p>
          <div className="flex gap-2">
            <button onClick={handleConvert} disabled={converting}
              className="flex-1 bg-[#10B981] text-white py-2 rounded-lg text-sm flex items-center justify-center gap-1 disabled:opacity-70">
              {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convert"}
            </button>
            <button onClick={() => { setShowConvert(false); setError(""); setSuccess(""); }}
              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Exchange Rate */}
      {!showConvert && (
        <div className="mx-4 mt-4 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Current Exchange Rate</p>
              <p className="text-sm text-gray-800">1 LEUS = £{(leusRate / 100).toFixed(2)} GBP</p>
            </div>
            <button onClick={() => setShowConvert(true)} className="bg-[#10B981] text-white text-sm px-4 py-2 rounded-lg">
              Convert Now
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mt-6">
        <h3 className="text-lg text-[#1E3A8A] mb-3">Transaction History</h3>
        <div className="flex gap-2 mb-4">
          {(["all", "fiat", "leus", "mintleaf"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab
                  ? (tab === "leus" || tab === "mintleaf" ? "bg-[#10B981] text-white" : "bg-[#1E3A8A] text-white")
                  : "bg-white/80 text-gray-600 border border-white/30"
              }`}>
              {tab === "mintleaf" ? "Mint Leaf" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* MintLeaf Sub Tabs */}
        {activeTab === "mintleaf" && (
          <div className="flex gap-2 mb-4">
            {(["create", "scan", "owned"] as const).map((sub) => (
              <button key={sub} onClick={() => setMintLeafSubTab(sub)}
                className={`flex-1 py-2 rounded-lg text-sm capitalize transition-colors ${
                  mintLeafSubTab === sub ? "bg-[#10B981] text-white" : "bg-white/80 text-gray-600 border border-white/30"
                }`}>{sub}</button>
            ))}
          </div>
        )}

        {/* MintLeaf Create */}
        {activeTab === "mintleaf" && mintLeafSubTab === "create" && (
          <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-white/30">
            <h4 className="text-sm text-gray-800 mb-3">Create MintLeaf</h4>
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            {success && <p className="text-green-600 text-xs mb-2">{success}</p>}
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">LEUS amount:</p>
            </div>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#10B981] mb-3" />
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">PIN (min 4 digits):</p>
            </div>
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)}
              placeholder="PIN" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#10B981] mb-4" />
            <p className="text-xs text-gray-500 mb-3">
              Available: Ł{leusBalance} · Fee: {profile?.subscription_tier === "premium" ? "0%" : profile?.subscription_tier === "standard" ? "0.5%" : "1%"}
            </p>
            <button onClick={handleMintLeaf} disabled={minting}
              className="bg-[#10B981] text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-70">
              {minting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Create MintLeaf
            </button>
          </div>
        )}

        {/* MintLeaf Scan */}
        {activeTab === "mintleaf" && mintLeafSubTab === "scan" && (
          <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-white/30">
            <h4 className="text-sm text-gray-800 mb-2">Scan MintLeaf</h4>
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">Scan QR code to claim LEUS:</p>
            </div>
            <button onClick={() => setShowQR(!showQR)} className="bg-[#10B981] text-white text-sm px-4 py-2 rounded-lg">
              {showQR ? "Hide Scanner" : "Open Scanner"}
            </button>
            {showQR && (
              <div className="mt-4 flex flex-col items-center">
                <QrCode className="w-24 h-24 text-[#10B981]" />
                <p className="text-xs text-gray-500 mt-2">Camera access required</p>
              </div>
            )}
          </div>
        )}

        {/* MintLeaf Owned */}
        {activeTab === "mintleaf" && mintLeafSubTab === "owned" && (
          <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-white/30">
            <h4 className="text-sm text-gray-800 mb-3">My MintLeaves</h4>
            {mintLeafs.length === 0 ? (
              <div className="text-center py-6">
                <Gift className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No MintLeaves yet.</p>
                <p className="text-xs text-gray-400">Create one to transfer LEUS!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mintLeafs.map((ml) => (
                  <div key={ml.id} className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${ml.status === "active" ? "text-[#10B981]" : "text-gray-400"}`} />
                    <div>
                      <p className="text-sm text-gray-800">Ł{ml.leus_amount} · {ml.type}</p>
                      <p className="text-xs text-gray-500">{ml.status} · {formatDate(ml.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transactions */}
        {activeTab !== "mintleaf" && (
          <div className="space-y-2 pb-6">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No transactions yet.</p>
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div key={tx.id} className="bg-white/80 rounded-xl p-4 shadow-sm border border-white/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isPositive(tx) ? "bg-green-100" : tx.type.includes("convert") ? "bg-blue-100" : "bg-red-100"
                    }`}>
                      {isPositive(tx) ? <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        : tx.type.includes("convert") ? <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                        : <ArrowUpRight className="w-5 h-5 text-red-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm text-gray-800 capitalize">{getTxLabel(tx)}</h4>
                        <span className={`text-sm ${isPositive(tx) ? "text-green-600" : "text-gray-800"}`}>
                          {getTxAmount(tx)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(tx.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
