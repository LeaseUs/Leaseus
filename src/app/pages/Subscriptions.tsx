import { useState, useEffect } from "react";
import { Check, Crown, Star, Zap, Loader2, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

type PaymentMethod = "fiat" | "leus";

export function Subscriptions() {
  const [profile, setProfile] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("fiat");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const tiers = [
    {
      name: "basic",
      label: "Basic",
      price: "Free",
      pricePence: 0,
      priceLeus: 0,
      priceDetail: "Forever",
      icon: Star,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      features: [
        "5% cashback in LEUS",
        "Standard escrow protection",
        "Access to all services",
        "Monthly bonus LEUS",
        "Basic customer support",
      ],
    },
    {
      name: "standard",
      label: "Standard",
      price: "£9.99",
      pricePence: 999,
      priceLeus: 10,
      priceDetail: "per month",
      icon: Zap,
      color: "text-[#10B981]",
      bgColor: "bg-[#10B981]/10",
      popular: true,
      features: [
        "10% cashback in LEUS",
        "Priority escrow processing",
        "Featured profile listing",
        "2x loyalty points",
        "Weekly bonus LEUS",
        "Priority customer support",
        "No booking fees",
      ],
    },
    {
      name: "premium",
      label: "Premium",
      price: "£24.99",
      pricePence: 2499,
      priceLeus: 25,
      priceDetail: "per month",
      icon: Crown,
      color: "text-[#1E3A8A]",
      bgColor: "bg-[#1E3A8A]/10",
      features: [
        "15% cashback in LEUS",
        "Instant escrow processing",
        "Premium profile badge",
        "3x loyalty points",
        "Daily bonus LEUS",
        "24/7 dedicated support",
        "No platform fees",
        "Exclusive partner deals",
        "Early access to features",
      ],
    },
  ];

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, subscription_tier, subscription_expires_at, subscription_paid_with, fiat_balance_pence, leus_balance, created_at")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      const { data: historyData } = await supabase
        .from("subscription_payments")
        .select("id, tier, payment_method, amount_pence, amount_leus, period_start, period_end, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setPaymentHistory(historyData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedTier || !profile) return;
    setUpgrading(selectedTier.name);
    setError("");
    setSuccess("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check balance
      if (paymentMethod === "fiat") {
        if (profile.fiat_balance_pence < selectedTier.pricePence) {
          setError(`Insufficient GBP balance. You need £${(selectedTier.pricePence / 100).toFixed(2)} but have £${(profile.fiat_balance_pence / 100).toFixed(2)}.`);
          setUpgrading(null);
          return;
        }
      } else {
        if (Number(profile.leus_balance) < selectedTier.priceLeus) {
          setError(`Insufficient LEUS balance. You need ᛃ${selectedTier.priceLeus} but have ᛃ${Number(profile.leus_balance).toFixed(2)}.`);
          setUpgrading(null);
          return;
        }
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const originalProfile = {
        fiat_balance_pence: profile.fiat_balance_pence,
        leus_balance: Number(profile.leus_balance),
        subscription_tier: profile.subscription_tier,
        subscription_expires_at: profile.subscription_expires_at,
        subscription_paid_with: profile.subscription_paid_with || null,
      };

      // Deduct balance
      if (paymentMethod === "fiat") {
        const { error: updateError } = await supabase.from("profiles").update({
          fiat_balance_pence: profile.fiat_balance_pence - selectedTier.pricePence,
          subscription_tier: selectedTier.name,
          subscription_expires_at: periodEnd.toISOString(),
          subscription_paid_with: "fiat",
        }).eq("id", user.id);
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase.from("profiles").update({
          leus_balance: Number(profile.leus_balance) - selectedTier.priceLeus,
          subscription_tier: selectedTier.name,
          subscription_expires_at: periodEnd.toISOString(),
          subscription_paid_with: "leus",
        }).eq("id", user.id);
        if (updateError) throw updateError;
      }

      try {
        const { error: paymentError } = await supabase.from("subscription_payments").insert({
          user_id: user.id,
          tier: selectedTier.name,
          payment_method: paymentMethod,
          amount_pence: paymentMethod === "fiat" ? selectedTier.pricePence : null,
          amount_leus: paymentMethod === "leus" ? selectedTier.priceLeus : null,
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
        });
        if (paymentError) throw paymentError;

        const { error: walletError } = await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          type: "subscription_fee",
          fiat_delta_pence: paymentMethod === "fiat" ? -selectedTier.pricePence : 0,
          leus_delta: paymentMethod === "leus" ? -selectedTier.priceLeus : 0,
          reference: `${selectedTier.label} subscription`,
        });
        if (walletError) throw walletError;
      } catch (error) {
        await supabase.from("profiles").update({
          fiat_balance_pence: originalProfile.fiat_balance_pence,
          leus_balance: originalProfile.leus_balance,
          subscription_tier: originalProfile.subscription_tier,
          subscription_expires_at: originalProfile.subscription_expires_at,
          subscription_paid_with: originalProfile.subscription_paid_with,
        }).eq("id", user.id);
        throw error;
      }

      setSuccess(`🎉 Successfully upgraded to ${selectedTier.label}!`);
      setSelectedTier(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Upgrade failed. Please try again.");
    } finally {
      setUpgrading(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const currentTierName = profile?.subscription_tier || "basic";

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
        <h1 className="text-xl text-white mb-2">Subscriptions</h1>
        <p className="text-white/90 text-sm">Unlock more benefits with premium tiers</p>
      </div>

      {/* Current Plan */}
      <div className="mx-4 mt-4 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Plan</p>
            <p className="text-lg text-[#1E3A8A] capitalize">{currentTierName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">
              {profile?.subscription_expires_at ? "Renews" : "Member Since"}
            </p>
            <p className="text-sm text-gray-800">
              {profile?.subscription_expires_at
                ? formatDate(profile.subscription_expires_at)
                : formatDate(profile?.created_at)}
            </p>
          </div>
        </div>

        {/* Wallet balances */}
        <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
          <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">GBP Balance</p>
            <p className="text-sm font-semibold text-[#1E3A8A]">£{((profile?.fiat_balance_pence || 0) / 100).toFixed(2)}</p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">LEUS Balance</p>
            <p className="text-sm font-semibold text-[#10B981]"><span className="leus">ᛃ</span>{Number(profile?.leus_balance || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Success / Error */}
      {success && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
          {success}
        </div>
      )}

      {/* Subscription Tiers */}
      <div className="px-4 mt-6 space-y-4 pb-6">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          const isCurrent = currentTierName === tier.name;
          const isDowngrade = tiers.findIndex(t => t.name === tier.name) < tiers.findIndex(t => t.name === currentTierName);

          return (
            <div key={tier.name}
              className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden border border-white/30 ${tier.popular ? "ring-2 ring-[#10B981]" : ""}`}>
              {tier.popular && (
                <div className="bg-[#10B981] text-white text-center py-1 text-xs">Most Popular</div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${tier.bgColor} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${tier.color}`} />
                    </div>
                    <div>
                      <h3 className="text-lg text-gray-800">{tier.label}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-[#1E3A8A]">{tier.price}</span>
                        {tier.pricePence > 0 && (
                          <span className="text-xs text-gray-500">/{tier.priceDetail}</span>
                        )}
                      </div>
                      {tier.priceLeus > 0 && (
                        <p className="text-xs text-[#10B981]">or <span className="leus">ᛃ</span>{tier.priceLeus}/month</p>
                      )}
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">Current</span>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl cursor-not-allowed">
                    Current Plan
                  </button>
                ) : isDowngrade ? (
                  <button disabled className="w-full bg-gray-50 text-gray-400 py-3 rounded-xl cursor-not-allowed text-sm">
                    Downgrade not available
                  </button>
                ) : (
                  <button
                    onClick={() => { setSelectedTier(tier); setError(""); }}
                    className={`w-full py-3 rounded-xl transition-colors ${
                      tier.popular ? "bg-[#10B981] text-white hover:bg-[#0d9668]" : "bg-[#1E3A8A] text-white hover:bg-[#152d6b]"
                    }`}
                  >
                    Upgrade to {tier.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment History */}
      <div className="px-4 pb-6">
        <h3 className="text-lg text-[#1E3A8A] mb-3">Payment History</h3>
        {paymentHistory.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 text-center shadow-sm border border-white/30">
            <p className="text-sm text-gray-500">No payment history yet</p>
            <p className="text-xs text-gray-400 mt-1">Upgrade to a paid plan to see your payment history</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 capitalize">{payment.tier} Plan</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(payment.period_start)} → {formatDate(payment.period_end)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#1E3A8A]">
                      {payment.payment_method === "fiat"
                        ? `£${(payment.amount_pence / 100).toFixed(2)}`
                        : `<span className="leus">ᛃ</span>${Number(payment.amount_leus).toFixed(2)}`}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{payment.payment_method}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Upgrade Modal ── */}
      {selectedTier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center max-w-md mx-auto">
          <div className="w-full bg-white rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Upgrade to {selectedTier.label}</h2>
              <button onClick={() => { setSelectedTier(null); setError(""); }}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

            {/* Payment method toggle */}
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-3">Choose payment method</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPaymentMethod("fiat")}
                  className={`py-3 rounded-xl text-sm transition-colors ${paymentMethod === "fiat" ? "bg-[#1E3A8A] text-white" : "bg-gray-50 text-gray-700 border border-gray-200"}`}>
                  Pay with GBP
                  <p className="text-xs opacity-80 mt-0.5">£{(selectedTier.pricePence / 100).toFixed(2)}/mo</p>
                </button>
                <button onClick={() => setPaymentMethod("leus")}
                  className={`py-3 rounded-xl text-sm transition-colors relative ${paymentMethod === "leus" ? "bg-[#10B981] text-white" : "bg-gray-50 text-gray-700 border border-gray-200"}`}>
                  Pay with LEUS
                  <p className="text-xs opacity-80 mt-0.5"><span className="leus">ᛃ</span>{selectedTier.priceLeus}/mo</p>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{selectedTier.label} Plan</span>
                <span className="text-gray-800">
                  {paymentMethod === "fiat" ? `£${(selectedTier.pricePence / 100).toFixed(2)}` : `<span className="leus">ᛃ</span>${selectedTier.priceLeus}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Your balance</span>
                <span className="text-gray-800">
                  {paymentMethod === "fiat"
                    ? `£${((profile?.fiat_balance_pence || 0) / 100).toFixed(2)}`
                    : `<span className="leus">ᛃ</span>${Number(profile?.leus_balance || 0).toFixed(2)}`}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-800">Billed today</span>
                <span className="text-[#1E3A8A]">
                  {paymentMethod === "fiat" ? `£${(selectedTier.pricePence / 100).toFixed(2)}` : `<span className="leus">ᛃ</span>${selectedTier.priceLeus}`}
                </span>
              </div>
            </div>

            <button onClick={handleUpgrade} disabled={!!upgrading}
              className={`w-full py-4 rounded-xl text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-70 ${
                selectedTier.popular ? "bg-[#10B981] hover:bg-[#0d9668]" : "bg-[#1E3A8A] hover:bg-[#152d6b]"
              }`}>
              {upgrading ? <><Loader2 className="w-5 h-5 animate-spin" />Processing...</> : `Confirm Upgrade to ${selectedTier.label}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


