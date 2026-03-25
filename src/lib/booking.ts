import { supabase } from "./supabase";

export type BookingPaymentMethod = "fiat" | "leus";

interface WalletSnapshot {
  id: string;
  fiat_balance_pence?: number | null;
  leus_balance?: number | null;
}

interface BookingFinancialsInput {
  amountPence: number;
  amountLeus: number;
  paymentMethod: BookingPaymentMethod;
}

interface CreateBookingWithDepositInput {
  user: WalletSnapshot;
  paymentMethod: BookingPaymentMethod;
  listingId: string;
  providerId: string | null;
  title: string;
  description: string;
  scheduledAt: string;
  amountPence: number;
  amountLeus: number;
}

export function getBookingFinancials({
  amountPence,
  amountLeus,
  paymentMethod,
}: BookingFinancialsInput) {
  const depositPence = Math.round(amountPence * 0.5);
  const chargedLeus = Number((amountLeus * 0.95).toFixed(2));
  const depositLeus = Number((amountLeus * 0.5 * 0.95).toFixed(2));

  return {
    paymentMethod,
    amountPence,
    amountLeus: paymentMethod === "leus" ? chargedLeus : 0,
    depositPence,
    depositLeus,
    platformFeePence: paymentMethod === "fiat" ? Math.round(amountPence * 0.02) : 0,
  };
}

export function ensureSufficientDepositBalance(user: WalletSnapshot, financials: ReturnType<typeof getBookingFinancials>) {
  const currentFiat = user.fiat_balance_pence || 0;
  const currentLeus = Number(user.leus_balance || 0);

  if (financials.paymentMethod === "fiat" && currentFiat < financials.depositPence) {
    throw new Error(
      `Insufficient balance. You need £${(financials.depositPence / 100).toFixed(2)} for the 50% deposit but have £${(currentFiat / 100).toFixed(2)}.`
    );
  }

  if (financials.paymentMethod === "leus" && currentLeus < financials.depositLeus) {
    throw new Error(`Insufficient LEUS balance. You need ᛃ${financials.depositLeus.toFixed(2)} for the 50% deposit.`);
  }
}

async function restoreWalletSnapshot(user: WalletSnapshot) {
  const { error } = await supabase.from("profiles").update({
    fiat_balance_pence: user.fiat_balance_pence || 0,
    leus_balance: Number(user.leus_balance || 0),
  }).eq("id", user.id);
  if (error) throw error;
}

export async function createBookingWithDeposit(input: CreateBookingWithDepositInput) {
  const financials = getBookingFinancials({
    amountPence: input.amountPence,
    amountLeus: input.amountLeus,
    paymentMethod: input.paymentMethod,
  });

  ensureSufficientDepositBalance(input.user, financials);

  const originalWallet = {
    id: input.user.id,
    fiat_balance_pence: input.user.fiat_balance_pence || 0,
    leus_balance: Number(input.user.leus_balance || 0),
  };

  let bookingId: string | null = null;

  try {
    if (financials.paymentMethod === "fiat") {
      const { error: walletError } = await supabase.from("profiles").update({
        fiat_balance_pence: originalWallet.fiat_balance_pence - financials.depositPence,
      }).eq("id", input.user.id);
      if (walletError) throw walletError;
    } else {
      const { error: walletError } = await supabase.from("profiles").update({
        leus_balance: originalWallet.leus_balance - financials.depositLeus,
      }).eq("id", input.user.id);
      if (walletError) throw walletError;
    }

    const { data: booking, error: bookingError } = await supabase.from("bookings").insert({
      listing_id: input.listingId,
      client_id: input.user.id,
      provider_id: input.providerId,
      title: input.title,
      description: input.description,
      scheduled_at: input.scheduledAt,
      status: "pending",
      payment_method: input.paymentMethod,
      amount_pence: input.paymentMethod === "fiat" ? financials.amountPence : null,
      amount_leus: input.paymentMethod === "leus" ? financials.amountLeus : null,
      deposit_pence: input.paymentMethod === "fiat" ? financials.depositPence : 0,
      deposit_leus: input.paymentMethod === "leus" ? financials.depositLeus : 0,
      deposit_held: true,
      platform_fee_pence: financials.platformFeePence,
    }).select("id").single();
    if (bookingError) throw bookingError;
    bookingId = booking.id;

    const { error: walletTxError } = await supabase.from("wallet_transactions").insert({
      user_id: input.user.id,
      type: "booking_deposit",
      fiat_delta_pence: input.paymentMethod === "fiat" ? -financials.depositPence : 0,
      leus_delta: input.paymentMethod === "leus" ? -financials.depositLeus : 0,
      reference: `50% deposit for ${input.title}`,
    });
    if (walletTxError) throw walletTxError;

    return { bookingId, financials };
  } catch (error) {
    if (bookingId) {
      await supabase.from("bookings").delete().eq("id", bookingId);
    }
    await restoreWalletSnapshot(originalWallet);
    throw error;
  }
}
