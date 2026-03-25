import { useEffect, useState } from "react";
import { Loader2, Users, Briefcase, DollarSign, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "../../../lib/supabase";

interface AnalyticsData {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  totalRevenuePence: number;
  totalRevenueLeus: number;
  monthlyBookings: { month: string; count: number }[];
  bookingsByCategory: { category: string; count: number }[];
}

export function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    void fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

      const [
        { count: totalUsers, error: usersError },
        { count: totalProviders, error: providersError },
        { data: bookingRows, error: bookingsError },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .in("role", ["provider", "local_business"]),
        supabase
          .from("bookings")
          .select("id, created_at, status, payment_method, amount_pence, amount_leus, listings(category)")
          .order("created_at", { ascending: true }),
      ]);

      if (usersError) throw usersError;
      if (providersError) throw providersError;
      if (bookingsError) throw bookingsError;

      const bookings = bookingRows || [];
      const completedBookings = bookings.filter((booking: any) => booking.status === "completed");
      const recentBookings = bookings.filter(
        (booking: any) => new Date(booking.created_at).getTime() >= sixMonthsAgo.getTime()
      );

      const monthlyMap = new Map<string, number>();
      recentBookings.forEach((booking: any) => {
        const month = new Date(booking.created_at).toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
      });

      const categoryMap = new Map<string, number>();
      bookings.forEach((booking: any) => {
        const category = booking.listings?.category || "Uncategorized";
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });

      const totalRevenuePence = completedBookings.reduce((sum: number, booking: any) => {
        return sum + (booking.payment_method === "fiat" ? booking.amount_pence || 0 : 0);
      }, 0);

      const totalRevenueLeus = completedBookings.reduce((sum: number, booking: any) => {
        return sum + (booking.payment_method === "leus" ? Number(booking.amount_leus || 0) : 0);
      }, 0);

      setData({
        totalUsers: totalUsers || 0,
        totalProviders: totalProviders || 0,
        totalBookings: bookings.length,
        totalRevenuePence,
        totalRevenueLeus,
        monthlyBookings: Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count })),
        bookingsByCategory: Array.from(categoryMap.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500">Failed to load analytics.</div>;
  }

  const COLORS = ["#1E3A8A", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold">{data.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-[#1E3A8A] opacity-50" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Providers</p>
              <p className="text-2xl font-bold">{data.totalProviders}</p>
            </div>
            <Briefcase className="h-8 w-8 text-[#10B981] opacity-50" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Bookings</p>
              <p className="text-2xl font-bold">{data.totalBookings}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-[#F59E0B] opacity-50" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Fiat Revenue</p>
              <p className="text-2xl font-bold">£{(data.totalRevenuePence / 100).toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-[#EF4444] opacity-50" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">LEUS Revenue</p>
              <p className="text-2xl font-bold">ᛃ{data.totalRevenueLeus.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-[#7C3AED] opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-800">Monthly Bookings</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthlyBookings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#1E3A8A" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-800">Bookings by Category</h3>
          {data.bookingsByCategory.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
              No booking category data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.bookingsByCategory}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label
                >
                  {data.bookingsByCategory.map((entry, index) => (
                    <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-800">Top Categories</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.bookingsByCategory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
