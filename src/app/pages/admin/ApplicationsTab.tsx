import { useCallback, useEffect, useState } from "react";
import { Building2, CheckCircle, Globe, Loader2, Mail, MapPin, Phone, RefreshCw, User, XCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Application = {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  description: string;
  contact_name: string;
  contact_email: string;
  latitude: number;
  longitude: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason?: string;
};

export function ApplicationsTab() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [selected, setSelected] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("partner_applications")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setApplications(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async (app: Application) => {
    setActionLoading(app.id);
    setError("");
    setSuccess("");
    try {
      const { error: bizError } = await supabase
        .from("local_businesses")
        .insert({
          name: app.name,
          category: app.category,
          address: app.address,
          phone: app.phone,
          website: app.website,
          description: app.description,
          latitude: app.latitude,
          longitude: app.longitude,
          accepts_leus: true,
        });
      if (bizError) throw bizError;

      const { error: updateError } = await supabase
        .from("partner_applications")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", app.id);
      if (updateError) throw updateError;

      setSuccess(`${app.name} approved and added to the map.`);
      setSelected(null);
      setRejectReason("");
      await fetchApplications();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve application.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (app: Application) => {
    if (!rejectReason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }
    setActionLoading(app.id);
    setError("");
    setSuccess("");
    try {
      const { error } = await supabase
        .from("partner_applications")
        .update({ status: "rejected", rejection_reason: rejectReason.trim() })
        .eq("id", app.id);
      if (error) throw error;

      setSuccess(`${app.name} application rejected.`);
      setSelected(null);
      setRejectReason("");
      await fetchApplications();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject application.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">LEUS Partners</h2>
            <p className="text-sm text-slate-500">Review and approve local business partner applications for the map and rewards network.</p>
          </div>
          <div className="flex items-center gap-2">
            {(["pending", "approved", "rejected"] as const).map((value) => (
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
              onClick={() => void fetchApplications()}
              className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              aria-label="Refresh applications"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-10 text-center shadow-lg shadow-slate-200/60 backdrop-blur">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">No {filter} applications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{app.name}</h3>
                  <div className="mt-1 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {app.category}
                  </div>
                </div>
                <span className="text-xs text-slate-400">{formatDate(app.created_at)}</span>
              </div>

              <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{app.address}</div>
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" />{app.contact_name}</div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{app.contact_email}</div>
                {app.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{app.phone}</div>}
                {app.website && (
                  <a href={app.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#1E3A8A] hover:underline">
                    <Globe className="h-4 w-4 text-slate-400" />{app.website}
                  </a>
                )}
                <a
                  href={`https://maps.google.com/?q=${app.latitude},${app.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-[#1E3A8A] hover:underline"
                >
                  <MapPin className="h-4 w-4 text-emerald-500" />View coordinates
                </a>
              </div>

              {app.description && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm italic text-slate-500">
                  "{app.description}"
                </div>
              )}

              {filter === "pending" && (
                <div className="mt-4">
                  {selected?.id === app.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason..."
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelected(null); setRejectReason(""); setError(""); }}
                          className="flex-1 rounded-2xl border border-slate-300 py-2.5 text-sm text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void handleReject(app)}
                          disabled={actionLoading === app.id}
                          className="flex-1 rounded-2xl bg-red-500 py-2.5 text-sm text-white disabled:opacity-70"
                        >
                          {actionLoading === app.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Confirm Reject"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelected(app)}
                        className="flex-1 rounded-2xl border border-red-300 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50"
                      >
                        <span className="inline-flex items-center gap-1"><XCircle className="h-4 w-4" />Reject</span>
                      </button>
                      <button
                        onClick={() => void handleApprove(app)}
                        disabled={actionLoading === app.id}
                        className="flex-1 rounded-2xl bg-emerald-500 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-70"
                      >
                        {actionLoading === app.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <span className="inline-flex items-center gap-1"><CheckCircle className="h-4 w-4" />Approve</span>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {filter === "approved" && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                  <CheckCircle className="h-4 w-4" />Approved
                </div>
              )}

              {filter === "rejected" && (
                <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  <span className="font-semibold">Reason:</span> {app.rejection_reason || "No rejection reason provided."}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
