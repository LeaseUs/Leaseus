import { useState } from "react";
import { Link } from "react-router";
import { Bell, Search, Calendar, Wallet, Sparkles, Home as HomeIcon, Wrench, Car, Scissors, Paintbrush, Camera, Laptop, Heart, ChevronRight, MapPin, Star } from "lucide-react";
import logoImage from "figma:asset/37a3bc5e0af11a212a9124a7d3ec819ea82f67d7.png";

export function Home() {
  const [vestingProgress] = useState(35); // 35% of 50 LEUS vested

  const categories = [
    { icon: HomeIcon, label: "Cleaning", color: "bg-blue-100 text-blue-600" },
    { icon: Wrench, label: "Plumbing", color: "bg-green-100 text-green-600" },
    { icon: Car, label: "Car Wash", color: "bg-purple-100 text-purple-600" },
    { icon: Scissors, label: "Hair & Beauty", color: "bg-pink-100 text-pink-600" },
    { icon: Paintbrush, label: "Painting", color: "bg-orange-100 text-orange-600" },
    { icon: Camera, label: "Photography", color: "bg-indigo-100 text-indigo-600" },
    { icon: Laptop, label: "IT Services", color: "bg-cyan-100 text-cyan-600" },
    { icon: Heart, label: "Healthcare", color: "bg-red-100 text-red-600" },
  ];

  const featuredServices = [
    {
      id: 1,
      name: "Professional Cleaning",
      provider: "CleanPro Services",
      rating: 4.9,
      price: "£50/hr",
      leusAccepted: true,
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop"
    },
    {
      id: 2,
      name: "Emergency Plumbing",
      provider: "QuickFix Plumbers",
      rating: 4.8,
      price: "£75/hr",
      leusAccepted: true,
      image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop"
    },
    {
      id: 3,
      name: "Mobile Car Detailing",
      provider: "Shine & Drive",
      rating: 4.7,
      price: "£40",
      leusAccepted: false,
      image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop"
    },
  ];

  const nearbyBusinesses = [
    { name: "Green Cafe", distance: "0.3 mi", category: "Food & Drink", leusAccepted: true },
    { name: "Tech Repair Shop", distance: "0.5 mi", category: "Electronics", leusAccepted: true },
    { name: "Fitness Studio", distance: "0.8 mi", category: "Health", leusAccepted: true },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-4 rounded-b-3xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <img src={logoImage} alt="LeaseUs" className="h-10" />
          <div className="flex items-center gap-3">
            <button className="relative">
              <Bell className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#10B981] rounded-full text-xs text-white flex items-center justify-center">
                3
              </span>
            </button>
          </div>
        </div>

        {/* Wallet Summary Pill */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 relative z-10">
          <p className="text-white/80 text-sm mb-1">Total Portfolio Value</p>
          <h2 className="text-white text-3xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>£1,247.50</h2>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div>
              <span className="text-white/70">GBP: </span>
              <span className="text-white font-semibold">£1,000</span>
            </div>
            <div>
              <span className="text-white/70">LEUS: </span>
              <span className="text-white font-semibold">Ł247.50</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vesting Progress Banner */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-[#10B981]/90 to-[#14B8A6]/90 backdrop-blur-md rounded-2xl p-4 text-white relative overflow-hidden">
        <div className="flex items-center justify-between mb-2 relative z-10">
          <div>
            <p className="text-sm opacity-90">Your LEUS Bonus</p>
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>17.5 / 50 LEUS</h3>
          </div>
          <div className="w-16 h-16 relative">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="white"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${vestingProgress * 1.76} 176`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm">{vestingProgress}%</span>
            </div>
          </div>
        </div>
        <p className="text-xs opacity-80">Keep using LeaseUs to unlock your remaining bonus!</p>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-6">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <Link
            to="/home/services"
            className="flex-shrink-0 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 min-w-[100px] border border-white/30"
          >
            <Search className="w-6 h-6 text-[#1E3A8A]" />
            <span className="text-xs text-center">Find Services</span>
          </Link>
          <Link
            to="/home/services"
            className="flex-shrink-0 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 min-w-[100px] border border-white/30"
          >
            <Calendar className="w-6 h-6 text-[#10B981]" />
            <span className="text-xs text-center">My Bookings</span>
          </Link>
          <Link
            to="/home/wallet"
            className="flex-shrink-0 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 min-w-[100px] border border-white/30"
          >
            <Sparkles className="w-6 h-6 text-purple-600" />
            <span className="text-xs text-center">Create MintLeaf</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 mt-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for services..."
            className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-md rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
        </div>
      </div>

      {/* Service Categories */}
      <div className="px-4 mt-6">
        <h3 className="text-lg mb-3 text-[#1E3A8A]">Browse Categories</h3>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link
                key={index}
                to="/home/services"
                className="bg-white/80 backdrop-blur-md rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-shadow border border-white/30"
              >
                <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs text-center text-gray-700">{category.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured Services */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg text-[#1E3A8A]">Featured Services</h3>
          <Link to="/home/services" className="text-sm text-[#10B981] flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {featuredServices.map((service) => (
            <div key={service.id} className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30">
              <div className="flex gap-3">
                <img
                  src={service.image}
                  alt={service.name}
                  className="w-24 h-24 object-cover"
                />
                <div className="flex-1 p-3">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm text-gray-800">{service.name}</h4>
                    {service.leusAccepted && (
                      <span className="bg-[#10B981] text-white text-xs px-2 py-0.5 rounded-full">
                        LEUS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{service.provider}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-600">{service.rating}</span>
                    </div>
                    <span className="text-sm text-[#1E3A8A]">{service.price}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Near You */}
      <div className="px-4 mt-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg text-[#1E3A8A]">Near You</h3>
          <button className="text-sm text-[#10B981] flex items-center gap-1">
            View Map <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {nearbyBusinesses.map((business, index) => (
            <div key={index} className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm flex items-center justify-between border border-white/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#10B981]/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-800">{business.name}</h4>
                  <p className="text-xs text-gray-500">{business.category} • {business.distance}</p>
                </div>
              </div>
              {business.leusAccepted && (
                <span className="bg-[#10B981] text-white text-xs px-2 py-1 rounded-full">
                  LEUS
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}