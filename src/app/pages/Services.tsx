import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, Star, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

interface Listing {
  id: string;
  title: string;
  description: string;
  price_pence: number | null;
  price_leus: number | null;
  price_type: string;
  accepts_leus: boolean;
  accepts_fiat: boolean;
  location_city: string | null;
  is_remote: boolean;
  avg_rating: number;
  total_reviews: number;
  primary_image: string | null;
  provider_name: string;
  category_name: string | null;
}

export function Services() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [leusOnly, setLeusOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fallback mock data in case DB has no listings yet
  const mockListings: Listing[] = [
    {
      id: "1",
      title: "Professional Cleaning",
      provider_name: "CleanPro Services",
      avg_rating: 4.9,
      total_reviews: 156,
      price_pence: 5000,
      price_leus: null,
      price_type: "hourly",
      location_city: "London",
      accepts_leus: true,
      accepts_fiat: true,
      is_remote: false,
      primary_image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
      category_name: "Cleaning",
      description: "",
    },
    {
      id: "2",
      title: "Emergency Plumbing",
      provider_name: "QuickFix Plumbers",
      avg_rating: 4.8,
      total_reviews: 203,
      price_pence: 7500,
      price_leus: null,
      price_type: "hourly",
      location_city: "London",
      accepts_leus: true,
      accepts_fiat: true,
      is_remote: false,
      primary_image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop",
      category_name: "Plumbing",
      description: "",
    },
    {
      id: "3",
      title: "Mobile Car Detailing",
      provider_name: "Shine & Drive",
      avg_rating: 4.7,
      total_reviews: 89,
      price_pence: 4000,
      price_leus: null,
      price_type: "fixed",
      location_city: "London",
      accepts_leus: false,
      accepts_fiat: true,
      is_remote: false,
      primary_image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop",
      category_name: "Car Care",
      description: "",
    },
    {
      id: "4",
      title: "Hair Styling",
      provider_name: "Style Studio",
      avg_rating: 4.9,
      total_reviews: 312,
      price_pence: 3500,
      price_leus: null,
      price_type: "fixed",
      location_city: "London",
      accepts_leus: true,
      accepts_fiat: true,
      is_remote: false,
      primary_image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop",
      category_name: "Beauty",
      description: "",
    },
  ];

  useEffect(() => {
    fetchListings();
  }, [leusOnly, searchQuery]);

  const fetchListings = async () => {
    setLoading(true);
    setError("");
    try {
      let query = supabase
        .from("listings")
        .select(`
          id,
          title,
          description,
          price_pence,
          price_leus,
          price_type,
          accepts_leus,
          accepts_fiat,
          location_city,
          is_remote,
          profiles!provider_id (full_name, avg_rating, total_reviews),
          categories (name),
          listing_images (url, is_primary)
        `)
        .eq("status", "active");

      if (leusOnly) query = query.eq("accepts_leus", true);
      if (searchQuery) query = query.ilike("title", `%${searchQuery}%`);

      const { data, error } = await query.limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          price_pence: item.price_pence,
          price_leus: item.price_leus,
          price_type: item.price_type,
          accepts_leus: item.accepts_leus,
          accepts_fiat: item.accepts_fiat,
          location_city: item.location_city,
          is_remote: item.is_remote,
          avg_rating: item.profiles?.avg_rating || 0,
          total_reviews: item.profiles?.total_reviews || 0,
          provider_name: item.profiles?.full_name || "Unknown Provider",
          category_name: item.categories?.name || null,
          primary_image: item.listing_images?.find((img: any) => img.is_primary)?.url
            || item.listing_images?.[0]?.url
            || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
        }));
        setListings(formatted);
      } else {
        // No listings in DB yet — show mock data
        setListings(leusOnly ? mockListings.filter(l => l.accepts_leus) : mockListings);
      }
    } catch (err) {
      // On error fall back to mock data
      setListings(leusOnly ? mockListings.filter(l => l.accepts_leus) : mockListings);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (listing: Listing) => {
    if (listing.price_pence) {
      const pounds = listing.price_pence / 100;
      return `£${pounds}${listing.price_type === "hourly" ? "/hr" : ""}`;
    }
    if (listing.price_leus) return `Ł${listing.price_leus}`;
    return "Quote";
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-xl text-white mb-4">Find Services</h1>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for services..."
            className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-md rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] border border-white/30"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-white/30"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => setLeusOnly(!leusOnly)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              leusOnly
                ? "bg-[#10B981] text-white"
                : "bg-white/20 backdrop-blur-sm text-white border border-white/30"
            }`}
          >
            LEUS Only
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-4">
        <p className="text-sm text-gray-600">
          {loading ? "Loading..." : `${listings.length} services available`}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
        </div>
      )}

      {/* Services List */}
      {!loading && (
        <div className="px-4 space-y-4 pb-6">
          {listings.map((service) => (
            <div
              key={service.id}
              className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-white/30"
            >
              <div className="relative">
                <img
                  src={service.primary_image || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop"}
                  alt={service.title}
                  className="w-full h-48 object-cover"
                />
                {service.accepts_leus && (
                  <span className="absolute top-3 right-3 bg-[#10B981] text-white text-xs px-3 py-1 rounded-full">
                    LEUS Accepted
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-base text-gray-800 mb-1">{service.title}</h3>
                    <p className="text-sm text-gray-500">{service.provider_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-[#1E3A8A]">{formatPrice(service)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{service.avg_rating > 0 ? service.avg_rating.toFixed(1) : "New"}</span>
                    {service.total_reviews > 0 && (
                      <span className="text-gray-400">({service.total_reviews})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{service.is_remote ? "Remote" : service.location_city || "UK"}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/home/service/${service.id}`)}
                  className="w-full bg-[#1E3A8A] text-white py-2.5 rounded-lg hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2"
                >
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
