import { useState, useEffect } from "react";
import { Star, MessageCircle, User, Loader2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

interface Review {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  reviewer?: {
    full_name: string;
    avatar_url?: string;
  };
  reviewee?: {
    full_name: string;
    avatar_url?: string;
  };
  listing?: {
    title: string;
  };
  booking?: {
    payment_method: string;
  };
}

export function Reviews() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<"given" | "received">("received");
  const [providerFilter, setProviderFilter] = useState<string | null>(null);

  const isProvider = profile?.role === "provider" || profile?.role === "local_business";

  useEffect(() => {
    // Check URL parameters for provider filter
    const urlParams = new URLSearchParams(window.location.search);
    const providerId = urlParams.get('provider');
    setProviderFilter(providerId);
    fetchProfileAndReviews(providerId);
  }, [activeTab]);

  const fetchProfileAndReviews = async (providerId: string | null = providerFilter) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(profileData);

      // If provider filter is set, show reviews for that provider only
      if (providerId) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select(`
            id, rating, body, created_at, status,
            reviewer:reviewer_id(full_name, avatar_url),
            reviewee:reviewee_id(full_name, avatar_url),
            listing:listing_id(title),
            booking:booking_id(payment_method)
          `)
          .eq("status", "approved")
          .eq("reviewee_id", providerId)
          .order("created_at", { ascending: false });
        setReviews(reviewsData || []);
        return;
      }

      // Fetch reviews based on user role and active tab
      let query = supabase
        .from("reviews")
        .select(`
          id, rating, body, created_at, status,
          reviewer:reviewer_id(full_name, avatar_url),
          reviewee:reviewee_id(full_name, avatar_url),
          listing:listing_id(title),
          booking:booking_id(payment_method)
        `)
        .eq("status", "approved"); // Only show approved reviews

      if (isProvider && activeTab === "received") {
        query = query.eq("reviewee_id", user.id);
      } else if (!isProvider && activeTab === "given") {
        query = query.eq("reviewer_id", user.id);
      } else if (isProvider && activeTab === "given") {
        query = query.eq("reviewer_id", user.id);
      } else {
        // Client viewing received reviews (though clients don't typically receive reviews)
        query = query.eq("reviewee_id", user.id);
      }

      const { data: reviewsData } = await query.order("created_at", { ascending: false });
      setReviews(reviewsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
      />
    ));
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl text-white">
            {providerFilter ? `${profile?.full_name || 'Provider'}'s Reviews` : "Reviews & Ratings"}
          </h1>
        </div>

        {/* Tab selector - only show if not filtering by provider */}
        {!providerFilter && (
          <div className="flex bg-white/20 backdrop-blur-sm rounded-xl p-1">
            {isProvider ? (
              <>
                <button
                  onClick={() => setActiveTab("received")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "received" ? "bg-white text-[#1E3A8A]" : "text-white"
                  }`}
                >
                  Received ({profile?.total_reviews || 0})
                </button>
                <button
                  onClick={() => setActiveTab("given")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "given" ? "bg-white text-[#1E3A8A]" : "text-white"
                  }`}
                >
                  Given
                </button>
              </>
            ) : (
              <button className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-white text-[#1E3A8A]">
                Reviews Given
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {reviews.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 text-center border border-white/30">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg text-gray-600 mb-2">No reviews yet</h3>
            <p className="text-sm text-gray-500">
              {providerFilter
                ? "This provider hasn't received any reviews yet."
                : activeTab === "received"
                ? "You haven't received any reviews yet."
                : "You haven't given any reviews yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative">
                    {activeTab === "received" ? (
                      review.reviewer?.avatar_url ? (
                        <img
                          src={review.reviewer.avatar_url}
                          alt={review.reviewer.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-[#14B8A6] rounded-full flex items-center justify-center text-white text-sm">
                          {getInitials(review.reviewer?.full_name || "")}
                        </div>
                      )
                    ) : (
                      review.reviewee?.avatar_url ? (
                        <img
                          src={review.reviewee.avatar_url}
                          alt={review.reviewee.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A8A] to-[#10B981] rounded-full flex items-center justify-center text-white text-sm">
                          {getInitials(review.reviewee?.full_name || "")}
                        </div>
                      )
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800">
                        {activeTab === "received" ? review.reviewer?.full_name : review.reviewee?.full_name}
                      </p>
                      <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-xs text-gray-500 ml-1">({review.rating}/5)</span>
                    </div>
                    {review.listing && (
                      <p className="text-xs text-gray-500 mb-2">Service: {review.listing.title}</p>
                    )}
                  </div>
                </div>
                {review.body && (
                  <p className="text-sm text-gray-700 leading-relaxed">{review.body}</p>
                )}
                {review.booking && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-xs text-gray-500">Paid with:</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      review.booking.payment_method === "leus"
                        ? "bg-[#10B981] text-white"
                        : "bg-[#1E3A8A] text-white"
                    }`}>
                      {review.booking.payment_method === "leus" ? "ᛃ LEUS" : "£ GBP"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}