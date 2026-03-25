import { useEffect, useMemo, useState } from "react";
import { Filter, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface WalletTransaction {
  id: string;
  user_id: string;
  type: string;
  fiat_delta_pence: number;
  leus_delta: number;
  points_delta: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

type FilterMode = "all" | "credit" | "debit";

export function FinancesTab() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select(`
          id, user_id, type, fiat_delta_pence, leus_delta, points_delta, reference, notes, created_at,
          user:profiles!user_id(id, full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as WalletTransaction[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getDirection = (transaction: WalletTransaction) => {
    const total =
      (transaction.fiat_delta_pence || 0) + Number(transaction.leus_delta || 0) + Number(transaction.points_delta || 0);
    return total >= 0 ? "credit" : "debit";
  };

  const formatAmount = (transaction: WalletTransaction) => {
    if (transaction.fiat_delta_pence) {
      const sign = transaction.fiat_delta_pence > 0 ? "+" : "-";
      return `${sign}£${(Math.abs(transaction.fiat_delta_pence) / 100).toFixed(2)}`;
    }
    if (transaction.leus_delta) {
      const sign = transaction.leus_delta > 0 ? "+" : "-";
      return `${sign}ᛃ${Math.abs(Number(transaction.leus_delta)).toFixed(2)}`;
    }
    if (transaction.points_delta) {
      const sign = transaction.points_delta > 0 ? "+" : "-";
      return `${sign}${Math.abs(transaction.points_delta)} pts`;
    }
    return "0";
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const direction = getDirection(transaction);
      if (filter !== "all" && filter !== direction) return false;

      if (!search) return true;
      const needle = search.toLowerCase();
      return (
        transaction.user?.full_name?.toLowerCase().includes(needle) ||
        transaction.user?.email?.toLowerCase().includes(needle) ||
        transaction.reference?.toLowerCase().includes(needle) ||
        transaction.id.toLowerCase().includes(needle) ||
        transaction.notes?.toLowerCase().includes(needle)
      );
    });
  }, [filter, search, transactions]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.fiat_delta_pence > 0) acc.creditPence += transaction.fiat_delta_pence;
        if (transaction.fiat_delta_pence < 0) acc.debitPence += Math.abs(transaction.fiat_delta_pence);
        if (transaction.leus_delta > 0) acc.creditLeus += Number(transaction.leus_delta);
        if (transaction.leus_delta < 0) acc.debitLeus += Math.abs(Number(transaction.leus_delta));
        return acc;
      },
      { creditPence: 0, debitPence: 0, creditLeus: 0, debitLeus: 0 }
    );
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Fiat Credits</p>
          <p className="text-2xl font-bold text-green-600">£{(totals.creditPence / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Fiat Debits</p>
          <p className="text-2xl font-bold text-red-600">£{(totals.debitPence / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">LEUS Credits</p>
          <p className="text-2xl font-bold text-green-600">ᛃ{totals.creditLeus.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">LEUS Debits</p>
          <p className="text-2xl font-bold text-red-600">ᛃ{totals.debitLeus.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === "all" ? "bg-[#1E3A8A] text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("credit")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === "credit" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Credits
          </button>
          <button
            onClick={() => setFilter("debit")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === "debit" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Debits
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, email or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-[#10B981] sm:w-72"
          />
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ref</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Notes</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredTransactions.map((transaction) => {
              const direction = getDirection(transaction);
              return (
                <tr key={transaction.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {transaction.reference || transaction.id.slice(0, 8)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {transaction.user?.full_name || "Unknown"}
                    </div>
                    <div className="text-xs text-gray-500">{transaction.user?.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        direction === "credit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <span className={direction === "credit" ? "text-green-600" : "text-red-600"}>
                      {formatAmount(transaction)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{transaction.notes || "-"}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(transaction.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">No matching transactions found.</div>
        )}
      </div>
    </div>
  );
}
