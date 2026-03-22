import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Calendar, Clock, CheckCircle, XCircle, AlertCircle,
  Loader2, Star, MessageCircle, RefreshCw, ChevronDown, ChevronUp, Shield, X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-700",
  confirmed:   "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-700",
  disputed:    "bg-orange-100 text-orange-700",
};

const STATUS_ICONS: Record<string, any> = {
  pending: AlertCircle, confirmed: Clock, in_progress: Clock,
  completed: CheckCircle, cancelled: XCircle, disputed: AlertCircle,
};

export function Bookings() {
  const navigate = useNavigate();
  const [profile, setProfile]               = useState<any>(null);
  const [bookings, setBookings]             = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState<"active" | "completed" | "escrow">("active");
  const [actionLoading, setActionLoading]   = useState<string | null>(null);
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [showReviewId, setShowReviewId]     = useState<string | null>(null);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [reviewRating, setReviewRating]     = useState(5);
  const [reviewBody, setReviewBody]         = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, role, avg_rating, loyalty_points, fiat_balance_pence, leus_balance")
        .eq("id", user.id).single();
      setProfile(profileData);
      const isProvider = profileData?.role === "provider" || profileData?.role === "local_business";
      let query = supabase.from("bookings").select(`
        id, title, description, scheduled_at, status,
        payment_method, amount_pence, amount_leus,
        deposit_pence, deposit_leus, deposit_held,
        cancellation_fee_pence, cancelled_by,
        escrow_held, escrow_released,
        reschedule_date, reschedule_time, reschedule_status,
        client_id, provider_id,
        client:profiles!client_id(id, full_name, avatar_url, business_lat, business_lng),
        provider:profiles!provider_id(id, full_name, avatar_url),
        listings(id, title, listing_images(url, is_primary))
      `).order("created_at", { ascending: false });
      query = isProvider ? query.eq("provider_id", user.id).in("status", ["pending", "confirmed", "in_progress"]) : query.eq("client_id", user.id);
      const { data: bookingData, error } = await query;
      if (error) console.error("Bookings fetch error:", error.message);
      setBookings(bookingData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleOpenChat = async (booking: any) => {
    try {
      const { data: existing } = await supabase.from("conversations").select("id")
        .eq("client_id", booking.client_id).eq("provider_id", booking.provider_id).maybeSingle();
      if (existing) { navigate(`/home/conversation/${existing.id}`); return; }
      const { data: newConv, error } = await supabase.from("conversations")
        .insert({ client_id: booking.client_id, provider_id: booking.provider_id, last_message_at: new Date().toISOString() })
        .select("id").single();
      if (error) throw error;
      navigate(`/home/conversation/${newConv.id}`);
    } catch (err) { console.error(err); }
  };

  const handleSubmitReview = async (booking: any) => {
    setSubmittingReview(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("reviews").insert({
        booking_id: booking.id, reviewer_id: user.id, reviewee_id: booking.provider_id,
        listing_id: booking.listings?.id || null, rating: reviewRating, body: reviewBody,
        status: "pending", paid_with_leus: booking.payment_method === "leus",
      });
      if (error) throw error;
      const { data: reviews } = await supabase.from("reviews").select("rating").eq("reviewee_id", booking.provider_id);
      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length;
        await supabase.from("profiles").update({ avg_rating: Math.round(avg * 10) / 10, total_reviews: reviews.length }).eq("id", booking.provider_id);
      }
      setShowReviewId(null); setReviewBody(""); setReviewRating(5);
      alert("Review submitted! ⭐");
    } catch (err: any) { alert(err.message || "Failed to submit review."); }
    finally { setSubmittingReview(false); }
  };

  const handleAccept = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);
      if (error) throw error;
      fetchData();
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  };

  const handleDecline = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if ((booking?.deposit_pence || 0) > 0) {
        const { data: cp } = await supabase.from("profiles").select("fiat_balance_pence").eq("id", booking.client_id).single();
        if (cp) await supabase.from("profiles").update({ fiat_balance_pence: (cp.fiat_balance_pence || 0) + booking.deposit_pence }).eq("id", booking.client_id);
      }
      await supabase.from("bookings").update({ status: "cancelled", cancelled_by: "provider", cancellation_reason: "Declined by provider" }).eq("id", bookingId);
      fetchData();
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  };

  const handleClientCancel = async (bookingId: string) => {
    if (!window.confirm("A 10% cancellation fee applies. 40% of your deposit will be refunded. Continue?")) return;
    setActionLoading(bookingId);
    try {
      const booking = bookings.find(b => b.id === bookingId);
      const depositPence = booking?.deposit_pence || 0;
      const refundPence  = Math.round(depositPence * 0.8);
      const feePence     = depositPence - refundPence;
      if (depositPence > 0) {
        const { data: cp } = await supabase.from("profiles").select("fiat_balance_pence").eq("id", booking.client_id).single();
        if (cp) await supabase.from("profiles").update({ fiat_balance_pence: (cp.fiat_balance_pence || 0) + refundPence }).eq("id", booking.client_id);
      }
      await supabase.from("bookings").update({ status: "cancelled", cancelled_by: "client", cancellation_fee_pence: feePence, cancellation_reason: "Cancelled by client" }).eq("id", bookingId);
      fetchData();
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  };

  const handleProviderCancel = async (bookingId: string) => {
    if (!window.confirm("Cancel this booking? Client will get a full refund and you will lose 10 loyalty points.")) return;
    setActionLoading(bookingId);
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if ((booking?.deposit_pence || 0) > 0) {
        const { data: cp } = await supabase.from("profiles").select("fiat_balance_pence").eq("id", booking.client_id).single();
        if (cp) await supabase.from("profiles").update({ fiat_balance_pence: (cp.fiat_balance_pence || 0) + booking.deposit_pence }).eq("id", booking.client_id);
      }
      const { data: pp } = await supabase.from("profiles").select("loyalty_points").eq("id", profile.id).single();
      if (pp) await supabase.from("profiles").update({ loyalty_points: Math.max(0, (pp.loyalty_points || 0) - 10) }).eq("id", profile.id);
      await supabase.from("bookings").update({ status: "cancelled", cancelled_by: "provider", cancellation_reason: "Cancelled by provider" }).eq("id", bookingId);
      fetchData();
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  };

  const handleProviderNavigate = (booking: any) => {
    if (!booking?.id) {
      alert("Invalid booking. Cannot start navigation.");
      return;
    }
    navigate(`/home/navigation/${booking.id}`);
  };

  const handleComplete = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking?.payment_method === "fiat" && booking?.amount_pence) {
        const remaining = Math.round(booking.amount_pence * 0.5);
        const { data: cp } = await supabase.from("profiles").select("fiat_balance_pence").eq("id", booking.client_id).single();
        if (cp && (cp.fiat_balance_pence || 0) >= remaining) {
          await supabase.from("profiles").update({ fiat_balance_pence: (cp.fiat_balance_pence || 0) - remaining }).eq("id", booking.client_id);
          const { data: pp } = await supabase.from("profiles").select("fiat_balance_pence").eq("id", booking.provider_id).single();
          if (pp) await supabase.from("profiles").update({ fiat_balance_pence: (pp.fiat_balance_pence || 0) + booking.amount_pence }).eq("id", booking.provider_id);
        }
      }
      await supabase.from("bookings").update({ status: "completed", completed_at: new Date().toISOString(), escrow_released: true }).eq("id", bookingId);
      fetchData();
    } catch (err) { console.error(err); } finally { setActionLoading(null); }
  };

  const isProvider        = profile?.role === "provider" || profile?.role === "local_business";
  const activeStatuses    = ["pending", "confirmed", "in_progress"];
  const completedStatuses = ["completed", "cancelled", "disputed"];
  const escrowBookings    = bookings.filter(b => b.deposit_held && !completedStatuses.includes(b.status));
  const filteredBookings  = activeTab === "escrow" ? escrowBookings : bookings.filter(b => activeTab === "active" ? activeStatuses.includes(b.status) : completedStatuses.includes(b.status));
  const formatDate        = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const formatAmount      = (b: any) => b.payment_method === "fiat" ? `£${((b.amount_pence || 0) / 100).toFixed(2)}` : `<span className="leus">ᛃ</span>${Number(b.amount_leus || 0).toFixed(2)}`;
  const formatDeposit     = (b: any) => b.payment_method === "fiat" ? `£${((b.deposit_pence || 0) / 100).toFixed(2)}` : `<span className="leus">ᛃ</span>${Number(b.deposit_leus || 0).toFixed(2)}`;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" /></div>;

  return (
    <div className="min-h-screen pb-6">
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-xl text-white mb-1">{isProvider ? "Booking Requests" : "My Bookings"}</h1>
        <p className="text-white/70 text-sm">{isProvider ? "Manage incoming service requests" : "Track your bookings"}</p>
        <div className="flex gap-3 mt-4">
          {isProvider ? (
            <>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center"><p className="text-white text-lg font-bold">{bookings.filter(b => b.status === "pending").length}</p><p className="text-white/70 text-xs">Pending</p></div>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center"><p className="text-white text-lg font-bold">{bookings.filter(b => ["confirmed","in_progress"].includes(b.status)).length}</p><p className="text-white/70 text-xs">Active</p></div>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center"><p className="text-white text-lg font-bold">{bookings.filter(b => b.status === "completed").length}</p><p className="text-white/70 text-xs">Completed</p></div>
            </>
          ) : (
            <>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center"><p className="text-white text-lg font-bold">{bookings.filter(b => activeStatuses.includes(b.status)).length}</p><p className="text-white/70 text-xs">Active</p></div>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center"><p className="text-white text-lg font-bold">{bookings.filter(b => b.status === "completed").length}</p><p className="text-white/70 text-xs">Completed</p></div>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center"><p className="text-white text-lg font-bold">{bookings.filter(b => b.deposit_held).length}</p><p className="text-white/70 text-xs">In Escrow</p></div>
            </>
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        {isProvider ? (
          <div className="flex bg-white/80 backdrop-blur-md rounded-xl p-1 border border-white/30">
            <button onClick={() => setActiveTab("active")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "active" ? "bg-[#1E3A8A] text-white" : "text-gray-600"}`}>Requests</button>
            <button onClick={() => setActiveTab("completed")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "completed" ? "bg-[#1E3A8A] text-white" : "text-gray-600"}`}>History</button>
          </div>
        ) : (
          <div className="flex bg-white/80 backdrop-blur-md rounded-xl p-1 border border-white/30">
            <button onClick={() => setActiveTab("active")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "active" ? "bg-[#1E3A8A] text-white" : "text-gray-600"}`}>Active</button>
            <button onClick={() => setActiveTab("completed")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "completed" ? "bg-[#1E3A8A] text-white" : "text-gray-600"}`}>History</button>
            <button onClick={() => setActiveTab("escrow")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "escrow" ? "bg-[#1E3A8A] text-white" : "text-gray-600"}`}>
              <span className="flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" />Escrow
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 text-center border border-white/30">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">{activeTab === "active" ? isProvider ? "No pending requests" : "No active bookings" : activeTab === "escrow" ? "No escrow funds held" : "No booking history yet"}</p>
            {!isProvider && activeTab === "active" && <button onClick={() => navigate("/home/services")} className="mt-4 bg-[#1E3A8A] text-white px-6 py-2 rounded-xl text-sm">Browse Services</button>}
          </div>
        ) : filteredBookings.map((booking) => {
          const StatusIcon = STATUS_ICONS[booking.status] || AlertCircle;
          const isLoading  = actionLoading === booking.id;
          const isExpanded = expandedId === booking.id;

          return (
            <div key={booking.id} className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/30 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-800">{booking.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{isProvider ? `Client: ${booking.client?.full_name || "Unknown"}` : `Provider: ${booking.provider?.full_name || "Unknown"}`}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[booking.status]}`}>{booking.status.replace("_", " ")}</span>
                    <span className="text-sm font-semibold text-[#1E3A8A]">{formatAmount(booking)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{booking.scheduled_at ? formatDate(booking.scheduled_at) : "TBD"}</div>
                  <div className="flex items-center gap-1"><StatusIcon className="w-3 h-3" />{booking.payment_method === "leus" ? "LEUS" : "GBP"}</div>
                </div>
                {booking.deposit_held && booking.status !== "cancelled" && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit mb-2">
                    <CheckCircle className="w-3 h-3" />Deposit held: {formatDeposit(booking)}
                  </div>
                )}
                {booking.reschedule_status === "pending" && booking.reschedule_date && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg w-fit mb-2">
                    <RefreshCw className="w-3 h-3" />Reschedule: {booking.reschedule_date} {booking.reschedule_time}
                  </div>
                )}
                {booking.status === "cancelled" && booking.cancelled_by && (
                  <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg w-fit mb-2">
                    <XCircle className="w-3 h-3" />Cancelled by {booking.cancelled_by}{booking.cancellation_fee_pence > 0 && ` · fee: £${(booking.cancellation_fee_pence / 100).toFixed(2)}`}
                  </div>
                )}
              </div>

              <div className="px-4 pb-4 space-y-2">
                {/* Provider: pending */}
                {isProvider && booking.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAccept(booking.id)} disabled={isLoading} className="flex-1 bg-[#10B981] text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 disabled:opacity-70">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Accept
                    </button>
                    <button onClick={() => handleOpenChat(booking)} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" title="Message client">
                      <MessageCircle className="w-4 h-4 text-[#1E3A8A]" />
                    </button>
                    <button onClick={() => handleDecline(booking.id)} disabled={isLoading} className="flex-1 border border-red-300 text-red-500 py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 disabled:opacity-70">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Decline
                    </button>
                  </div>
                )}

                {/* Provider: confirmed */}
                {isProvider && booking.status === "confirmed" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleProviderNavigate(booking)} className="flex-1 bg-[#10B981] text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-[#0f8f69] transition-colors">
                      <MapPin className="w-4 h-4" />Navigate
                    </button>
                    <button onClick={() => handleComplete(booking.id)} disabled={isLoading} className="flex-1 bg-[#1E3A8A] text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 disabled:opacity-70">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Mark Complete
                    </button>
                    <button onClick={() => handleOpenChat(booking)} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" title="Message client">
                      <MessageCircle className="w-4 h-4 text-[#1E3A8A]" />
                    </button>
                    <button onClick={() => handleProviderCancel(booking.id)} disabled={isLoading} className="p-2.5 border border-red-200 rounded-xl hover:bg-red-50 transition-colors" title="Cancel booking">
                      <XCircle className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                )}

                {/* Client: pending */}
                {!isProvider && booking.status === "pending" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 text-center">Waiting for provider to confirm</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenChat(booking)} className="flex-1 border border-[#1E3A8A] text-[#1E3A8A] py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-blue-50 transition-colors">
                        <MessageCircle className="w-4 h-4" />Message Provider
                      </button>
                      <button onClick={() => handleClientCancel(booking.id)} disabled={isLoading} className="flex-1 border border-red-300 text-red-500 py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 disabled:opacity-70">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Client: confirmed */}
                {!isProvider && booking.status === "confirmed" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleComplete(booking.id)} disabled={isLoading} className="flex-1 bg-[#10B981] text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 disabled:opacity-70">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Confirm Complete
                    </button>
                    <button onClick={() => handleOpenChat(booking)} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <MessageCircle className="w-4 h-4 text-[#1E3A8A]" />
                    </button>
                    <button onClick={() => handleClientCancel(booking.id)} disabled={isLoading} className="p-2.5 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                      <XCircle className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                )}

                {/* Client: leave review */}
                {!isProvider && booking.status === "completed" && (
                  <div className="space-y-2">
                    {showReviewId === booking.id ? (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700">Rate this service</p>
                          <button onClick={() => setShowReviewId(null)}><XCircle className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(star => (
                            <button key={star} onClick={() => setReviewRating(star)}>
                              <Star className={`w-7 h-7 ${star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                            </button>
                          ))}
                        </div>
                        <textarea value={reviewBody} onChange={e => setReviewBody(e.target.value)} placeholder="Share your experience..." rows={3}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none" />
                        <button onClick={() => handleSubmitReview(booking)} disabled={submittingReview}
                          className="w-full bg-[#1E3A8A] text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70">
                          {submittingReview ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Star className="w-4 h-4" />Submit Review</>}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setShowReviewId(booking.id)}
                        className="w-full flex items-center justify-center gap-2 border border-[#1E3A8A] text-[#1E3A8A] py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-colors">
                        <Star className="w-4 h-4" />Leave a Review
                      </button>
                    )}
                  </div>
                )}

                {/* View Details — all statuses */}
                <button onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                  className="w-full flex items-center justify-center gap-2 text-gray-500 text-sm py-1 hover:text-gray-700 transition-colors">
                  {isExpanded ? <><ChevronUp className="w-4 h-4" />Hide Details</> : <><ChevronDown className="w-4 h-4" />View Details</>}
                </button>

                {isExpanded && (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between"><span className="text-gray-400">Booking ID</span><span className="font-mono text-gray-700">{booking.id.slice(0,8)}...</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Service</span><span className="font-medium text-gray-700">{booking.title}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Scheduled</span><span>{booking.scheduled_at ? formatDate(booking.scheduled_at) : "TBD"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Total</span><span>{formatAmount(booking)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Deposit paid</span><span>{formatDeposit(booking)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Payment method</span><span className="capitalize">{booking.payment_method}</span></div>
                    {activeTab === "escrow" && booking.deposit_held && (
                      <>
                        <div className="pt-2 border-t border-gray-200 mt-2">
                          <p className="text-gray-400 font-medium mb-2 flex items-center gap-1">
                            <Shield className="w-3 h-3" />Escrow Details
                          </p>
                          <div className="space-y-1 text-gray-600">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Status</span>
                              <span className="font-medium text-blue-600">{booking.escrow_released ? "Released" : "Held"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Amount Secured</span>
                              <span className="font-medium">{formatDeposit(booking)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Will Release On</span>
                              <span>{booking.status === "completed" ? "Released" : "Service completion"}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {booking.description && (
                      <div className="pt-1 border-t border-gray-200">
                        <p className="text-gray-400 mb-1">Notes</p>
                        <p>{booking.description}</p>
                      </div>
                    )}
                    <button onClick={() => handleOpenChat(booking)}
                      className="w-full mt-2 flex items-center justify-center gap-2 bg-[#1E3A8A] text-white py-2 rounded-xl text-xs hover:bg-[#152d6b] transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" />Open Chat with {isProvider ? "Client" : "Provider"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Escrow Details Summary */}
      {!isProvider && activeTab === "escrow" && bookings.length > 0 && (
        <div className="px-4 mt-6 bg-white/80 backdrop-blur-md rounded-xl p-4 border border-white/30 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />Escrow Summary
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-gray-500 mb-1">Total Held</p>
              <p className="font-bold text-blue-600">
                £{(escrowBookings.reduce((sum, b) => sum + (b.deposit_pence || 0), 0) / 100).toFixed(2)}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-gray-500 mb-1">Bookings in Escrow</p>
              <p className="font-bold text-green-600">{escrowBookings.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 border-t border-gray-200 pt-3">
            💡 Escrow funds are held securely and released to providers only after you confirm service completion.
          </p>
        </div>
      )}
    </div>
  );
}






