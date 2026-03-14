import { useState, useEffect } from "react";
import { Trophy, TrendingUp, Gift, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function Loyalty() {
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, loyalty_points, subscription_tier, leus_balance")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      const { data: txData } = await supabase
        .from("wallet_transactions")
        .select("id, type, points_delta, created_at, notes, reference")
        .eq("user_id", user.id)
        .not("points_delta", "eq", 0)
        .order("created_at", { ascending: false })
        .limit(10);

      if (txData && txData.length > 0) {
        setActivities(txData);
      } else {
        setActivities([
          { id: 1, type: "signup_bonus", points_delta: 50, created_at: new Date().toISOString(), notes: "Welcome bonus" },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertPoints = async () => {
    if (!profile || profile.loyalty_points < 100) {
      setError("You need at least 100 points to convert to LEUS.");
      return;
    }
    setConverting(true);
    setError("");
    setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.rpc("convert_points_to_leus", {
        p_user_id: user.id,
        p_points: profile.loyalty_points,
      });
      if (error) throw error;
      setSuccess(`Successfully converted ${profile.loyalty_points} points to LEUS!`);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Conversion failed. Please try again.");
    } finally {
      setConverting(false);
    }
  };

  const getTier = (points: number) => {
    if (points >= 3000) return "Platinum";
    if (points >= 1000) return "Gold";
    return "Silver";
  };

  const getNextTier = (tier: string) => {
    if (tier === "Silver") return "Gold";
    if (tier === "Gold") return "Platinum";
    return null;
  };

  const getPointsToNextTier = (points: number, tier: string) => {
    if (tier === "Silver") return 1000 - points;
    if (tier === "Gold") return 3000 - points;
    return 0;
  };

  const getConversionRate = (tier: string) => {
    if (tier === "Platinum") return 80;
    if (tier === "Gold") return 90;
    return 100;
  };

  const formatActivityLabel = (type: string, notes: string) => {
    const labels: Record<string, string> = {
      points_earned: "Service Payment",
      signup_bonus: "Welcome Bonus",
      referral_bonus: "Referral Bonus",
      points_redeemed: "Points Redeemed",
      provider_bonus: "Provider Bonus",
    };
    return labels[type] || notes || type.replace(/_/g, " ");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const isBonus = (type: string) =>
    ["signup_bonus", "referral_bonus", "provider_bonus"].includes(type);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  const currentPoints = profile?.loyalty_points || 0;
  const currentTier = getTier(currentPoints);
  const nextTier = getNextTier(currentTier);
  const pointsToNextTier = getPointsToNextTier(currentPoints, currentTier);
  const conversionRate = getConversionRate(currentTier);
  const tierMax = currentTier === "Silver" ? 1000 : 3000;
  const tierMin = currentTier === "Silver" ? 0 : currentTier === "Gold" ? 1000 : 3000;
  const progress = Math.min(((currentPoints - tierMin) / (tierMax - tierMin)) * 100, 100);
  const tierBonuses: Record<string, number> = { Silver: 1.0, Gold: 1.2, Platinum: 1.5 };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1E3A8A]/90 to-[#10B981]/90 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-6 h-6 text-white" />
          <h1 className="text-xl text-white">Loyalty Program</h1>
        </div>
        <p className="text-white/90 text-sm">Earn points and unlock exclusive benefits</p>
      </div>

      {/* Points Balance */}
      <div className="mx-4 mt-4 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/30">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-2">Your Points Balance</p>
          <h2 className="text-4xl text-[#1E3A8A] mb-1">{currentPoints.toLocaleString()}</h2>
          <p className="text-xs text-gray-500">Loyalty Points</p>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 mb-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-700">Current Tier</span>
            </div>
            <span className="text-lg text-yellow-700">{currentTier}</span>
          </div>
          <div className="text-xs text-gray-600">Points multiplier: {tierBonuses[currentTier]}x</div>
        </div>

        {nextTier && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">Progress to {nextTier}</span>
              <span className="text-xs text-gray-600">{pointsToNextTier} points needed</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#10B981] to-[#14B8A6] transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
        {success && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}

        <button
          onClick={handleConvertPoints}
          disabled={converting || currentPoints < 100}
          className="w-full bg-[#10B981] text-white py-3 rounded-xl hover:bg-[#0d9668] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {converting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Converting...</>
          ) : (
            <><Sparkles className="w-4 h-4" />Convert {currentPoints} Points to Ł{(currentPoints / conversionRate).toFixed(2)} LEUS</>
          )}
        </button>
        {currentPoints < 100 && (
          <p className="text-xs text-gray-400 text-center mt-2">Minimum 100 points to convert</p>
        )}
      </div>

      {/* Conversion Calculator */}
      <div className="mx-4 mt-4 bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-white/30">
        <h3 className="text-sm text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#10B981]" />
          Points Conversion Rate
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Your {currentTier} Rate:</span>
            <span className="text-sm text-[#1E3A8A]">{conversionRate} points = 1 LEUS</span>
          </div>
          {nextTier && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm text-gray-600">{nextTier} Rate:</span>
              <span className="text-sm text-blue-700">
                {currentTier === "Silver" ? "90" : "80"} points = 1 LEUS
              </span>
            </div>
          )}
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{currentPoints} points</span>
              <ArrowRight className="w-4 h-4 text-green-600" />
              <span className="text-lg text-[#10B981]">Ł{(currentPoints / conversionRate).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="mx-4 mt-4 bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-white/30">
        <h3 className="text-sm text-gray-700 mb-3">Tier Benefits</h3>
        <div className="space-y-2">
          {[
            { tier: "Silver", range: "0-999 pts", mult: "1x", rate: "100:1", color: "text-gray-400", bg: currentTier === "Silver" ? "bg-gray-100" : "" },
            { tier: "Gold", range: "1000-2999 pts", mult: "1.2x", rate: "90:1", color: "text-yellow-500", bg: currentTier === "Gold" ? "bg-yellow-50" : "" },
            { tier: "Platinum", range: "3000+ pts", mult: "1.5x", rate: "80:1", color: "text-purple-500", bg: currentTier === "Platinum" ? "bg-purple-50" : "" },
          ].map(({ tier, range, mult, rate, color, bg }) => (
            <div key={tier} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${bg}`}>
              <Trophy className={`w-4 h-4 ${color} mt-0.5`} />
              <div>
                <span className="text-gray-700">{tier} ({range}): </span>
                <span className="text-gray-600">{mult} points, {rate} conversion</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Log */}
      <div className="px-4 mt-6 pb-6">
        <h3 className="text-lg text-[#1E3A8A] mb-3">Points Activity</h3>
        <div className="space-y-2">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBonus(activity.type) ? "bg-green-100" : "bg-blue-100"}`}>
                    {isBonus(activity.type)
                      ? <Gift className="w-5 h-5 text-green-600" />
                      : <TrendingUp className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-800">{formatActivityLabel(activity.type, activity.notes)}</h4>
                    <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                  </div>
                </div>
                <span className={`text-sm ${activity.points_delta > 0 ? "text-[#10B981]" : "text-red-500"}`}>
                  {activity.points_delta > 0 ? "+" : ""}{activity.points_delta}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
