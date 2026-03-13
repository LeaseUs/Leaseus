import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, TrendingUp, Clock, Sparkles, QrCode, Camera, Gift, Lock, CheckCircle } from "lucide-react";

export function Wallet() {
  const [activeTab, setActiveTab] = useState<"all" | "fiat" | "leus" | "mintleaf">("all");
  const [mintLeafSubTab, setMintLeafSubTab] = useState<"create" | "scan" | "owned">("create");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [showQR, setShowQR] = useState(false);

  const transactions = [
    { id: 1, type: "received", amount: "50 LEUS", from: "Sign-up Bonus", date: "Mar 10, 2026", currency: "leus" },
    { id: 2, type: "sent", amount: "£75.00", to: "QuickFix Plumbers", date: "Mar 9, 2026", currency: "fiat" },
    { id: 3, type: "converted", amount: "100 LEUS → £100", desc: "LEUS to GBP", date: "Mar 8, 2026", currency: "both" },
    { id: 4, type: "received", amount: "25 LEUS", from: "Loyalty Points", date: "Mar 7, 2026", currency: "leus" },
    { id: 5, type: "sent", amount: "50 LEUS", to: "CleanPro Services", date: "Mar 6, 2026", currency: "leus" },
    { id: 6, type: "deposit", amount: "£500.00", desc: "Bank Transfer", date: "Mar 5, 2026", currency: "fiat" },
  ];

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === "all") return true;
    if (activeTab === "fiat") return tx.currency === "fiat" || tx.currency === "both";
    if (activeTab === "leus") return tx.currency === "leus" || tx.currency === "both";
    return true;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-xl text-white mb-6">My Wallet</h1>

        {/* Total Portfolio */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 border border-white/30 mb-4">
          <p className="text-white/80 text-sm mb-2">Total Portfolio Value</p>
          <h2 className="text-white text-3xl mb-4">£1,247.50</h2>
          
          <div className="flex items-center gap-2 text-sm text-white/90">
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
            <span className="text-[#10B981]">+5.2%</span>
            <span className="text-white/60">this month</span>
          </div>
        </div>

        {/* Currency Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Fiat Balance */}
          <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Fiat Balance</span>
              <span className="text-lg">£</span>
            </div>
            <p className="text-xl text-[#1E3A8A] mb-3">£1,000.00</p>
            <div className="flex gap-2">
              <button className="flex-1 bg-[#1E3A8A] text-white text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                <ArrowDownLeft className="w-3 h-3" />
                Add
              </button>
              <button className="flex-1 border border-[#1E3A8A] text-[#1E3A8A] text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                Send
              </button>
            </div>
          </div>

          {/* LEUS Balance */}
          <div className="bg-gradient-to-br from-[#10B981]/90 to-[#14B8A6]/90 backdrop-blur-md rounded-xl p-4 text-white border border-white/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs opacity-90">LEUS Balance</span>
              <span className="text-lg">Ł</span>
            </div>
            <p className="text-xl mb-3">247.50</p>
            <div className="flex gap-2">
              <button className="flex-1 bg-white/20 backdrop-blur-sm text-white text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                <ArrowLeftRight className="w-3 h-3" />
                Convert
              </button>
              <button className="flex-1 bg-white text-[#10B981] text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                Pay
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Rate */}
      <div className="mx-4 mt-4 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Exchange Rate</p>
            <p className="text-sm text-gray-800">1 LEUS = £1.00 GBP</p>
          </div>
          <button className="bg-[#10B981] text-white text-sm px-4 py-2 rounded-lg">
            Convert Now
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-4 mt-6">
        <h3 className="text-lg text-[#1E3A8A] mb-3">Transaction History</h3>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "all"
                ? "bg-[#1E3A8A] text-white"
                : "bg-white/80 backdrop-blur-md text-gray-600 border border-white/30"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("fiat")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "fiat"
                ? "bg-[#1E3A8A] text-white"
                : "bg-white/80 backdrop-blur-md text-gray-600 border border-white/30"
            }`}
          >
            Fiat
          </button>
          <button
            onClick={() => setActiveTab("leus")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "leus"
                ? "bg-[#10B981] text-white"
                : "bg-white/80 backdrop-blur-md text-gray-600 border border-white/30"
            }`}
          >
            LEUS
          </button>
          <button
            onClick={() => setActiveTab("mintleaf")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "mintleaf"
                ? "bg-[#10B981] text-white"
                : "bg-white/80 backdrop-blur-md text-gray-600 border border-white/30"
            }`}
          >
            Mint Leaf
          </button>
        </div>

        {/* Mint Leaf Sub Tabs */}
        {activeTab === "mintleaf" && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMintLeafSubTab("create")}
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                mintLeafSubTab === "create"
                  ? "bg-[#10B981] text-white"
                  : "bg-white/80 backdrop-blur-md text-gray-600 border border-white/30"
              }`}
            >
              Create
            </button>
            <button
              onClick={() => setMintLeafSubTab("scan")}
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                mintLeafSubTab === "scan"
                  ? "bg-[#10B981] text-white"
                  : "bg-white/80 backdrop-blur-md text-gray-600 border border-white/30"
              }`}
            >
              Scan
            </button>
            <button
              onClick={() => setMintLeafSubTab("owned")}
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                mintLeafSubTab === "owned"
                  ? "bg-[#10B981] text-white"
                  : "bg-white/80 backdrop-blur-md text-gray-600 border border-white/30"
              }`}
            >
              Owned
            </button>
          </div>
        )}

        {/* Mint Leaf Create Form */}
        {activeTab === "mintleaf" && mintLeafSubTab === "create" && (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
            <h4 className="text-sm text-gray-800 mb-2">Create Mint Leaf</h4>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">Enter the amount of LEUS to mint:</p>
            </div>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#10B981]"
            />
            <div className="flex items-center gap-2 mb-2 mt-2">
              <Lock className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">Enter your PIN:</p>
            </div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#10B981]"
            />
            <button className="mt-4 bg-[#10B981] text-white text-sm px-4 py-2 rounded-lg">
              Mint Leaf
            </button>
          </div>
        )}

        {/* Mint Leaf Scan Form */}
        {activeTab === "mintleaf" && mintLeafSubTab === "scan" && (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
            <h4 className="text-sm text-gray-800 mb-2">Scan Mint Leaf</h4>
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">Scan the QR code of the Mint Leaf:</p>
            </div>
            <button
              className="bg-[#10B981] text-white text-sm px-4 py-2 rounded-lg"
              onClick={() => setShowQR(!showQR)}
            >
              {showQR ? "Hide QR" : "Show QR"}
            </button>
            {showQR && (
              <div className="mt-2">
                <QrCode className="w-20 h-20 text-[#10B981]" />
              </div>
            )}
          </div>
        )}

        {/* Mint Leaf Owned Form */}
        {activeTab === "mintleaf" && mintLeafSubTab === "owned" && (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
            <h4 className="text-sm text-gray-800 mb-2">Owned Mint Leaves</h4>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">You have 5 Mint Leaves:</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">Mint Leaf 1: 100 LEUS</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">Mint Leaf 2: 50 LEUS</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">Mint Leaf 3: 20 LEUS</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">Mint Leaf 4: 10 LEUS</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-800">Mint Leaf 5: 5 LEUS</p>
            </div>
          </div>
        )}

        {/* Transactions List */}
        {activeTab !== "mintleaf" && (
          <div className="space-y-2 pb-6">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === "received" || tx.type === "deposit"
                        ? "bg-green-100"
                        : tx.type === "sent"
                        ? "bg-red-100"
                        : "bg-blue-100"
                    }`}
                  >
                    {tx.type === "received" || tx.type === "deposit" ? (
                      <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    ) : tx.type === "sent" ? (
                      <ArrowUpRight className="w-5 h-5 text-red-600" />
                    ) : (
                      <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm text-gray-800">
                        {tx.type === "received" && tx.from}
                        {tx.type === "sent" && tx.to}
                        {(tx.type === "converted" || tx.type === "deposit") && tx.desc}
                      </h4>
                      <span
                        className={`text-sm ${
                          tx.type === "received" || tx.type === "deposit"
                            ? "text-green-600"
                            : "text-gray-800"
                        }`}
                      >
                        {tx.type === "received" || tx.type === "deposit" ? "+" : "-"}
                        {tx.amount}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {tx.date}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}