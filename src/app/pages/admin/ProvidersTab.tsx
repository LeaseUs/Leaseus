import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Shield, XCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Filter = "pending" | "submitted" | "under_review" | "approved" | "rejected";

export function ProvidersTab() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("submitted");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("provider_kyc")
        .select(`
          *,
          provider:provider_id(id, full_name, email, avatar_url, role)
        `)
        .eq("status", filter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load provider applications.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app: any) => {
    setActionLoading(app.id);
    setError("");
    setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("provider_kyc").update({
        status: "approved",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        identity_doc_status: "approved",
        right_to_work_status: app.right_to_work_url ? "approved" : app.right_to_work_status,
        proof_of_address_status: "approved",
        credentials_status: app.credentials_url ? "approved" : app.credentials_status,
        video_selfie_status: "approved",
      }).eq("id", app.id);

      await supabase.from("profiles").update({
        kyc_verified: true,
        status: "active",
      }).eq("id", app.provider_id);

      setSuccess(`${app.provider?.full_name || "Provider"} approved.`);
      setExpandedId(null);
      await fetchApplications();
    } catch (err: any) {
      setError(err.message || "Failed to approve provider.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (app: any) => {
    if (!rejectReason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }
    setActionLoading(app.id);
    setError("");
    setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("provider_kyc").update({
        status: "rejected",
        rejection_reason: rejectReason.trim(),
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", app.id);

      await supabase.from("profiles").update({
        status: "rejected",
        kyc_verified: false,
      }).eq("id", app.provider_id);

      setSuccess(`${app.provider?.full_name || "Provider"} rejected.`);
      setRejectReason("");
      setRejectingId(null);
      await fetchApplications();
    } catch (err: any) {
      setError(err.message || "Failed to reject provider.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (value: string) => new Date(value).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Providers</h2>
            <p className="text-sm text-slate-500">Approve or reject service providers after KYC and skills review.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["submitted", "under_review", "approved", "rejected", "pending"] as Filter[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-colors ${
                  filter === value ? "bg-[#1E3A8A] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {value.replace("_", " ")}
              </button>
            ))}
            <button
              onClick={() => void fetchApplications()}
              className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              aria-label="Refresh provider applications"
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
          <Shield className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">No provider applications in this state.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const open = expandedId === app.id;
            return (
              <div key={app.id} className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{app.provider?.full_name || "Unnamed provider"}</h3>
                    <p className="text-sm text-slate-500">{app.provider?.email || "No email"}</p>
                    <div className="mt-2 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {app.category || "No category"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{app.status.replace("_", " ")}</div>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(app.submitted_at || app.created_at)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                  <div><span className="font-medium">Service area:</span> {app.service_area || "N/A"}</div>
                  <div><span className="font-medium">Availability:</span> {app.availability || "N/A"}</div>
                  <div><span className="font-medium">Nationality:</span> {app.nationality || "N/A"}</div>
                  <div><span className="font-medium">DBS consent:</span> {app.dbs_consent ? "Yes" : "No"}</div>
                  <div><span className="font-medium">DBS Update Service ID:</span> {app.dbs_update_service_id || "N/A"}</div>
                  <div><span className="font-medium">Right to Work code:</span> {app.right_to_work_code || "N/A"}</div>
                </div>

                <button
                  onClick={() => setExpandedId(open ? null : app.id)}
                  className="mt-4 text-sm font-medium text-[#1E3A8A] hover:underline"
                >
                  {open ? "Hide details" : "View details"}
                </button>

                {open && (
                  <div className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4">
                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <div><span className="font-medium">Qualifications:</span> {app.qualifications_declared || "N/A"}</div>
                      <div><span className="font-medium">Assessment:</span> {app.assessment_status || "Not started"}</div>
                      <div><span className="font-medium">Identity document:</span> {app.identity_doc_url ? "Uploaded" : "Missing"}</div>
                      <div><span className="font-medium">Proof of address:</span> {app.proof_of_address_url ? "Uploaded" : "Missing"}</div>
                      <div><span className="font-medium">Video selfie:</span> {app.video_selfie_url ? "Uploaded" : "Missing"}</div>
                      <div><span className="font-medium">Supporting right-to-work document:</span> {app.right_to_work_url ? "Uploaded" : "Optional / none"}</div>
                    </div>

                    {filter === "submitted" || filter === "under_review" ? (
                      rejectingId === app.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rejection reason..."
                            rows={3}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setRejectingId(null); setRejectReason(""); setError(""); }}
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
                            onClick={() => setRejectingId(app.id)}
                            className="flex-1 rounded-2xl border border-red-300 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50"
                          >
                            <span className="inline-flex items-center gap-1"><XCircle className="h-4 w-4" />Reject Provider</span>
                          </button>
                          <button
                            onClick={() => void handleApprove(app)}
                            disabled={actionLoading === app.id}
                            className="flex-1 rounded-2xl bg-emerald-500 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-70"
                          >
                            {actionLoading === app.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <span className="inline-flex items-center gap-1"><CheckCircle className="h-4 w-4" />Approve Provider</span>}
                          </button>
                        </div>
                      )
                    ) : filter === "approved" ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                        <CheckCircle className="h-4 w-4" />Provider approved
                      </div>
                    ) : filter === "rejected" ? (
                      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                        <span className="font-semibold">Reason:</span> {app.rejection_reason || "No rejection reason provided."}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
                        <AlertCircle className="h-4 w-4" />Provider still completing onboarding
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
