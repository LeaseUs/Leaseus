import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Star, MapPin, Clock, Shield, CheckCircle, MessageCircle, Loader2, Phone, Mail, Calendar, Award } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface Service {
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
  category_name: string | null;
  status: string;
}

export function ProviderProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchProviderAndServices();
    fetchCurrentUser();
  }, [id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setCurrentUser(profile);
    }
  };

  const fetchProviderAndServices = async () => {
    setLoading(true);
    try {
      // Fetch provider profile
      const { data: providerData, error: providerError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (providerError || !providerData) {
        console.error("Provider not found:", providerError);
        navigate("/home/services");
        return;
      }

      setProvider(providerData);

      // Fetch provider's services
      const { data: servicesData, error: servicesError } = await supabase
        .from("listings")
        .select(`
          id, title, description, price_pence, price_leus, price_type,
          accepts_leus, accepts_fiat, location_city, is_remote, status,
          categories(name),
          listing_images(url, is_primary)
        `)
        .eq("provider_id", id)
        .eq("status", "active");

      if (servicesError) {
        console.error("Error fetching services:", servicesError);
        setServices([]);
      } else {
        const formattedServices = (servicesData || []).map((service: any) => ({
          id: service.id,
          title: service.title,
          description: service.description,
          price_pence: service.price_pence,
          price_leus: service.price_leus,
          price_type: service.price_type,
          accepts_leus: service.accepts_leus,
          accepts_fiat: service.accepts_fiat,
          location_city: service.location_city,
          is_remote: service.is_remote,
          avg_rating: providerData.avg_rating || 0,
          total_reviews: providerData.total_reviews || 0,
          primary_image: service.listing_images?.find((img: any) => img.is_primary)?.url || null,
          category_name: service.categories?.name || null,
          status: service.status,
        }));
        setServices(formattedServices);
      }
    } catch (error) {
      console.error("Error loading provider profile:", error);
      navigate("/home/services");
    } finally {
      setLoading(false);
    }
  };

  const handleContactProvider = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", currentUser.id)
        .eq("provider_id", id)
        .maybeSingle();

      if (existing) {
        navigate(`/home/conversation/${existing.id}`);
        return;
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          client_id: currentUser.id,
          provider_id: id,
          last_message_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (convError) throw convError;
      navigate(`/home/conversation/${newConv.id}`);
    } catch (error) {
      console.error("Error starting conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (service: Service) => {
    if (service.price_pence) {
      return `£${(service.price_pence / 100).toFixed(2)}${service.price_type === "hourly" ? "/hr" : ""}`;
    }
    if (service.price_leus) {
      return `<span className="leus">ᛃ</span>${service.price_leus}`;
    }
    return "Quote";
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-700 text-sm">Provider not found</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-[#1E3A8A] text-white rounded-xl text-sm">
          Go Back
        </button>
      </div>
    );
  }

  const isBusiness = provider.role === "local_business";
  const hasLocation = provider.business_lat && provider.business_lng;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A]/5 via-[#10B981]/5 to-[#14B8A6]/5">
      {/* Header */}
      <div className="bg-[#1E3A8A]/90 backdrop-blur-lg px-4 pt-6 pb-4 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
            Provider Profile
          </h1>
        </div>
      </div>

      {/* Provider Info Card */}
      <div className="mx-4 -mt-8 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/30 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            {provider.avatar_url ? (
              <img
                src={provider.avatar_url}
                alt={provider.full_name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-[#10B981] to-[#14B8A6] rounded-full flex items-center justify-center text-white text-2xl">
                {getInitials(provider.full_name || "")}
              </div>
            )}
            {provider.kyc_verified && (
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl text-gray-800 mb-1">{provider.full_name}</h2>
            <p className="text-sm text-gray-500 mb-2">
              {isBusiness ? "Local Business" : "Service Provider"}
            </p>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-gray-800">
                {provider.avg_rating > 0 ? provider.avg_rating.toFixed(1) : "New"}
              </span>
              {provider.total_reviews > 0 && (
                <span className="text-sm text-gray-500">({provider.total_reviews} reviews)</span>
              )}
            </div>

            {/* Location */}
            {hasLocation && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#10B981]" />
                <span className="text-sm text-gray-600">
                  {provider.business_address || provider.location_city || "Location available"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {provider.bio && (
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{provider.bio}</p>
        )}

        {/* Contact Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleContactProvider}
            className="flex-1 bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Contact
          </button>
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              className="bg-[#10B981] text-white p-3 rounded-xl hover:bg-[#0d9668] transition-colors"
            >
              <Phone className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>

      {/* Services Section */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-[#1E3A8A] font-semibold">
            Services ({services.length})
          </h3>
          {services.length > 0 && (
            <button
              onClick={() => navigate(`/home/reviews?provider=${id}`)}
              className="text-sm text-[#10B981] hover:underline flex items-center gap-1"
            >
              <Star className="w-4 h-4" />
              View Reviews
            </button>
          )}
        </div>

        {services.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 text-center border border-white/30">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg text-gray-600 mb-2">No services yet</h3>
            <p className="text-sm text-gray-500">
              This provider hasn't listed any services yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                onClick={() => navigate(`/home/service/${service.id}`)}
                className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={service.primary_image || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop"}
                    alt={service.title}
                    className="w-full h-32 object-cover"
                  />
                  {service.accepts_leus && (
                    <span className="absolute top-2 right-2 bg-[#10B981] text-white text-xs px-2 py-1 rounded-full">
                      LEUS
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">{service.title}</h4>
                      <p className="text-xs text-gray-500 mb-2">{service.category_name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{service.is_remote ? "Remote" : service.location_city || "Local"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{service.avg_rating > 0 ? service.avg_rating.toFixed(1) : "New"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1E3A8A]">{formatPrice(service)}</p>
                    </div>
                  </div>
                  {service.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">{service.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}