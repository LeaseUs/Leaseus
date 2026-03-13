import { useState } from "react";
import { Sparkles, QrCode, Camera, Gift, Lock, Clock, CheckCircle } from "lucide-react";

export function MintLeaf() {
  const [activeTab, setActiveTab] = useState<"create" | "scan" | "owned">("create");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [showQR, setShowQR] = useState(false);

  const ownedMintLeafs = [
    { id: 1, amount: 50, status: "active", createdDate: "Mar 10, 2026", pin: "****", claimed: false },
    { id: 2, amount: 25, status: "claimed", createdDate: "Mar 8, 2026", pin: "****", claimed: true, claimedBy: "john@example.com" },
    { id: 3, amount: 100, status: "active", createdDate: "Mar 5, 2026", pin: "****", claimed: false },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setShowQR(true);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#10B981]/90 to-[#14B8A6]/90 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-white" />
          <h1 className="text-xl text-white">MintLeaf</h1>
        </div>
        <p className="text-white/90 text-sm">
          Create and share LEUS value with anyone
        </p>
      </div>

      {/* Info Card */}
      <div className="mx-4 mt-4 bg-blue-50/80 backdrop-blur-md border border-blue-200/50 rounded-xl p-4">
        <h3 className="text-sm text-blue-800 mb-2 flex items-center gap-2">
          <Gift className="w-4 h-4" />
          What is MintLeaf?
        </h3>
        <p className="text-xs text-blue-700">
          MintLeaf allows you to lock LEUS coins and share them via QR code. Recipients can claim 
          the value using a PIN you create. Perfect for gifts, payments, or value sharing!
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-6">
        <div className="flex gap-2 bg-white/80 backdrop-blur-md rounded-xl p-1 shadow-sm border border-white/30">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "create"
                ? "bg-[#10B981] text-white"
                : "text-gray-600"
            }`}
          >
            Create
          </button>
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "scan"
                ? "bg-[#10B981] text-white"
                : "text-gray-600"
            }`}
          >
            Scan & Claim
          </button>
          <button
            onClick={() => setActiveTab("owned")}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "owned"
                ? "bg-[#10B981] text-white"
                : "text-gray-600"
            }`}
          >
            My MintLeafs
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-6 pb-6">
        {/* Create Tab */}
        {activeTab === "create" && (
          <div>
            {!showQR ? (
              <form onSubmit={handleCreate} className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-sm space-y-4 border border-white/30">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    LEUS Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      Ł
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      required
                      min="1"
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Your balance: Ł247.50
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Create PIN (4-6 digits)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Enter PIN"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      required
                      minLength={4}
                      maxLength={6}
                      pattern="[0-9]*"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This PIN will be required to claim the MintLeaf
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <h4 className="text-sm text-gray-700">Summary</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount to lock:</span>
                    <span className="text-gray-800">Ł{amount || "0.00"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Network fee:</span>
                    <span className="text-gray-800">Ł0.00</span>
                  </div>
                  <div className="h-px bg-gray-200 my-2"></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Total:</span>
                    <span className="text-[#10B981]">Ł{amount || "0.00"}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#10B981] text-white py-3 rounded-xl hover:bg-[#0d9668] transition-colors"
                >
                  Create MintLeaf
                </button>
              </form>
            ) : (
              <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-sm text-center border border-white/30">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#10B981]" />
                </div>
                <h3 className="text-lg text-gray-800 mb-2">MintLeaf Created!</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Your MintLeaf of Ł{amount} is ready to share
                </p>

                {/* QR Code Placeholder */}
                <div className="w-64 h-64 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">QR Code</p>
                    <p className="text-xs text-gray-500">Ł{amount}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    Share QR
                  </button>
                  <button
                    onClick={() => {
                      setShowQR(false);
                      setAmount("");
                      setPin("");
                    }}
                    className="flex-1 bg-[#10B981] text-white py-3 rounded-xl hover:bg-[#0d9668] transition-colors"
                  >
                    Create Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scan Tab */}
        {activeTab === "scan" && (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-sm text-center border border-white/30">
            <div className="w-full aspect-square max-w-sm mx-auto bg-gray-900 rounded-xl flex items-center justify-center mb-6 relative overflow-hidden">
              <Camera className="w-16 h-16 text-white/50" />
              <div className="absolute inset-8 border-2 border-white/50 rounded-xl"></div>
              <p className="absolute bottom-4 left-0 right-0 text-white text-sm">
                Position QR code within frame
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Scan a MintLeaf QR code to claim LEUS
            </p>

            <button className="w-full bg-[#10B981] text-white py-3 rounded-xl hover:bg-[#0d9668] transition-colors">
              Enable Camera
            </button>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-3">Or enter MintLeaf code manually</p>
              <input
                type="text"
                placeholder="Enter MintLeaf code"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
          </div>
        )}

        {/* Owned Tab */}
        {activeTab === "owned" && (
          <div className="space-y-3">
            {ownedMintLeafs.map((mintleaf) => (
              <div key={mintleaf.id} className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl text-[#10B981]">Ł{mintleaf.amount}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          mintleaf.claimed
                            ? "bg-gray-100 text-gray-600"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {mintleaf.claimed ? "Claimed" : "Active"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      Created {mintleaf.createdDate}
                    </div>
                  </div>
                  {!mintleaf.claimed && (
                    <button className="text-[#10B981] text-sm">View QR</button>
                  )}
                </div>

                {mintleaf.claimed && (
                  <p className="text-xs text-gray-500">
                    Claimed by {mintleaf.claimedBy}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>PIN: {mintleaf.pin}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}