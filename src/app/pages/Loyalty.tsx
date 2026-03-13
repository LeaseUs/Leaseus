import { Trophy, TrendingUp, Gift, ArrowRight, Sparkles } from "lucide-react";

export function Loyalty() {
  const currentPoints = 2450;
  const currentTier = "Gold";
  const nextTier = "Platinum";
  const pointsToNextTier = 550;

  const tierBonuses = {
    Silver: 1.0,
    Gold: 1.2,
    Platinum: 1.5,
  };

  const activities = [
    { id: 1, action: "Service Payment", points: 150, date: "Mar 10, 2026", bonus: false },
    { id: 2, action: "LEUS Conversion Bonus", points: 50, date: "Mar 10, 2026", bonus: true },
    { id: 3, action: "Service Payment", points: 200, date: "Mar 9, 2026", bonus: false },
    { id: 4, action: "Referral Bonus", points: 100, date: "Mar 8, 2026", bonus: true },
    { id: 5, action: "Service Payment", points: 120, date: "Mar 7, 2026", bonus: false },
    { id: 6, action: "Weekly Login Bonus", points: 25, date: "Mar 6, 2026", bonus: true },
  ];

  const conversionRate = currentTier === "Silver" ? 100 : currentTier === "Gold" ? 90 : 80;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1E3A8A]/90 to-[#10B981]/90 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-6 h-6 text-white" />
          <h1 className="text-xl text-white">Loyalty Program</h1>
        </div>
        <p className="text-white/90 text-sm">
          Earn points and unlock exclusive benefits
        </p>
      </div>

      {/* Points Balance */}
      <div className="mx-4 mt-4 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/30">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-2">Your Points Balance</p>
          <h2 className="text-4xl text-[#1E3A8A] mb-1">{currentPoints.toLocaleString()}</h2>
          <p className="text-xs text-gray-500">Loyalty Points</p>
        </div>

        {/* Current Tier */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 mb-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-700">Current Tier</span>
            </div>
            <span className="text-lg text-yellow-700">{currentTier}</span>
          </div>
          <div className="text-xs text-gray-600">
            Points multiplier: {tierBonuses[currentTier as keyof typeof tierBonuses]}x
          </div>
        </div>

        {/* Progress to Next Tier */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">Progress to {nextTier}</span>
            <span className="text-xs text-gray-600">
              {pointsToNextTier} points needed
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#10B981] to-[#14B8A6]"
              style={{ width: `${((currentPoints % 3000) / 3000) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Convert Points */}
        <button className="w-full bg-[#10B981] text-white py-3 rounded-xl hover:bg-[#0d9668] transition-colors flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          Convert Points to LEUS
        </button>
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
            <span className="text-sm text-[#1E3A8A]">
              {conversionRate} points = 1 LEUS
            </span>
          </div>

          {currentTier !== "Platinum" && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm text-gray-600">{nextTier} Rate:</span>
              <span className="text-sm text-blue-700">
                {currentTier === "Silver" ? "90" : "80"} points = 1 LEUS
              </span>
            </div>
          )}

          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Your current points can get you:</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{currentPoints} points</span>
              <ArrowRight className="w-4 h-4 text-green-600" />
              <span className="text-lg text-[#10B981]">
                Ł{(currentPoints / conversionRate).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="mx-4 mt-4 bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-white/30">
        <h3 className="text-sm text-gray-700 mb-3">Tier Benefits</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <Trophy className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <span className="text-gray-700">Silver (0-999 pts): </span>
              <span className="text-gray-600">1x points, 100:1 conversion</span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <Trophy className="w-4 h-4 text-yellow-500 mt-0.5" />
            <div>
              <span className="text-gray-700">Gold (1000-2999 pts): </span>
              <span className="text-gray-600">1.2x points, 90:1 conversion</span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <Trophy className="w-4 h-4 text-purple-500 mt-0.5" />
            <div>
              <span className="text-gray-700">Platinum (3000+ pts): </span>
              <span className="text-gray-600">1.5x points, 80:1 conversion</span>
            </div>
          </div>
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
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.bonus ? "bg-green-100" : "bg-blue-100"
                    }`}
                  >
                    {activity.bonus ? (
                      <Gift className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-800">{activity.action}</h4>
                    <p className="text-xs text-gray-500">{activity.date}</p>
                  </div>
                </div>
                <span className="text-sm text-[#10B981]">+{activity.points}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
