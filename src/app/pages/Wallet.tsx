import { useState, useEffect, useRef } from "react";
import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, TrendingUp, Clock,
  QrCode, Camera, Gift, Lock, CheckCircle, Loader2, CreditCard,
  Building2, X, Eye, EyeOff, Download, Shield
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "../../lib/supabase";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// ── LEUS Symbol ───────────────────────────────────────────────
const LeusSymbol = () => <span className="font-bold">ᛃ</span>;

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

// ── Stripe Deposit Form (Fiat only) ───────────────────────────
function DepositForm({ onSuccess, onCancel }: { onSuccess: (amount: number) => void; onCancel: () => void }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [amount, setAmount]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleDeposit = async () => {
    if (!stripe || !elements) return;
    if (!amount || Number(amount) < 1) { setError("Minimum deposit is £1."); return; }
    setLoading(true); setError("");
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found.");

      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });
      if (pmError) throw new Error(pmError.message);

      // For test mode — simulate success and credit wallet directly
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in.");

      const pence = Math.round(Number(amount) * 100);

      // Credit fiat wallet
      const { error: rpcError } = await supabase.rpc("credit_fiat_wallet", {
        p_user_id: user.id,
        p_pence: pence,
        p_notes: `Card deposit £${amount} (${paymentMethod?.id || "test"})`,
      });
      if (rpcError) throw rpcError;

      onSuccess(Number(amount));
    } catch (err: any) {
      setError(err.message || "Payment failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#1E3A8A]" />Add Money (GBP)
        </h4>
        <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-500" /></button>
      </div>

      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
        Funds are added to your GBP wallet only. LEUS must be converted within the platform.
      </div>

      {error && <p className="text-red-500 text-xs p-2 bg-red-50 rounded-lg">{error}</p>}

      <div>
        <label className="block text-xs text-gray-600 mb-1">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">£</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00" min="1" step="0.01"
            className="w-full pl-8 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
        </div>
        <div className="flex gap-2 mt-2">
          {["10", "20", "50", "100"].map(v => (
            <button key={v} onClick={() => setAmount(v)}
              className="flex-1 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-700 hover:bg-[#10B981]/10 hover:text-[#10B981] transition-colors">
              £{v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Card Details</label>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <CardElement options={{
            style: {
              base: { fontSize: "14px", color: "#1E3A8A", "::placeholder": { color: "#9ca3af" } },
              invalid: { color: "#ef4444" },
            },
          }} />
        </div>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <CreditCard className="w-3 h-3" />Secured by Stripe
        </p>
      </div>

      <button onClick={handleDeposit} disabled={loading || !stripe}
        className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Add £{amount || "0.00"} to Wallet</>}
      </button>
    </div>
  );
}

// ── Withdraw Form (Fiat only) ─────────────────────────────────
function WithdrawForm({ fiatBalance, onSuccess, onCancel }: { fiatBalance: number; onSuccess: () => void; onCancel: () => void }) {
  const [amount, setAmount]           = useState("");
  const [accountName, setAccountName] = useState("");
  const [sortCode, setSortCode]       = useState("");
  const [accountNo, setAccountNo]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const handleWithdraw = async () => {
    if (!amount || Number(amount) < 10) { setError("Minimum withdrawal is £10."); return; }
    if (Number(amount) > fiatBalance)   { setError("Insufficient GBP balance."); return; }
    if (!accountName || !sortCode || !accountNo) { setError("Please fill in all bank details."); return; }
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in.");

      const amountPence = Math.round(Number(amount) * 100);

      const { error: deductError } = await supabase.rpc("deduct_fiat_wallet", {
        p_user_id: user.id,
        p_pence: amountPence,
        p_notes: `Withdrawal request £${amount}`,
      });
      if (deductError) throw deductError;

      const { error: txError } = await supabase.from("withdrawal_requests").insert({
        user_id: user.id,
        amount_pence: amountPence,
        account_name: accountName,
        sort_code: sortCode,
        account_number: accountNo,
        status: "pending",
      });
      if (txError) {
        await supabase.rpc("credit_fiat_wallet", {
          p_user_id: user.id,
          p_pence: amountPence,
          p_notes: `Withdrawal rollback £${amount}`,
        });
        throw txError;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Withdrawal request failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#1E3A8A]" />Withdraw to Bank
        </h4>
        <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-500" /></button>
      </div>

      <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
        Only GBP balance can be withdrawn. Convert LEUS to GBP first if needed.
      </div>

      {error && <p className="text-red-500 text-xs p-2 bg-red-50 rounded-lg">{error}</p>}

      <div className="bg-gray-50 rounded-xl p-3 text-sm">
        Available GBP: <span className="font-semibold text-[#1E3A8A]">£{fiatBalance.toFixed(2)}</span>
        <p className="text-xs text-gray-400 mt-0.5">Processed in 1-3 business days</p>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Amount (£)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">£</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00" min="10" max={fiatBalance} step="0.01"
            className="w-full pl-8 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Account Holder Name</label>
        <input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="John Smith"
          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Sort Code</label>
          <input value={sortCode} onChange={e => setSortCode(e.target.value)} placeholder="00-00-00" maxLength={8}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Account Number</label>
          <input value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="12345678" maxLength={8}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
        </div>
      </div>

      <button onClick={handleWithdraw} disabled={loading}
        className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Requesting...</> : <>Request Withdrawal — £{amount || "0.00"}</>}
      </button>
    </div>
  );
}

// ── MintLeaf PDF Generator ────────────────────────────────────
function generateMintLeafPDF(ml: any) {
  const pin = "****"; // Hidden for security
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #1E3A8A; margin: 0; padding: 40px; }
    .card { background: linear-gradient(135deg, #1E3A8A, #10B981); border-radius: 20px; padding: 40px; color: white; max-width: 500px; margin: 0 auto; }
    .logo { font-size: 32px; font-weight: bold; margin-bottom: 8px; }
    .logo span { color: #10B981; }
    .subtitle { font-size: 12px; opacity: 0.7; margin-bottom: 40px; }
    .label { font-size: 11px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .value { font-size: 24px; font-weight: bold; margin-bottom: 24px; }
    .amount { font-size: 48px; font-weight: bold; color: #fff; margin: 20px 0; }
    .id { font-size: 11px; opacity: 0.5; margin-top: 30px; word-break: break-all; }
    .warning { background: rgba(255,255,255,0.15); border-radius: 10px; padding: 12px; font-size: 11px; margin-top: 20px; }
    .pin-box { background: rgba(0,0,0,0.3); border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0; }
    .type-badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; font-size: 12px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Lease<span>Us</span></div>
    <div class="subtitle">Swift. Reliable. Precise.</div>
    <div class="type-badge">MintLeaf — ${ml.type || "Standard"}</div>
    <div class="label">LEUS Amount</div>
    <div class="amount">ᛃ${ml.leus_amount}</div>
    <div class="label">Status</div>
    <div class="value" style="font-size:16px; text-transform: capitalize">${ml.status}</div>
    <div class="label">Created</div>
    <div class="value" style="font-size:14px">${new Date(ml.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
    <div class="pin-box">
      <div class="label">PIN Required to Claim</div>
      <div style="font-size: 24px; letter-spacing: 8px; margin-top: 8px">${pin}</div>
      <div style="font-size: 10px; opacity: 0.6; margin-top: 4px">Share PIN separately for security</div>
    </div>
    <div class="warning">
      ⚠️ This MintLeaf can only be claimed once. Keep this document and PIN secure. 
      Recipient must create a LeaseUs account to claim LEUS.
    </div>
    <div class="id">ID: ${ml.id}</div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `MintLeaf-L${ml.leus_amount}-${ml.id.slice(0, 8)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Wallet Component ─────────────────────────────────────
export function Wallet() {
  const [activeTab, setActiveTab]           = useState<"all" | "fiat" | "leus" | "mintleaf">("all");
  const [mintLeafSubTab, setMintLeafSubTab] = useState<"create" | "scan" | "owned">("create");
  const [amount, setAmount]                 = useState("");
  const [pin, setPin]                       = useState("");
  const [showQR, setShowQR]                 = useState(false);
  const [profile, setProfile]               = useState<Profile | null>(null);
  const [transactions, setTransactions]     = useState<Transaction[]>([]);
  const [mintLeafs, setMintLeafs]           = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [converting, setConverting]         = useState(false);
  const [minting, setMinting]               = useState(false);
  const [convertAmount, setConvertAmount]   = useState("");
  const [convertDirection, setConvertDirection] = useState<"toLeus" | "toFiat">("toLeus");
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");
  const [leusRate, setLeusRate]             = useState(100);
  const [hideBalance, setHideBalance]       = useState(false);

  // Panels
  const [showDeposit, setShowDeposit]     = useState(false);
  const [showWithdraw, setShowWithdraw]   = useState(false);
  const [showConvert, setShowConvert]     = useState(false);

  const closeAll = () => { setShowDeposit(false); setShowWithdraw(false); setShowConvert(false); };

  useEffect(() => { fetchWalletData(); }, []);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles").select("fiat_balance_pence, leus_balance, loyalty_points, subscription_tier")
        .eq("id", user.id).single();
      if (profileData) setProfile(profileData);

      const { data: txData } = await supabase
        .from("wallet_transactions")
        .select("id, type, fiat_delta_pence, leus_delta, points_delta, reference, notes, created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      if (txData) setTransactions(txData);

      const { data: mintData } = await supabase
        .from("mintleafs").select("*").eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (mintData) setMintLeafs(mintData);

      const { data: rateData } = await supabase
        .from("leus_rates").select("rate_pence").eq("is_active", true).single();
      if (rateData) setLeusRate(rateData.rate_pence);
    } catch (err) { console.error("Wallet error:", err); }
    finally { setLoading(false); }
  };

  const handleConvert = async () => {
    setError(""); setSuccess("");
    if (!convertAmount || isNaN(Number(convertAmount))) { setError("Please enter a valid amount."); return; }
    setConverting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (convertDirection === "toLeus") {
        const { error } = await supabase.rpc("convert_fiat_to_leus", { p_user_id: user.id, p_pence: Math.round(Number(convertAmount) * 100) });
        if (error) throw error;
        setSuccess(`Converted £${convertAmount} → LEUS!`);
      } else {
        const { error } = await supabase.rpc("convert_leus_to_fiat", { p_user_id: user.id, p_leus: Number(convertAmount) });
        if (error) throw error;
        setSuccess(`Converted ᛃ${convertAmount} → GBP!`);
      }
      setConvertAmount(""); closeAll(); fetchWalletData();
    } catch (err: any) { setError(err.message || "Conversion failed."); }
    finally { setConverting(false); }
  };

  const handleMintLeaf = async () => {
    setError(""); setSuccess("");
    if (!amount || Number(amount) <= 0) { setError("Enter a valid LEUS amount."); return; }
    if (!pin || pin.length < 4)         { setError("PIN must be at least 4 digits."); return; }
    setMinting(true);
    try {
      const { error } = await supabase.functions.invoke("create-mintleaf", {
        body: { leus_amount: Number(amount), pin, type: "standard" },
      });
      if (error) throw error;
      setSuccess(`MintLeaf for ᛃ${amount} created!`);
      setAmount(""); setPin(""); fetchWalletData();
    } catch (err: any) { setError(err.message || "Failed to create MintLeaf."); }
    finally { setMinting(false); }
  };

  const masked = "••••••";
  const fmt    = (n: number) => hideBalance ? masked : n.toFixed(2);

  const fiatBalance    = profile ? profile.fiat_balance_pence / 100 : 0;
  const leusBalance    = profile ? Number(profile.leus_balance) : 0;
  const totalPortfolio = (fiatBalance + leusBalance * leusRate / 100).toFixed(2);

  const formatDate  = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const getTxLabel  = (tx: Transaction) => tx.notes || tx.reference || tx.type.replace(/_/g, " ");
  const getTxAmount = (tx: Transaction) => {
    if (tx.leus_delta !== 0)        return `${tx.leus_delta > 0 ? "+" : ""}ᛃ${Math.abs(tx.leus_delta).toFixed(2)}`;
    if (tx.fiat_delta_pence !== 0)  return `${tx.fiat_delta_pence > 0 ? "+" : "-"}£${(Math.abs(tx.fiat_delta_pence) / 100).toFixed(2)}`;
    if (tx.points_delta !== 0)      return `${tx.points_delta > 0 ? "+" : ""}${tx.points_delta} pts`;
    return "-";
  };
  const isPositive = (tx: Transaction) => tx.fiat_delta_pence > 0 || tx.leus_delta > 0 || tx.points_delta > 0;
  const filteredTx = transactions.filter(tx => {
    if (activeTab === "fiat") return tx.fiat_delta_pence !== 0;
    if (activeTab === "leus") return tx.leus_delta !== 0;
    return true;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" /></div>;

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen">

        {/* ── Header ── */}
        <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl text-white">My Wallet</h1>
            <button onClick={() => setHideBalance(h => !h)}
              className="flex items-center gap-1.5 bg-white/20 text-white px-3 py-1.5 rounded-full text-xs">
              {hideBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {hideBalance ? "Show" : "Hide"}
            </button>
          </div>

          {/* Total portfolio */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 border border-white/30 mb-4">
            <p className="text-white/80 text-sm mb-2">Total Portfolio Value</p>
            <h2 className="text-white text-3xl mb-4">
              {hideBalance ? "£••••••" : `£${totalPortfolio}`}
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#10B981] capitalize">{profile?.subscription_tier || "basic"} tier</span>
              <span className="text-white/60">· {profile?.loyalty_points || 0} pts</span>
            </div>
          </div>

          {/* Balance cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* GBP */}
            <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 border border-white/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">GBP Balance</span>
                <span className="text-base font-bold text-gray-700">£</span>
              </div>
              <p className="text-xl text-[#1E3A8A] mb-3">{hideBalance ? "£••••" : `£${fiatBalance.toFixed(2)}`}</p>
              <div className="flex gap-2">
                <button onClick={() => { closeAll(); setConvertDirection("toLeus"); setShowConvert(true); }}
                  className="flex-1 bg-[#1E3A8A] text-white text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                  <ArrowLeftRight className="w-3 h-3" />Convert
                </button>
                <button onClick={() => { closeAll(); setShowDeposit(true); }}
                  className="flex-1 border border-[#1E3A8A] text-[#1E3A8A] text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                  <ArrowDownLeft className="w-3 h-3" />Add
                </button>
              </div>
            </div>

            {/* LEUS */}
            <div className="bg-gradient-to-br from-[#10B981]/90 to-[#14B8A6]/90 backdrop-blur-md rounded-xl p-4 text-white border border-white/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs opacity-90">LEUS Balance</span>
                <span className="text-base font-bold">ᛃ</span>
              </div>
              <p className="text-xl mb-3">{hideBalance ? "ᛃ••••" : `ᛃ${leusBalance.toFixed(2)}`}</p>
              <div className="flex gap-2">
                <button onClick={() => { closeAll(); setConvertDirection("toFiat"); setShowConvert(true); }}
                  className="flex-1 bg-white/20 text-white text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                  <ArrowLeftRight className="w-3 h-3" />Convert
                </button>
                <button onClick={() => { closeAll(); setShowWithdraw(true); }}
                  className="flex-1 bg-white text-[#10B981] text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />Withdraw
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Panels ── */}
        {(showDeposit || showWithdraw || showConvert) && (
          <div className="mx-4 mt-4 bg-white/95 rounded-2xl p-5 shadow-lg border border-white/30">
            {showDeposit && (
              <DepositForm
                onSuccess={(amt) => { closeAll(); setSuccess(`£${amt.toFixed(2)} added to your GBP wallet!`); fetchWalletData(); }}
                onCancel={closeAll}
              />
            )}
            {showWithdraw && (
              <WithdrawForm
                fiatBalance={fiatBalance}
                onSuccess={() => { closeAll(); setSuccess("Withdrawal request submitted. Processed in 1-3 business days."); fetchWalletData(); }}
                onCancel={closeAll}
              />
            )}
            {showConvert && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-[#10B981]" />
                    {convertDirection === "toLeus" ? "GBP → LEUS" : "LEUS → GBP"}
                  </h4>
                  <button onClick={closeAll} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-500" /></button>
                </div>
                {error   && <p className="text-red-500 text-xs mb-2 p-2 bg-red-50 rounded-lg">{error}</p>}
                <input type="number" value={convertAmount} onChange={e => setConvertAmount(e.target.value)}
                  placeholder={convertDirection === "toLeus" ? "Amount in £" : "Amount in ᛃ"}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] mb-2 text-sm" />
                <p className="text-xs text-gray-500 mb-3">1 LEUS = £{(leusRate / 100).toFixed(2)} · 0.5% spread</p>
                <div className="flex gap-2">
                  <button onClick={handleConvert} disabled={converting}
                    className="flex-1 bg-[#10B981] text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 disabled:opacity-70">
                    {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convert"}
                  </button>
                  <button onClick={closeAll} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {success && !showDeposit && !showWithdraw && !showConvert && (
          <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
          </div>
        )}

        {/* Exchange rate */}
        {!showConvert && !showDeposit && !showWithdraw && (
          <div className="mx-4 mt-4 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Exchange Rate</p>
                <p className="text-sm text-gray-800">1 LEUS = £{(leusRate / 100).toFixed(2)} GBP</p>
              </div>
              <button onClick={() => { setShowConvert(true); setConvertDirection("toLeus"); }}
                className="bg-[#10B981] text-white text-sm px-4 py-2 rounded-lg">Convert Now</button>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="px-4 mt-6">
          <h3 className="text-lg text-[#1E3A8A] mb-3">Transactions</h3>
          <div className="flex gap-2 mb-4">
            {(["all", "fiat", "leus", "mintleaf"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-xs transition-colors ${
                  activeTab === tab
                    ? (tab === "leus" || tab === "mintleaf" ? "bg-[#10B981] text-white" : "bg-[#1E3A8A] text-white")
                    : "bg-white/80 text-gray-600 border border-white/30"
                }`}>
                {tab === "mintleaf" ? "MintLeaf" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* MintLeaf tabs */}
          {activeTab === "mintleaf" && (
            <div className="flex gap-2 mb-4">
              {(["create", "scan", "owned"] as const).map(sub => (
                <button key={sub} onClick={() => setMintLeafSubTab(sub)}
                  className={`flex-1 py-2 rounded-lg text-xs capitalize transition-colors ${
                    mintLeafSubTab === sub ? "bg-[#10B981] text-white" : "bg-white/80 text-gray-600 border border-white/30"
                  }`}>{sub}</button>
              ))}
            </div>
          )}

          {/* MintLeaf Create */}
          {activeTab === "mintleaf" && mintLeafSubTab === "create" && (
            <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-white/30">
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-[#10B981] font-bold text-lg">ᛃ</span>Create MintLeaf
              </h4>
              {error   && <p className="text-red-500 text-xs mb-2 p-2 bg-red-50 rounded-lg">{error}</p>}
              {success && <p className="text-green-600 text-xs mb-2">{success}</p>}
              <label className="block text-xs text-gray-600 mb-1">LEUS Amount</label>
              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#10B981]">ᛃ</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 10"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
              </div>
              <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1"><Lock className="w-3 h-3" />PIN (min 4 digits)</label>
              <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] mb-3 text-sm" />
              <p className="text-xs text-gray-500 mb-4">
                Available: ᛃ{leusBalance.toFixed(2)} · Fee: {profile?.subscription_tier === "premium" ? "0%" : profile?.subscription_tier === "standard" ? "0.5%" : "1%"}
              </p>
              <button onClick={handleMintLeaf} disabled={minting}
                className="w-full bg-[#10B981] text-white py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70">
                {minting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-bold">ᛃ</span>}
                Create MintLeaf
              </button>
            </div>
          )}

          {/* MintLeaf Scan */}
          {activeTab === "mintleaf" && mintLeafSubTab === "scan" && (
            <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-white/30">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Scan MintLeaf QR</h4>
              <p className="text-xs text-gray-500 mb-4">Scan a MintLeaf QR code to claim LEUS into your wallet.</p>
              <button onClick={() => setShowQR(!showQR)} className="w-full bg-[#10B981] text-white py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" />{showQR ? "Close Scanner" : "Open Camera Scanner"}
              </button>
              {showQR && (
                <div className="mt-4 flex flex-col items-center bg-gray-50 rounded-xl p-6">
                  <QrCode className="w-24 h-24 text-[#1E3A8A]" />
                  <p className="text-xs text-gray-500 mt-3">Point camera at MintLeaf QR code</p>
                </div>
              )}
            </div>
          )}

          {/* MintLeaf Owned — VIEW ONLY + download */}
          {activeTab === "mintleaf" && mintLeafSubTab === "owned" && (
            <div className="space-y-3 pb-6">
              {mintLeafs.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-10 text-center border border-white/30">
                  <Gift className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No MintLeaves yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Create one to share LEUS!</p>
                </div>
              ) : (
                mintLeafs.map(ml => (
                  <div key={ml.id} className="bg-white/80 rounded-xl p-4 shadow-sm border border-white/30">
                    {/* View only — no edit */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                          <span className="text-[#10B981] font-bold text-lg">ᛃ</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">ᛃ{ml.leus_amount} MintLeaf</p>
                          <p className="text-xs text-gray-500 capitalize">{ml.type || "Standard"}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        ml.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>{ml.status}</span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Created</span>
                        <span className="text-gray-700">{formatDate(ml.created_at)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Type</span>
                        <span className="text-gray-700 capitalize">{ml.type || "Standard"}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">ID</span>
                        <span className="text-gray-400 font-mono">{ml.id.slice(0, 12)}...</span>
                      </div>
                    </div>

                    {/* Download only — no edit */}
                    <button onClick={() => generateMintLeafPDF(ml)}
                      className="w-full border border-[#10B981] text-[#10B981] py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-[#10B981]/10 transition-colors">
                      <Download className="w-3.5 h-3.5" />Download MintLeaf
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Transactions list */}
          {activeTab !== "mintleaf" && (
            <div className="space-y-2 pb-6">
              {filteredTx.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No transactions yet.</p>
                </div>
              ) : (
                filteredTx.map(tx => (
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
                            {hideBalance ? "••••" : getTxAmount(tx)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />{formatDate(tx.created_at)}
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
    </Elements>
  );
}
