import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Star, MapPin, Users, Search, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface Provider {
  id: string;
  full_name: string;
  bio: string | null;
  role: string;
  avatar_url: string | null;
  kyc_verified: boolean;
  avg_rating: number;
  total_reviews: number;
  business_address: string | null;
  location_city: string | null;
  business_lat: number | null;
  business_lng: number | null;
  services_count: number;
}

export function Providers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProviders(providers);
    } else {
      const filtered = providers.filter(provider =>
        provider.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (provider.bio && provider.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (provider.business_address && provider.business_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (provider.location_city && provider.location_city.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredProviders(filtered);
    }
  }, [searchQuery, providers]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, full_name, bio, role, avatar_url, kyc_verified,
          avg_rating, total_reviews, business_address, location_city,
          business_lat, business_lng,
          listings!provider_id(count)
        `)
        .in("role", ["provider", "local_business"])
        .eq("listings.status", "active")
        .order("avg_rating", { ascending: false });

      if (error) {
        console.error("Error fetching providers:", error);
        setProviders([]);
        setFilteredProviders([]);
      } else {
        const formattedProviders = (data || []).map((provider: any) => ({
          ...provider,
          services_count: provider.listings?.[0]?.count || 0,
        }));
        setProviders(formattedProviders);
        setFilteredProviders(formattedProviders);
      }
    } catch (error) {
      console.error("Error fetching providers:", error);
      setProviders([]);
      setFilteredProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A]/5 via-[#10B981]/5 to-[#14B8A6]/5">
      {/* Header */}
      <div className="bg-[#1E3A8A]/90 backdrop-blur-lg px-4 pt-6 pb-4 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
            Providers
          </h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search providers..."
            className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-md rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] border border-white/30"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 text-center border border-white/30">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg text-gray-600 mb-2">
              {searchQuery ? "No providers found" : "No providers available"}
            </h3>
            <p className="text-sm text-gray-500">
              {searchQuery ? "Try adjusting your search terms" : "Check back later for new providers"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {filteredProviders.length} provider{filteredProviders.length !== 1 ? "s" : ""} available
            </p>

            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                onClick={() => navigate(`/home/provider/${provider.id}`)}
                className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      {provider.avatar_url ? (
                        <img
                          src={provider.avatar_url}
                          alt={provider.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-[#10B981] to-[#14B8A6] rounded-full flex items-center justify-center text-white text-xl">
                          {getInitials(provider.full_name)}
                        </div>
                      )}
                      {provider.kyc_verified && (
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg text-gray-800 mb-1">{provider.full_name}</h3>
                          <p className="text-sm text-gray-500 mb-2">
                            {provider.role === "local_business" ? "Local Business" : "Service Provider"}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-gray-800">
                              {provider.avg_rating > 0 ? provider.avg_rating.toFixed(1) : "New"}
                            </span>
                            {provider.total_reviews > 0 && (
                              <span className="text-sm text-gray-500">({provider.total_reviews})</span>
                            )}
                          </div>
                          <p className="text-sm text-[#10B981] font-medium">
                            {provider.services_count} service{provider.services_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      {/* Location */}
                      {(provider.business_address || provider.location_city) && (
                        <div className="flex items-center gap-1 mb-2">
                          <MapPin className="w-4 h-4 text-[#10B981]" />
                          <span className="text-sm text-gray-600">
                            {provider.business_address || provider.location_city}
                          </span>
                        </div>
                      )}

                      {/* Bio */}
                      {provider.bio && (
                        <p className="text-sm text-gray-600 line-clamp-2">{provider.bio}</p>
                      )}
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