import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Star, MapPin, Clock, Shield, CheckCircle, Calendar, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function ServiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"fiat" | "leus">("fiat");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [error, setError] = useState("");
  const [service, setService] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const timeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM",
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
  ];

  // Mock service for when DB has no listings yet
  const mockService = {
    id: id || "1",
    title: "Professional Cleaning",
    provider_id: null,
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
    description: "Expert cleaning services for homes and offices. Our professional team uses eco-friendly products and guarantees satisfaction.",
    primary_image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=400&fit=crop",
    availability: "Mon-Sat, 8:00 AM - 6:00 PM",
    features: [
      "Background-checked professionals",
      "Eco-friendly cleaning products",
      "100% satisfaction guarantee",
      "Flexible scheduling",
      "Insurance covered",
    ],
  };

  useEffect(() => {
    fetchService();
    fetchCurrentUser();
  }, [id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const fetchService = async () => {
    setLoading(true);
    try {
      // If it's a mock ID (number string), use mock data
      if (!id || id === "1" || id === "2" || id === "3" || id === "4") {
        setService(mockService);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          profiles!provider_id (id, full_name, avg_rating, total_reviews, bio, accepts_leus),
          categories (name),
          listing_images (url, is_primary, alt_text)
        `)
        .eq("id", id)
        .single();

      if (error || !data) {
        setService(mockService);
        return;
      }

      setService({
        ...data,
        provider_id: data.profiles?.id,
        provider_name: data.profiles?.full_name || "Unknown Provider",
        avg_rating: data.profiles?.avg_rating || 0,
        total_reviews: data.profiles?.total_reviews || 0,
        category_name: data.categories?.name,
        primary_image: data.listing_images?.find((img: any) => img.is_primary)?.url
          || data.listing_images?.[0]?.url
          || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=400&fit=crop",
        features: [
          "Background-checked professionals",
          "Satisfaction guarantee",
          "Secure escrow payment",
          "Flexible scheduling",
        ],
        availability: "Contact provider for availability",
      });
    } catch (err) {
      setService(mockService);
    } finally {
      setLoading(false);
    }
  };

  const handleContactProvider = async () => {
    if (!currentUser) { navigate("/login"); return; }
    if (!service.provider_id) return;

    setContacting(true);
    try {
      // Check for existing conversation
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", currentUser.id)
        .eq("provider_id", service.provider_id)
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
          provider_id: service.provider_id,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (convError) throw convError;
      navigate(`/home/conversation/${newConv.id}`);
    } catch (err: any) {
      setError(err.message || "Could not start conversation.");
    } finally {
      setContacting(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      setError("Please select a date and time.");
      return;
    }

    if (!currentUser) {
      navigate("/login");
      return;
    }

    setBooking(true);
    setError("");

    try {
      // Check if user has enough balance for LEUS payment
      if (paymentMethod === "leus" && service.price_pence) {
        const leusNeeded = (service.price_pence / 100) * 0.95;
        if (currentUser.leus_balance < leusNeeded) {
          setError(`Insufficient LEUS balance. You need Ł${leusNeeded.toFixed(2)} but have Ł${currentUser.leus_balance.toFixed(2)}.`);
          setBooking(false);
          return;
        }
      }

      // Create booking
      const scheduledAt = new Date(`${selectedDate} ${selectedTime}`).toISOString();
      const amountPence = service.price_pence || 0;
      const platformFeePence = paymentMethod === "fiat"
        ? Math.round(amountPence * 0.02)
        : 0;

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          listing_id: service.id,
          client_id: currentUser.id,
          provider_id: service.provider_id,
          title: service.title,
          description: `Booking for ${service.title} on ${selectedDate} at ${selectedTime}`,
          scheduled_at: scheduledAt,
          status: "pending",
          payment_method: paymentMethod,
          amount_pence: paymentMethod === "fiat" ? amountPence : null,
          amount_leus: paymentMethod === "leus" ? (amountPence / 100) * 0.95 : null,
          platform_fee_pence: platformFeePence,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Success — navigate home
      alert(`Booking confirmed! 🎉 Your booking for ${service.title} on ${selectedDate} at ${selectedTime} has been submitted.`);
      navigate("/home");

    } catch (err: any) {
      setError(err.message || "Failed to create booking. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  if (!service) return null;

  const finalPrice = paymentMethod === "leus"
    ? (service.price_pence / 100) * 0.95
    : service.price_pence / 100;
  const discount = paymentMethod === "leus" ? (service.price_pence / 100) * 0.05 : 0;

  return (
    <div className="min-h-screen pb-24">
      {/* Header Image */}
      <div className="relative">
        <img
          src={service.primary_image}
          alt={service.title}
          className="w-full h-64 object-cover"
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        {service.accepts_leus && (
          <div className="absolute top-4 right-4 bg-[#10B981] text-white px-3 py-1.5 rounded-full text-sm">
            LEUS Accepted
          </div>
        )}
      </div>

      {/* Service Info */}
      <div className="px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30">
        <h1 className="text-2xl text-gray-800 mb-2">{service.title}</h1>
        <p className="text-base text-gray-600 mb-3">{service.provider_name}</p>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-800">
              {service.avg_rating > 0 ? service.avg_rating.toFixed(1) : "New"}
            </span>
            {service.total_reviews > 0 && (
              <span className="text-sm text-gray-500">({service.total_reviews} reviews)</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            {service.is_remote ? "Remote" : service.location_city || "UK"}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{service.availability}</span>
        </div>
      </div>

      {/* Description */}
      <div className="mt-2 px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30">
        <h3 className="text-base text-gray-800 mb-2">About this service</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
      </div>

      {/* Features */}
      <div className="mt-2 px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30">
        <h3 className="text-base text-gray-800 mb-3">What's included</h3>
        <div className="space-y-2">
          {service.features.map((feature: string, index: number) => (
            <div key={index} className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Form */}
      <div className="mt-2 px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30">
        <h3 className="text-base text-gray-800 mb-4">Book this service</h3>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Date Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-2">Select Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>
        </div>

        {/* Time Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-2">Select Time</label>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`py-2.5 rounded-lg text-sm transition-colors ${
                  selectedTime === time
                    ? "bg-[#10B981] text-white"
                    : "bg-gray-50 text-gray-700 border border-gray-200 hover:border-[#10B981]"
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        {service.accepts_leus && (
          <div className="mb-4">
            <label className="block text-sm text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("fiat")}
                className={`py-3 rounded-xl text-sm transition-colors ${
                  paymentMethod === "fiat"
                    ? "bg-[#1E3A8A] text-white"
                    : "bg-gray-50 text-gray-700 border border-gray-200"
                }`}
              >
                Pay with GBP (£)
              </button>
              <button
                onClick={() => setPaymentMethod("leus")}
                className={`py-3 rounded-xl text-sm transition-colors relative ${
                  paymentMethod === "leus"
                    ? "bg-[#10B981] text-white"
                    : "bg-gray-50 text-gray-700 border border-gray-200"
                }`}
              >
                Pay with LEUS (Ł)
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  5% off
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Service price:</span>
            <span className="text-gray-800">
              {paymentMethod === "fiat"
                ? `£${(service.price_pence / 100).toFixed(2)}`
                : `Ł${(service.price_pence / 100).toFixed(2)}`}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">LEUS discount (5%):</span>
              <span className="text-green-600">-Ł{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Escrow protection:</span>
            <span className="text-gray-800">Free</span>
          </div>
          <div className="h-px bg-gray-200 my-2"></div>
          <div className="flex justify-between">
            <span className="text-gray-800">Total:</span>
            <span className="text-lg text-[#1E3A8A]">
              {paymentMethod === "fiat" ? `£${finalPrice.toFixed(2)}` : `Ł${finalPrice.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Escrow Info */}
        <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Payment will be held in secure escrow and only released to the provider after you confirm service completion.
          </p>
        </div>
      </div>

      {/* Contact Provider */}
      <div className="mt-2 px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30">
        <button
          onClick={handleContactProvider}
          disabled={contacting || !service.provider_id}
          className="w-full border border-[#1E3A8A] text-[#1E3A8A] py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {contacting
            ? <><Loader2 className="w-5 h-5 animate-spin" />Starting chat...</>
            : <><MessageCircle className="w-5 h-5" />Contact Provider</>
          }
        </button>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg border-t border-white/20 p-4">
        <button
          onClick={handleBooking}
          disabled={booking}
          className="w-full bg-[#10B981] text-white py-4 rounded-xl hover:bg-[#0d9668] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {booking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            `Book Now - ${paymentMethod === "fiat" ? `£${finalPrice.toFixed(2)}` : `Ł${finalPrice.toFixed(2)}`}`
          )}
        </button>
      </div>
    </div>
  );
}

