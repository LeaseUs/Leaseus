import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Shield, CheckCircle, XCircle, Eye, Loader2,
  ChevronDown, ChevronUp, User, FileText, Star, RefreshCw,
  AlertCircle, LogOut
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Filter = "pending" | "submitted" | "under_review" | "approved" | "rejected";

export function AdminKYC() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<Filter>("submitted");
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [loggingOut, setLoggingOut]     = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId]   = useState<string | null>(null);

  useEffect(() => { checkAdmin(); }, []);
  useEffect(() => { if (isAdmin) fetchApplications(); }, [filter, isAdmin]);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setIsAdmin(data?.role === "admin");
    } catch { setIsAdmin(false); }
    finally { setCheckingAdmin(false); }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("provider_kyc")
        .select(`
          *,
          provider:provider_id(id, full_name, email, avatar_url, avg_rating, total_reviews, role)
        `)
        .eq("status", filter)
        .order("created_at", { ascending: false });
      setApplications(data || []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleApprove = async (app: any) => {
    setActionLoading(app.id); setError(""); setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Update KYC status
      await supabase.from("provider_kyc").update({
        status: "approved",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        gov_id_status: "approved",
        proof_address_status: "approved",
        selfie_status: "approved",
      }).eq("id", app.id);
      // Activate the provider account as part of approval.
      await supabase.from("profiles").update({
        kyc_verified: true,
        status: "active",
      }).eq("id", app.provider_id);
      setSuccess(`✅ ${app.provider?.full_name} approved and verified!`);
      setExpandedId(null);
      fetchApplications();
    } catch (err: any) { setError(err.message || "Failed to approve."); }
    finally { setActionLoading(null); }
  };

  const handleRequestMoreInfo = async (app: any) => {
    setActionLoading(app.id);
    try {
      await supabase.from("provider_kyc").update({
        status: "under_review",
        admin_notes: "Additional information requested",
      }).eq("id", app.id);
      await supabase.from("profiles").update({ status: "pending" }).eq("id", app.provider_id);
      setSuccess("Application moved to under review.");
      fetchApplications();
    } catch (err: any) { setError(err.message); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (app: any) => {
    if (!rejectReason.trim()) { setError("Please provide a rejection reason."); return; }
    setActionLoading(app.id); setError(""); setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("provider_kyc").update({
        status: "rejected",
        rejection_reason: rejectReason,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", app.id);
      await supabase.from("profiles").update({
        status: "rejected",
        kyc_verified: false,
      }).eq("id", app.provider_id);
      setSuccess(`${app.provider?.full_name} application rejected.`);
      setRejectingId(null);
      setRejectReason("");
      fetchApplications();
    } catch (err: any) { setError(err.message || "Failed to reject."); }
    finally { setActionLoading(null); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem("isLoggedIn");
    navigate("/login", { replace: true });
  };

  if (checkingAdmin) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
      <div className="text-4xl">🔒</div>
      <h2 className="text-xl font-bold text-gray-800">Admin Access Only</h2>
      <p className="text-gray-500 text-sm">You don't have permission to view this page.</p>
    </div>
  );

  const filterCounts: Record<Filter, number> = {
    pending: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0,
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/90 backdrop-blur-lg px-4 pt-8 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              KYC Review Panel
            </h1>
            <p className="text-white/70 text-sm">Provider verification applications</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchApplications}
              className="bg-white/20 text-white p-2 rounded-full"
              aria-label="Refresh applications"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3 py-2 rounded-full bg-white/15 text-white text-sm flex items-center gap-2 disabled:opacity-70"
            >
              {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Logout
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {(["submitted", "under_review", "approved", "rejected", "pending"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                filter === f ? "bg-[#10B981] text-white" : "bg-white/20 text-white/80"
              }`}>
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 pb-10 space-y-3">
        {error   && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" /></div>
        ) : applications.length === 0 ? (
          <div className="bg-white/80 rounded-xl p-10 text-center border border-white/30">
            <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No {filter.replace("_", " ")} applications</p>
          </div>
        ) : applications.map(app => {
          const isExpanded = expandedId === app.id;
          const transcript = app.assessment_transcript || [];

          return (
            <div key={app.id} className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/30 overflow-hidden">
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  {app.provider?.avatar_url ? (
                    <img src={app.provider.avatar_url} alt={app.provider.full_name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#10B981] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {app.provider?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{app.provider?.full_name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{app.provider?.role?.replace("_", " ")}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Submitted: {app.submitted_at ? formatDate(app.submitted_at) : formatDate(app.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      app.status === "approved" ? "bg-green-100 text-green-700" :
                      app.status === "rejected" ? "bg-red-100 text-red-700" :
                      app.status === "under_review" ? "bg-orange-100 text-orange-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>{app.status.replace("_", " ")}</span>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="text-xs font-medium text-gray-700 truncate">{app.category || "N/A"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">AI Score</p>
                    {app.assessment_score != null ? (
                      <p className={`text-xs font-bold px-1 rounded ${getScoreColor(app.assessment_score)}`}>
                        {app.assessment_score}/100
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">Not done</p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">Docs</p>
                    <p className="text-xs font-medium text-gray-700">
                      {[app.gov_id_url, app.proof_address_url, app.selfie_url, app.certifications_url, app.business_reg_url].filter(Boolean).length}/5
                    </p>
                  </div>
                </div>

                <button onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 py-1">
                  {isExpanded ? <><ChevronUp className="w-4 h-4" />Hide Details</> : <><ChevronDown className="w-4 h-4" />View Details</>}
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-4">

                  {/* Declaration */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />Declaration
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs text-gray-600">
                      <div><span className="font-medium">Service area:</span> {app.service_area || "N/A"}</div>
                      <div><span className="font-medium">Availability:</span> {app.availability || "N/A"}</div>
                      <div><span className="font-medium">DBS consent:</span> {app.dbs_consent ? "✅ Yes" : "❌ No"}</div>
                      <div><span className="font-medium">Qualifications:</span> {app.qualifications_declared || "N/A"}</div>
                    </div>
                  </div>

                  {/* Documents checklist */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />Documents
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        { label: "Government ID", url: app.gov_id_url, status: app.gov_id_status },
                        { label: "Proof of Address", url: app.proof_address_url, status: app.proof_address_status },
                        { label: "Selfie with ID", url: app.selfie_url, status: app.selfie_status },
                        { label: "Certifications", url: app.certifications_url, status: app.certifications_status },
                        { label: "Business Reg.", url: app.business_reg_url, status: app.business_reg_status },
                      ].map(({ label, url, status }) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {url ? <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" /> : <XCircle className="w-3.5 h-3.5 text-gray-300" />}
                            <span className={url ? "text-gray-700" : "text-gray-400"}>{label}</span>
                          </div>
                          {url && (
                            <a href={url} target="_blank" rel="noreferrer"
                              className="text-[#1E3A8A] hover:underline flex items-center gap-0.5">
                              <Eye className="w-3 h-3" />View
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Assessment Transcript */}
                  {transcript.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" />AI Assessment Transcript
                        {app.assessment_score != null && (
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${getScoreColor(app.assessment_score)}`}>
                            Score: {app.assessment_score}/100
                          </span>
                        )}
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {transcript.map((msg: any, i: number) => (
                          <div key={i} className={`text-xs ${msg.role === "assistant" ? "text-blue-700" : "text-gray-700"}`}>
                            <span className="font-medium">{msg.role === "assistant" ? "Assessor: " : "Provider: "}</span>
                            {msg.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin notes */}
                  {app.admin_notes && (
                    <div className="bg-orange-50 rounded-lg p-3 text-xs text-orange-700">
                      <span className="font-medium">Admin notes: </span>{app.admin_notes}
                    </div>
                  )}
                  {app.rejection_reason && (
                    <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700">
                      <span className="font-medium">Rejection reason: </span>{app.rejection_reason}
                    </div>
                  )}

                  {/* Action buttons */}
                  {filter === "submitted" && (
                    <>
                      {rejectingId === app.id ? (
                        <div className="space-y-2">
                          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="Rejection reason (required)..." rows={2}
                            className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300" />
                          <div className="flex gap-2">
                            <button onClick={() => { setRejectingId(null); setRejectReason(""); setError(""); }}
                              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-xl text-xs">Cancel</button>
                            <button onClick={() => handleReject(app)} disabled={actionLoading === app.id}
                              className="flex-1 bg-red-500 text-white py-2 rounded-xl text-xs flex items-center justify-center gap-1 disabled:opacity-70">
                              {actionLoading === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              Confirm Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => setRejectingId(app.id)}
                            className="py-2.5 border border-red-300 text-red-500 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-red-50">
                            <XCircle className="w-3.5 h-3.5" />Reject
                          </button>
                          <button onClick={() => handleRequestMoreInfo(app)} disabled={actionLoading === app.id}
                            className="py-2.5 border border-orange-300 text-orange-600 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-orange-50 disabled:opacity-70">
                            <AlertCircle className="w-3.5 h-3.5" />Review
                          </button>
                          <button onClick={() => handleApprove(app)} disabled={actionLoading === app.id}
                            className="py-2.5 bg-[#10B981] text-white rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-[#0d9668] disabled:opacity-70">
                            {actionLoading === app.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <><CheckCircle className="w-3.5 h-3.5" />Approve</>}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {filter === "under_review" && (
                    <div className="flex gap-2">
                      <button onClick={() => setRejectingId(app.id)}
                        className="flex-1 py-2.5 border border-red-300 text-red-500 rounded-xl text-xs flex items-center justify-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />Reject
                      </button>
                      <button onClick={() => handleApprove(app)} disabled={actionLoading === app.id}
                        className="flex-1 py-2.5 bg-[#10B981] text-white rounded-xl text-xs flex items-center justify-center gap-1 disabled:opacity-70">
                        {actionLoading === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" />Approve</>}
                      </button>
                    </div>
                  )}

                  {filter === "approved" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[#10B981] text-xs">
                        <CheckCircle className="w-4 h-4" />Approved on {app.reviewed_at ? formatDate(app.reviewed_at) : "N/A"}
                      </div>
                      <button onClick={() => setRejectingId(app.id)}
                        className="w-full py-2.5 border border-red-300 text-red-500 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-red-50">
                        <XCircle className="w-3.5 h-3.5" />Reject Manually
                      </button>
                    </div>
                  )}

                  {filter === "rejected" && (
                    <div className="space-y-2">
                      <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700">
                        <span className="font-medium">Rejected application</span>
                      </div>
                      <button onClick={() => handleApprove(app)} disabled={actionLoading === app.id}
                        className="w-full py-2.5 bg-[#10B981] text-white rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-[#0d9668] disabled:opacity-70">
                        {actionLoading === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" />Approve Manually</>}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
