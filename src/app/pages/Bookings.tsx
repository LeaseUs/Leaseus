import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader2, ChevronRight, Star, MessageCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  disputed: "bg-orange-100 text-orange-700",
};

const STATUS_ICONS: Record<string, any> = {
  pending: AlertCircle,
  confirmed: Clock,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: XCircle,
  disputed: AlertCircle,
};

export function Bookings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, role, avg_rating")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      const isProvider = profileData?.role === "provider" || profileData?.role === "local_business";

      // Fetch bookings based on role
      const query = supabase
        .from("bookings")
        .select(`
          id, title, description, scheduled_at, status,
          payment_method, amount_pence, amount_leus,
          platform_fee_pence, escrow_held, escrow_released,
          client_id, provider_id,
          profiles!client_id(full_name, avatar_url),
          listings(title, listing_images(url, is_primary))
        `)
        .order("created_at", { ascending: false });

      if (isProvider) {
        query.eq("provider_id", user.id);
      } else {
        query.eq("client_id", user.id);
      }

      const { data: bookingData } = await query;
      setBookings(bookingData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", cancellation_reason: "Declined by provider" })
        .eq("id", bookingId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.rpc("release_escrow", {
        p_booking_id: bookingId,
        p_released_by: user!.id,
      });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", cancellation_reason: "Cancelled by client" })
        .eq("id", bookingId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const isProvider = profile?.role === "provider" || profile?.role === "local_business";

  const activeStatuses = ["pending", "confirmed", "in_progress"];
  const completedStatuses = ["completed", "cancelled", "disputed"];

  const filteredBookings = bookings.filter(b =>
    activeTab === "active"
      ? activeStatuses.includes(b.status)
      : completedStatuses.includes(b.status)
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const formatAmount = (b: any) =>
    b.payment_method === "fiat"
      ? `£${(b.amount_pence / 100).toFixed(2)}`
      : `Ł${Number(b.amount_leus).toFixed(2)}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-xl text-white mb-1">
          {isProvider ? "Booking Requests" : "My Bookings"}
        </h1>
        <p className="text-white/70 text-sm">
          {isProvider ? "Manage incoming service requests" : "Track and manage your bookings"}
        </p>

        {/* Stats row */}
        <div className="flex gap-3 mt-4">
          {isProvider ? (
            <>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
                <p className="text-white text-lg font-bold">{bookings.filter(b => b.status === "pending").length}</p>
                <p className="text-white/70 text-xs">Pending</p>
              </div>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
                <p className="text-white text-lg font-bold">{bookings.filter(b => b.status === "confirmed" || b.status === "in_progress").length}</p>
                <p className="text-white/70 text-xs">Active</p>
              </div>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
                <p className="text-white text-lg font-bold">{bookings.filter(b => b.status === "completed").length}</p>
                <p className="text-white/70 text-xs">Completed</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
                <p className="text-white text-lg font-bold">{bookings.filter(b => activeStatuses.includes(b.status)).length}</p>
                <p className="text-white/70 text-xs">Active</p>
              </div>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
                <p className="text-white text-lg font-bold">{bookings.filter(b => b.status === "completed").length}</p>
                <p className="text-white/70 text-xs">Completed</p>
              </div>
              <div className="flex-1 bg-white/20 rounded-xl p-3 text-center">
                <p className="text-white text-lg font-bold">{bookings.filter(b => b.escrow_held && !b.escrow_released).length}</p>
                <p className="text-white/70 text-xs">In Escrow</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex bg-white/80 backdrop-blur-md rounded-xl p-1 border border-white/30">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "active" ? "bg-[#1E3A8A] text-white" : "text-gray-600"}`}
          >
            {isProvider ? "Requests" : "Active"}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "completed" ? "bg-[#1E3A8A] text-white" : "text-gray-600"}`}
          >
            History
          </button>
        </div>
      </div>

      {/* Bookings List */}
      <div className="px-4 mt-4 space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-8 text-center border border-white/30">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {activeTab === "active"
                ? isProvider ? "No pending requests" : "No active bookings"
                : "No booking history yet"}
            </p>
            {!isProvider && activeTab === "active" && (
              <button onClick={() => navigate("/home/services")}
                className="mt-4 bg-[#1E3A8A] text-white px-6 py-2 rounded-xl text-sm hover:bg-[#152d6b] transition-colors">
                Browse Services
              </button>
            )}
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const StatusIcon = STATUS_ICONS[booking.status] || AlertCircle;
            const isLoading = actionLoading === booking.id;

            return (
              <div key={booking.id} className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/30 overflow-hidden">
                {/* Booking Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-800">{booking.title}</h3>
                      {isProvider && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Client: {booking.profiles?.full_name || "Unknown"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[booking.status]}`}>
                        {booking.status.replace("_", " ")}
                      </span>
                      <span className="text-sm font-semibold text-[#1E3A8A]">{formatAmount(booking)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {booking.scheduled_at ? formatDate(booking.scheduled_at) : "TBD"}
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {booking.payment_method === "leus" ? "LEUS payment" : "GBP payment"}
                    </div>
                  </div>

                  {/* Escrow badge */}
                  {booking.escrow_held && !booking.escrow_released && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit">
                      <CheckCircle className="w-3 h-3" />
                      Payment in escrow
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="px-4 pb-4">
                  {/* Provider actions */}
                  {isProvider && booking.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(booking.id)} disabled={isLoading}
                        className="flex-1 bg-[#10B981] text-white py-2.5 rounded-xl text-sm hover:bg-[#0d9668] transition-colors flex items-center justify-center gap-1 disabled:opacity-70">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Accept
                      </button>
                      <button onClick={() => handleDecline(booking.id)} disabled={isLoading}
                        className="flex-1 border border-red-300 text-red-500 py-2.5 rounded-xl text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-1 disabled:opacity-70">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Decline
                      </button>
                    </div>
                  )}

                  {isProvider && booking.status === "confirmed" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleComplete(booking.id)} disabled={isLoading}
                        className="flex-1 bg-[#1E3A8A] text-white py-2.5 rounded-xl text-sm hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-1 disabled:opacity-70">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Mark Complete
                      </button>
                      <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        <MessageCircle className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  )}

                  {/* Client actions */}
                  {!isProvider && booking.status === "pending" && (
                    <button onClick={() => handleCancel(booking.id)} disabled={isLoading}
                      className="w-full border border-red-300 text-red-500 py-2.5 rounded-xl text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-1 disabled:opacity-70">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Cancel Booking
                    </button>
                  )}

                  {!isProvider && booking.status === "confirmed" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleComplete(booking.id)} disabled={isLoading}
                        className="flex-1 bg-[#10B981] text-white py-2.5 rounded-xl text-sm hover:bg-[#0d9668] transition-colors flex items-center justify-center gap-1 disabled:opacity-70">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Confirm Complete
                      </button>
                      <button className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        <MessageCircle className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  )}

                  {/* Leave review for completed */}
                  {!isProvider && booking.status === "completed" && (
                    <button className="w-full flex items-center justify-center gap-2 border border-[#1E3A8A] text-[#1E3A8A] py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                      <Star className="w-4 h-4" />
                      Leave a Review
                    </button>
                  )}

                  {/* View details */}
                  {["completed", "cancelled"].includes(booking.status) && (
                    <button className="w-full flex items-center justify-center gap-2 text-gray-500 text-sm mt-2">
                      View Details <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
