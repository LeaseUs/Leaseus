import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Bell, Search, Calendar, Sparkles, Home as HomeIcon, Wrench, Car, Scissors, Paintbrush, Camera, Laptop, Heart, ChevronRight, MapPin, Star, Loader2 } from "lucide-react";
import logoImage from "../../assets/logo.png";
import { supabase } from "../../lib/supabase";

export function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [notifications, setNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

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

  const mockServices = [
    { id: "1", title: "Professional Cleaning", provider_name: "CleanPro Services", avg_rating: 4.9, price_pence: 5000, price_type: "hourly", accepts_leus: true, image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop" },
    { id: "2", title: "Emergency Plumbing", provider_name: "QuickFix Plumbers", avg_rating: 4.8, price_pence: 7500, price_type: "hourly", accepts_leus: true, image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop" },
    { id: "3", title: "Mobile Car Detailing", provider_name: "Shine & Drive", avg_rating: 4.7, price_pence: 4000, price_type: "fixed", accepts_leus: false, image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop" },
  ];

  const nearbyBusinesses = [
    { name: "Green Cafe", distance: "0.3 mi", category: "Food & Drink", leusAccepted: true },
    { name: "Tech Repair Shop", distance: "0.5 mi", category: "Electronics", leusAccepted: true },
    { name: "Fitness Studio", distance: "0.8 mi", category: "Health", leusAccepted: true },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch profile with wallet balances
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, fiat_balance_pence, leus_balance, loyalty_points, signup_bonus_vested, signup_bonus_total")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Fetch unread notifications count
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setNotifications(count || 0);

      // Fetch featured listings
      const { data: listingsData } = await supabase
        .from("listings")
        .select(`
          id, title, price_pence, price_type, accepts_leus,
          profiles!provider_id (full_name, avg_rating),
          listing_images (url, is_primary)
        `)
        .eq("status", "active")
        .limit(3);

      if (listingsData && listingsData.length > 0) {
        setFeaturedServices(listingsData.map((item: any) => ({
          id: item.id,
          title: item.title,
          provider_name: item.profiles?.full_name || "Unknown",
          avg_rating: item.profiles?.avg_rating || 0,
          price_pence: item.price_pence,
          price_type: item.price_type,
          accepts_leus: item.accepts_leus,
          image: item.listing_images?.find((img: any) => img.is_primary)?.url
            || item.listing_images?.[0]?.url
            || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
        })));
      } else {
        setFeaturedServices(mockServices);
      }
    } catch (err) {
      setFeaturedServices(mockServices);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (pence: number, type: string) => {
    const pounds = pence / 100;
    return `£${pounds}${type === "hourly" ? "/hr" : ""}`;
  };

  const totalPortfolio = profile
    ? (profile.fiat_balance_pence / 100) + Number(profile.leus_balance)
    : 0;

  const vestingPct = profile
    ? Math.round((Number(profile.signup_bonus_vested) / Number(profile.signup_bonus_total || 50)) * 100)
    : 0;

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-4 rounded-b-3xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <img src={logoImage} alt="LeaseUs" className="h-10" />
            {!loading && <p className="text-white/70 text-xs mt-1">Hey, {firstName} 👋</p>}
          </div>
          <div className="flex items-center gap-3">
            <button className="relative">
              <Bell className="w-6 h-6 text-white" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#10B981] rounded-full text-xs text-white flex items-center justify-center">
                  {notifications > 9 ? "9+" : notifications}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Wallet Summary Pill */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          ) : (
            <>
              <p className="text-white/80 text-sm mb-1">Total Portfolio Value</p>
              <h2 className="text-white text-3xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
                £{totalPortfolio.toFixed(2)}
              </h2>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div>
                  <span className="text-white/70">GBP: </span>
                  <span className="text-white font-semibold">
                    £{((profile?.fiat_balance_pence || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-white/70">LEUS: </span>
                  <span className="text-white font-semibold">
                    Ł{Number(profile?.leus_balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Vesting Progress Banner */}
      {!loading && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-[#10B981]/90 to-[#14B8A6]/90 backdrop-blur-md rounded-2xl p-4 text-white relative overflow-hidden">
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div>
              <p className="text-sm opacity-90">Your LEUS Bonus</p>
              <h3 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
                {Number(profile?.signup_bonus_vested || 0).toFixed(1)} / {Number(profile?.signup_bonus_total || 50).toFixed(0)} LEUS
              </h3>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="6" fill="none"
                  strokeDasharray={`${vestingPct * 1.76} 176`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm">{vestingPct}%</span>
              </div>
            </div>
          </div>
          <p className="text-xs opacity-80">Keep using LeaseUs to unlock your remaining bonus!</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 mt-6">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <Link to="/home/services" className="flex-shrink-0 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 min-w-[100px] border border-white/30">
            <Search className="w-6 h-6 text-[#1E3A8A]" />
            <span className="text-xs text-center">Find Services</span>
          </Link>
          <Link to="/home/bookings" className="flex-shrink-0 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 min-w-[100px] border border-white/30">
            <Calendar className="w-6 h-6 text-[#10B981]" />
            <span className="text-xs text-center">My Bookings</span>
          </Link>
          <Link to="/home/mintleaf" className="flex-shrink-0 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 min-w-[100px] border border-white/30">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <span className="text-xs text-center">MintLeaf</span>
          </Link>
          <Link to="/home/loyalty" className="flex-shrink-0 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 min-w-[100px] border border-white/30">
            <Star className="w-6 h-6 text-yellow-500" />
            <span className="text-xs text-center">Loyalty</span>
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
            onFocus={() => navigate("/home/services")}
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
              <Link key={index} to="/home/services"
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
            <Link key={service.id} to={`/home/service/${service.id}`}
              className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30 flex gap-3"
            >
              <img src={service.image} alt={service.title} className="w-24 h-24 object-cover" />
              <div className="flex-1 p-3">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-sm text-gray-800">{service.title}</h4>
                  {service.accepts_leus && (
                    <span className="bg-[#10B981] text-white text-xs px-2 py-0.5 rounded-full">LEUS</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2">{service.provider_name}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-600">
                      {service.avg_rating > 0 ? service.avg_rating.toFixed(1) : "New"}
                    </span>
                  </div>
                  <span className="text-sm text-[#1E3A8A]">
                    {service.price_pence ? formatPrice(service.price_pence, service.price_type) : "Quote"}
                  </span>
                </div>
              </div>
            </Link>
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
                <span className="bg-[#10B981] text-white text-xs px-2 py-1 rounded-full">LEUS</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
