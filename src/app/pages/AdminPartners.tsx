import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, MapPin, Phone, Globe, Mail, User, Building2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminNav } from "../components/AdminNav";

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

export function AdminPartners() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter]             = useState<"pending" | "approved" | "rejected">("pending");
  const [selected, setSelected]         = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const [isAdmin, setIsAdmin]           = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => { checkAdmin(); }, []);
  useEffect(() => { if (isAdmin) fetchApplications(); }, [filter, isAdmin]);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCheckingAdmin(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setIsAdmin(data?.role === "admin");
    } catch { setIsAdmin(false); }
    finally { setCheckingAdmin(false); }
  };

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
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch applications";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { if (isAdmin) fetchApplications(); }, [filter, isAdmin, fetchApplications]);

  const handleApprove = async (app: Application) => {
    setActionLoading(app.id);
    setError(""); setSuccess("");
    try {
      // Add to local_businesses table
      const { error: bizError } = await supabase
        .from("local_businesses")
        .insert({
          name:         app.name,
          category:     app.category,
          address:      app.address,
          phone:        app.phone,
          website:      app.website,
          description:  app.description,
          latitude:     app.latitude,
          longitude:    app.longitude,
          accepts_leus: true,
        });
      if (bizError) throw bizError;

      // Update application status
      const { error: updateError } = await supabase
        .from("partner_applications")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", app.id);
      if (updateError) throw updateError;

      setSuccess(`✅ ${app.name} approved and added to the map!`);
      setSelected(null);
      fetchApplications();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve application.";
      setError(errorMessage);
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
    setError(""); setSuccess("");
    try {
      const { error } = await supabase
        .from("partner_applications")
        .update({ status: "rejected", rejection_reason: rejectReason })
        .eq("id", app.id);
      if (error) throw error;
      setSuccess(`${app.name} application rejected.`);
      setSelected(null);
      setRejectReason("");
      fetchApplications();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject application.";
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-2xl mb-2">🔒</p>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Admin Access Only</h2>
          <p className="text-gray-500 text-sm">You don&apos;t have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1E3A8A] px-4 pt-8 pb-6 rounded-b-3xl">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "Syne, sans-serif" }}>
            Partner Applications
          </h1>
          <p className="text-white/70 text-sm">Review and approve LEUS partner applications only</p>
          <AdminNav current="partners" />
          <div className="flex gap-2 mt-4">
            {(["pending", "approved", "rejected"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  filter === f ? "bg-[#10B981] text-white" : "bg-white/20 text-white/80"
                }`}>
                {f}
              </button>
            ))}
            <button onClick={fetchApplications}
              className="ml-auto bg-white/20 text-white p-1.5 rounded-full">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 pb-10">
        {error   && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No {filter} applications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map(app => (
              <div key={app.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{app.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {app.category}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(app.created_at)}</span>
                </div>

                <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{app.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{app.contact_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{app.contact_email}</span>
                  </div>
                  {app.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{app.phone}</span>
                    </div>
                  )}
                  {app.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <a href={app.website} target="_blank" rel="noreferrer"
                        className="text-[#10B981] hover:underline truncate">{app.website}</a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                    <span className="text-xs text-gray-500 font-mono">
                      {app.latitude}, {app.longitude}
                    </span>
                    <a href={`https://maps.google.com/?q=${app.latitude},${app.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs text-[#10B981] hover:underline">View map →</a>
                  </div>
                </div>

                {app.description && (
                  <p className="text-xs text-gray-500 italic mb-4 bg-gray-50 rounded-lg p-3">
                    &ldquo;{app.description}&rdquo;
                  </p>
                )}

                {/* Actions */}
                {filter === "pending" && (
                  <>
                    {selected?.id === app.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Rejection reason (required)..."
                          rows={2}
                          className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => { setSelected(null); setRejectReason(""); setError(""); }}
                            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-xl text-sm">
                            Cancel
                          </button>
                          <button onClick={() => handleReject(app)}
                            disabled={actionLoading === app.id}
                            className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-1 disabled:opacity-70">
                            {actionLoading === app.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <><XCircle className="w-4 h-4" />Confirm Reject</>}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => setSelected(app)}
                          className="flex-1 border border-red-300 text-red-500 py-2.5 rounded-xl text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-1">
                          <XCircle className="w-4 h-4" />Reject
                        </button>
                        <button onClick={() => handleApprove(app)}
                          disabled={actionLoading === app.id}
                          className="flex-1 bg-[#10B981] text-white py-2.5 rounded-xl text-sm hover:bg-[#0d9668] transition-colors flex items-center justify-center gap-1 disabled:opacity-70">
                          {actionLoading === app.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><CheckCircle className="w-4 h-4" />Approve & Add to Map</>}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {filter === "approved" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[#10B981] text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Approved — visible on map</span>
                    </div>
                    <button onClick={() => setSelected(app)}
                      className="w-full border border-red-300 text-red-500 py-2.5 rounded-xl text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-1">
                      <XCircle className="w-4 h-4" />Reject Manually
                    </button>
                  </div>
                )}

                {filter === "rejected" && (
                  <div className="space-y-3">
                    <div className="text-sm text-red-500">
                      <span className="font-medium">Rejected: </span>
                      <span>{app.rejection_reason}</span>
                    </div>
                    <button onClick={() => handleApprove(app)}
                      disabled={actionLoading === app.id}
                      className="w-full bg-[#10B981] text-white py-2.5 rounded-xl text-sm hover:bg-[#0d9668] transition-colors flex items-center justify-center gap-1 disabled:opacity-70">
                      {actionLoading === app.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><CheckCircle className="w-4 h-4" />Approve Manually</>}
                    </button>
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


