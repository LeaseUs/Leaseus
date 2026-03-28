import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type EscrowBooking = {
  id: string;
  title: string | null;
  status: string;
  payment_method: "fiat" | "leus";
  amount_pence: number | null;
  amount_leus: number | null;
  deposit_pence: number | null;
  deposit_leus: number | null;
  escrow_held: boolean | null;
  escrow_released: boolean | null;
  scheduled_at: string | null;
  client_id: string;
  provider_id: string;
  client: { full_name: string | null; email: string | null } | null;
  provider: { full_name: string | null; email: string | null } | null;
};

export function EscrowTab() {
  const [bookings, setBookings] = useState<EscrowBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"held" | "released" | "disputed">("held");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("bookings")
        .select(`
          id, title, status, payment_method, amount_pence, amount_leus,
          deposit_pence, deposit_leus, escrow_held, escrow_released, scheduled_at,
          client_id, provider_id,
          client:profiles!client_id(full_name, email),
          provider:profiles!provider_id(full_name, email)
        `)
        .order("scheduled_at", { ascending: false });

      if (filter === "held") {
        query = query.eq("escrow_held", true).eq("escrow_released", false).neq("status", "completed");
      } else if (filter === "released") {
        query = query.eq("escrow_released", true);
      } else {
        query = query.eq("status", "disputed");
      }

      const { data, error } = await query;
      if (error) throw error;
      setBookings((data || []) as EscrowBooking[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load escrow bookings.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const creditBookingAmount = async (userId: string, amountPence: number, amountLeus: number) => {
    const { data: wallet, error: walletError } = await supabase
      .from("profiles")
      .select("fiat_balance_pence, leus_balance")
      .eq("id", userId)
      .single();
    if (walletError) throw walletError;

    const updates: Record<string, number> = {};
    if (amountPence !== 0) updates.fiat_balance_pence = (wallet.fiat_balance_pence || 0) + amountPence;
    if (amountLeus !== 0) updates.leus_balance = Number(wallet.leus_balance || 0) + amountLeus;
    if (Object.keys(updates).length === 0) return;

    const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", userId);
    if (updateError) throw updateError;
  };

  const handleReleaseEscrow = async (booking: EscrowBooking) => {
    setActionLoading(booking.id);
    setError("");
    setSuccess("");
    let settledFiat = 0;
    let settledLeus = 0;

    try {
      if (booking.payment_method === "fiat" && booking.amount_pence) {
        const remaining = Math.round((booking.amount_pence || 0) - (booking.deposit_pence || 0));
        const { data: clientWallet, error: clientError } = await supabase
          .from("profiles")
          .select("fiat_balance_pence")
          .eq("id", booking.client_id)
          .single();
        if (clientError) throw clientError;
        if ((clientWallet?.fiat_balance_pence || 0) < remaining) {
          throw new Error("Client does not have enough GBP balance to release this escrow.");
        }

        const { error: deductError } = await supabase
          .from("profiles")
          .update({ fiat_balance_pence: (clientWallet?.fiat_balance_pence || 0) - remaining })
          .eq("id", booking.client_id);
        if (deductError) throw deductError;

        await creditBookingAmount(booking.provider_id, booking.amount_pence || 0, 0);
        settledFiat = remaining;
      } else if (booking.payment_method === "leus" && booking.amount_leus) {
        const remainingLeus = Number((Number(booking.amount_leus || 0) - Number(booking.deposit_leus || 0)).toFixed(2));
        const { data: clientWallet, error: clientError } = await supabase
          .from("profiles")
          .select("leus_balance")
          .eq("id", booking.client_id)
          .single();
        if (clientError) throw clientError;
        if (Number(clientWallet?.leus_balance || 0) < remainingLeus) {
          throw new Error("Client does not have enough LEUS balance to release this escrow.");
        }

        const { error: deductError } = await supabase
          .from("profiles")
          .update({ leus_balance: Number(clientWallet?.leus_balance || 0) - remainingLeus })
          .eq("id", booking.client_id);
        if (deductError) throw deductError;

        await creditBookingAmount(booking.provider_id, 0, Number(booking.amount_leus || 0));
        settledLeus = remainingLeus;
      }

      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          escrow_held: true,
          escrow_released: true,
        })
        .eq("id", booking.id);
      if (bookingError) {
        if (settledFiat > 0) {
          await creditBookingAmount(booking.client_id, settledFiat, 0);
          await creditBookingAmount(booking.provider_id, -(booking.amount_pence || 0), 0);
        }
        if (settledLeus > 0) {
          await creditBookingAmount(booking.client_id, 0, settledLeus);
          await creditBookingAmount(booking.provider_id, 0, -Number(booking.amount_leus || 0));
        }
        throw bookingError;
      }

      setSuccess(`Escrow released for ${booking.title || "booking"} .`);
      await fetchBookings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to release escrow.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkDisputed = async (booking: EscrowBooking) => {
    setActionLoading(booking.id);
    setError("");
    setSuccess("");
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "disputed", escrow_held: true, escrow_released: false })
        .eq("id", booking.id);
      if (error) throw error;
      setSuccess(`Booking ${booking.title || booking.id.slice(0, 8)} marked as disputed.`);
      await fetchBookings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update escrow status.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatAmount = (booking: EscrowBooking) =>
    booking.payment_method === "fiat"
      ? `£${((booking.amount_pence || 0) / 100).toFixed(2)}`
      : `ᛃ${Number(booking.amount_leus || 0).toFixed(2)}`;

  const formatDeposit = (booking: EscrowBooking) =>
    booking.payment_method === "fiat"
      ? `£${((booking.deposit_pence || 0) / 100).toFixed(2)}`
      : `ᛃ${Number(booking.deposit_leus || 0).toFixed(2)}`;

  const stats = useMemo(() => ({
    held: bookings.filter((booking) => booking.escrow_held && !booking.escrow_released).length,
    released: bookings.filter((booking) => booking.escrow_released).length,
    disputed: bookings.filter((booking) => booking.status === "disputed").length,
  }), [bookings]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Escrow Control</h2>
            <p className="text-sm text-slate-500">View held funds, release escrow, or move bookings into dispute.</p>
          </div>
          <div className="flex items-center gap-2">
            {(["held", "released", "disputed"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-colors ${
                  filter === value ? "bg-[#1E3A8A] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {value}
              </button>
            ))}
            <button
              onClick={() => void fetchBookings()}
              className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              aria-label="Refresh escrow"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-slate-200/60 backdrop-blur">
          <p className="text-sm text-slate-500">Held</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{stats.held}</p>
        </div>
        <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-slate-200/60 backdrop-blur">
          <p className="text-sm text-slate-500">Released</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.released}</p>
        </div>
        <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-slate-200/60 backdrop-blur">
          <p className="text-sm text-slate-500">Disputed</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">{stats.disputed}</p>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-10 text-center shadow-lg shadow-slate-200/60 backdrop-blur">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">No escrow bookings in this view.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{booking.title || "Booking"}</h3>
                  <p className="text-sm text-slate-500">
                    {booking.client?.full_name || "Unknown client"} to {booking.provider?.full_name || "Unknown provider"}
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {booking.status.replace("_", " ")}
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
                  <p className="font-semibold text-slate-800">{formatAmount(booking)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Deposit Held</p>
                  <p className="font-semibold text-slate-800">{formatDeposit(booking)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Payment</p>
                  <p className="font-semibold capitalize text-slate-800">{booking.payment_method}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Scheduled</p>
                  <p className="font-semibold text-slate-800">{booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : "N/A"}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!booking.escrow_released && booking.status !== "completed" && (
                  <button
                    onClick={() => void handleReleaseEscrow(booking)}
                    disabled={actionLoading === booking.id}
                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-70"
                  >
                    {actionLoading === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="inline-flex items-center gap-1"><CheckCircle className="h-4 w-4" />Release Escrow</span>}
                  </button>
                )}
                {booking.status !== "disputed" && !booking.escrow_released && (
                  <button
                    onClick={() => void handleMarkDisputed(booking)}
                    disabled={actionLoading === booking.id}
                    className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-70"
                  >
                    <span className="inline-flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Mark Disputed</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
