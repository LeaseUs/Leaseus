import { Check, Crown, Star, Zap } from "lucide-react";

export function Subscriptions() {
  const tiers = [
    {
      name: "Basic",
      price: "Free",
      priceDetail: "Forever",
      icon: Star,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      current: true,
      features: [
        "5% cashback in LEUS",
        "Standard escrow protection",
        "Access to all services",
        "Monthly bonus LEUS",
        "Basic customer support",
      ],
    },
    {
      name: "Standard",
      price: "£9.99",
      priceDetail: "per month",
      icon: Zap,
      color: "text-[#10B981]",
      bgColor: "bg-[#10B981]/10",
      current: false,
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
      name: "Premium",
      price: "£24.99",
      priceDetail: "per month",
      icon: Crown,
      color: "text-[#1E3A8A]",
      bgColor: "bg-[#1E3A8A]/10",
      current: false,
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-xl text-white mb-2">Subscriptions</h1>
        <p className="text-white/90 text-sm">
          Unlock more benefits with premium tiers
        </p>
      </div>

      {/* Current Plan */}
      <div className="mx-4 mt-4 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Plan</p>
            <p className="text-lg text-[#1E3A8A]">Basic</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Active Since</p>
            <p className="text-sm text-gray-800">Mar 10, 2026</p>
          </div>
        </div>
      </div>

      {/* Subscription Tiers */}
      <div className="px-4 mt-6 space-y-4 pb-6">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.name}
              className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden border border-white/30 ${
                tier.popular ? "ring-2 ring-[#10B981]" : ""
              }`}
            >
              {tier.popular && (
                <div className="bg-[#10B981] text-white text-center py-1 text-xs">
                  Most Popular
                </div>
              )}
              
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${tier.bgColor} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${tier.color}`} />
                    </div>
                    <div>
                      <h3 className="text-lg text-gray-800">{tier.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-[#1E3A8A]">{tier.price}</span>
                        {tier.price !== "Free" && (
                          <span className="text-xs text-gray-500">/{tier.priceDetail}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {tier.current && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                {tier.current ? (
                  <button
                    disabled
                    className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    className={`w-full py-3 rounded-xl transition-colors ${
                      tier.popular
                        ? "bg-[#10B981] text-white hover:bg-[#0d9668]"
                        : "bg-[#1E3A8A] text-white hover:bg-[#152d6b]"
                    }`}
                  >
                    Upgrade to {tier.name}
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
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 text-center shadow-sm border border-white/30">
          <p className="text-sm text-gray-500">No payment history yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Upgrade to a paid plan to see your payment history
          </p>
        </div>
      </div>
    </div>
  );
}
