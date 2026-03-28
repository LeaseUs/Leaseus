import { User, ChevronRight, Bell, Shield, HelpCircle, FileText, LogOut, Camera, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router";

export function Profile() {
  const user = {
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "+44 7700 900123",
    kycStatus: "verified",
    memberSince: "March 2026",
  };

  const menuItems = [
    {
      section: "Account",
      items: [
        { icon: User, label: "Personal Information", path: "#" },
        { icon: Shield, label: "Security Settings", path: "#", badge: "2FA Enabled" },
        { icon: FileText, label: "KYC Verification", path: "#", badge: "Verified", badgeColor: "green" },
      ],
    },
    {
      section: "Preferences",
      items: [
        { icon: Bell, label: "Notifications", path: "#" },
      ],
    },
    {
      section: "Support",
      items: [
        { icon: HelpCircle, label: "Help & Support", path: "#" },
        { icon: FileText, label: "Terms of Service", path: "#" },
        { icon: FileText, label: "Privacy Policy", path: "#" },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-12 rounded-b-3xl">
        <h1 className="text-xl text-white">Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="mx-4 -mt-8 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/30">
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-[#10B981] to-[#14B8A6] rounded-full flex items-center justify-center text-white text-2xl">
              {user.name.split(" ").map(n => n[0]).join("")}
            </div>
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-[#1E3A8A] rounded-full flex items-center justify-center border-2 border-white">
              <Camera className="w-3 h-3 text-white" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-lg text-gray-800 mb-1">{user.name}</h2>
            <p className="text-sm text-gray-500 mb-1">{user.email}</p>
            <p className="text-sm text-gray-500">{user.phone}</p>
          </div>
        </div>

        {/* KYC Status */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          {user.kycStatus === "verified" ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">KYC Verified</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-600">KYC Pending</span>
            </>
          )}
          <span className="text-sm text-gray-400 ml-auto">
            Member since {user.memberSince}
          </span>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-[#1E3A8A]/90 to-[#10B981]/90 backdrop-blur-md rounded-xl p-4 text-white border border-white/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Current Plan</p>
            <p className="text-lg">Basic (Free)</p>
          </div>
          <Link
            to="/subscriptions"
            className="bg-white text-[#1E3A8A] px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors"
          >
            Upgrade
          </Link>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="px-4 mt-6 space-y-6 pb-6">
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
              {section.section}
            </h3>
            <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <button
                    key={itemIndex}
                    className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors ${
                      itemIndex !== section.items.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span className="flex-1 text-left text-sm text-gray-700">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          item.badgeColor === "green"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30">
          <Link
            to="/login"
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-600" />
            <span className="flex-1 text-left text-sm text-red-600">
              Sign Out
            </span>
            <ChevronRight className="w-4 h-4 text-red-400" />
          </Link>
        </div>

        {/* App Version */}
        <p className="text-center text-xs text-gray-400 pt-4">
          LeaseUs v1.0.0
        </p>
      </div>
    </div>
  );
}