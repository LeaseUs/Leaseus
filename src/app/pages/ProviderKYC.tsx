import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle, Upload, FileText, Shield, User,
  ChevronRight, ChevronLeft, Loader2, AlertCircle,
  ClipboardList, MapPin, Clock, XCircle
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Step = 1 | 2 | 3 | 4 | 5;

const CATEGORIES = [
  "Cleaning", "Plumbing", "Car Wash", "Hair & Beauty", "Painting",
  "Photography", "IT Services", "Healthcare", "Tutoring / Education",
  "Legal Services", "Accounting / Finance", "Moving / Removals",
  "Pest Control", "Electrical", "Gardening / Landscaping",
  "Personal Training", "Catering / Events", "Pet Care / Grooming",
  "Security Services", "Laundry / Ironing", "Other",
];

const AVAILABILITY_OPTIONS = [
  "Weekdays only", "Weekends only", "Weekdays & weekends",
  "Evenings only", "Flexible / On demand",
];

const HIGH_RISK_COUNTRIES = ["Afghanistan", "Iraq", "Syria", "Iran", "North Korea", "Somalia", "Yemen"];

export function ProviderKYC() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [kycId, setKycId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [existingKyc, setExistingKyc] = useState<any>(null);

  // Step 1
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [category, setCategory] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [availability, setAvailability] = useState("");
  const [dbsConsent, setDbsConsent] = useState(false);
  const [nationality, setNationality] = useState("");

  // Step 2 – new column names
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [identityPreview, setIdentityPreview] = useState<string | null>(null);
  const [rightToWorkFile, setRightToWorkFile] = useState<File | null>(null);
  const [rightToWorkPreview, setRightToWorkPreview] = useState<string | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);
  const [addressPreview, setAddressPreview] = useState<string | null>(null);
  const [credentialsFile, setCredentialsFile] = useState<File | null>(null);
  const [credentialsPreview, setCredentialsPreview] = useState<string | null>(null);
  const [videoSelfieFile, setVideoSelfieFile] = useState<File | null>(null);
  const [videoSelfiePreview, setVideoSelfiePreview] = useState<string | null>(null);

  const identityRef = useRef<HTMLInputElement>(null);
  const rightToWorkRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const credentialsRef = useRef<HTMLInputElement>(null);
  const videoSelfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileError || !profileData) throw profileError;

      if (profileData.status === "active") {
        navigate("/home");
        return;
      }
      if (profileData.status === "rejected") {
        setError("Your account has been rejected. Contact support.");
        setLoading(false);
        return;
      }

      setProfile(profileData);
      if (profileData.role !== "provider" && profileData.role !== "local_business") {
        navigate("/home");
        return;
      }

      const { data: kyc } = await supabase
        .from("provider_kyc")
        .select("*")
        .eq("provider_id", user.id)
        .single();

      if (kyc) {
        setExistingKyc(kyc);
        setKycId(kyc.id);
        setCategory(kyc.category || "");
        setQualifications(kyc.qualifications_declared || "");
        setServiceArea(kyc.service_area || "");
        setAvailability(kyc.availability || "");
        setTermsAgreed(kyc.terms_agreed || false);
        setDbsConsent(kyc.dbs_consent || false);
        setNationality(kyc.nationality || "");
        if (kyc.current_step) setStep(kyc.current_step);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (
    file: File,
    setFile: (f: File) => void,
    setPreview: (p: string) => void
  ) => {
    setFile(file);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const fullPath = `${user.id}/${path}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(fullPath, file, { upsert: true });
    if (error) throw error;
    return fullPath;
  };

  const handleSaveStep1 = async () => {
    if (!termsAgreed) { setError("You must agree to the terms and code of conduct."); return; }
    if (!category)    { setError("Please select your service category."); return; }
    if (!qualifications) { setError("Please declare your qualifications and experience."); return; }
    if (!serviceArea) { setError("Please enter your service area."); return; }
    if (!availability) { setError("Please select your availability."); return; }
    if (!dbsConsent)  { setError("DBS background check consent is required."); return; }
    if (!nationality) { setError("Please select your nationality."); return; }

    setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const kycData = {
        provider_id: user.id,
        category,
        qualifications_declared: qualifications,
        service_area: serviceArea,
        availability,
        terms_agreed: true,
        terms_agreed_at: new Date().toISOString(),
        dbs_consent: dbsConsent,
        nationality,
        status: "pending",
        current_step: 2,
        updated_at: new Date().toISOString(),
      };

      if (kycId) {
        await supabase.from("provider_kyc").update(kycData).eq("id", kycId);
      } else {
        const { data } = await supabase.from("provider_kyc").insert(kycData).select("id").single();
        setKycId(data?.id || null);
      }
      setStep(2);
    } catch (err: any) { setError(err.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const handleSaveStep2 = async () => {
    if (!identityFile && !existingKyc?.identity_doc_url) { setError("Government ID is required."); return; }
    if (!rightToWorkFile && !existingKyc?.right_to_work_url) { setError("Right to work document is required."); return; }
    if (!addressFile && !existingKyc?.proof_of_address_url) { setError("Proof of address is required."); return; }
    if (!videoSelfieFile && !existingKyc?.video_selfie_url) { setError("Video selfie is required."); return; }

    setSaving(true); setError("");
    try {
      const updates: any = { updated_at: new Date().toISOString(), current_step: 3 };

      if (identityFile)   { updates.identity_doc_url      = await uploadFile(identityFile,   "identity");   updates.identity_doc_status      = "submitted"; }
      if (rightToWorkFile) { updates.right_to_work_url     = await uploadFile(rightToWorkFile, "right_to_work"); updates.right_to_work_status     = "submitted"; }
      if (addressFile)    { updates.proof_of_address_url  = await uploadFile(addressFile,    "proof_address"); updates.proof_of_address_status  = "submitted"; }
      if (credentialsFile){ updates.credentials_url       = await uploadFile(credentialsFile, "credentials");  updates.credentials_status       = "submitted"; }
      if (videoSelfieFile){ updates.video_selfie_url      = await uploadFile(videoSelfieFile, "video_selfie"); updates.video_selfie_status      = "submitted"; }

      await supabase.from("provider_kyc").update(updates).eq("id", kycId);
      setStep(3);
    } catch (err: any) { setError(err.message || "Upload failed."); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const isHighRisk = HIGH_RISK_COUNTRIES.includes(nationality);
      const updates: any = {
        status: "submitted",
        submitted_at: new Date().toISOString(),
        is_high_risk: isHighRisk,
        risk_reason: isHighRisk ? "High‑risk nationality" : null,
        current_step: 5,
      };
      await supabase.from("provider_kyc").update(updates).eq("id", kycId);
      setStep(5);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  // Reusable upload card component
  const DocumentUploadCard = ({ label, sublabel, required, file, preview, existingUrl, onSelect, inputRef, icon }: any) => (
    <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-white/30">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-800">{icon} {label}</p>
          <p className="text-xs text-gray-500">{sublabel}</p>
        </div>
        {(existingUrl || file) && <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0" />}
      </div>
      <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
        onChange={e => e.target.files?.[0] && onSelect(e.target.files[0])} />
      {preview ? (
        <div className="relative">
          <img src={preview} alt={label} className="w-full h-32 object-cover rounded-lg" />
          <button onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-white/90 text-xs px-3 py-1 rounded-full text-gray-700 shadow-sm">
            Change
          </button>
        </div>
      ) : existingUrl ? (
        <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2 text-xs text-green-700">
          <CheckCircle className="w-4 h-4" />Previously uploaded — tap to replace
          <button onClick={() => inputRef.current?.click()} className="ml-auto text-[#1E3A8A] underline">Replace</button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-[#10B981] transition-colors">
          <Upload className="w-6 h-6 text-gray-400" />
          <span className="text-sm text-gray-500">Tap to upload {required ? "(required)" : "(optional)"}</span>
        </button>
      )}
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
    </div>
  );

  if (profile?.status === "rejected") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Account Rejected</h2>
        <p className="text-gray-500 text-sm">Your account has been rejected. Please contact support if you believe this is an error.</p>
        <button onClick={() => navigate("/")} className="bg-[#1E3A8A] text-white px-6 py-2 rounded-xl">Go Home</button>
      </div>
    );
  }

  if (existingKyc?.status === "submitted" || existingKyc?.status === "under_review") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="w-10 h-10 text-[#1E3A8A]" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Application Under Review</h2>
        <p className="text-gray-500 text-sm max-w-xs">
          Your KYC application has been submitted and is being reviewed by our team. We'll notify you within 2-3 business days.
        </p>
        <div className="bg-blue-50 rounded-xl p-4 w-full max-w-xs text-left space-y-2">
          <p className="text-xs font-medium text-[#1E3A8A]">Application status:</p>
          {[
            { label: "Terms & Declaration", done: true },
            { label: "Documents uploaded", done: !!existingKyc?.identity_doc_url },
            { label: "Skills assessment", done: existingKyc?.assessment_status === "completed" },
            { label: "Admin review", done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <CheckCircle className={`w-4 h-4 ${item.done ? "text-[#10B981]" : "text-gray-300"}`} />
              <span className={item.done ? "text-gray-700" : "text-gray-400"}>{item.label}</span>
            </div>
          ))}
        </div>
        {existingKyc?.assessment_status !== "completed" && (
          <button onClick={() => navigate("/home/kyc/assessment")}
            className="w-full max-w-xs bg-[#10B981] text-white py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            <ClipboardList className="w-4 h-4" />Complete Skills Assessment
          </button>
        )}
        <button onClick={() => navigate("/home")} className="text-sm text-gray-500 hover:underline">Back to Home</button>
      </div>
    );
  }

  if (existingKyc?.status === "approved") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-[#10B981]" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">KYC Approved!</h2>
        <p className="text-gray-500 text-sm">You are verified and can now post service listings.</p>
        <button onClick={() => navigate("/home/services")}
          className="bg-[#1E3A8A] text-white px-8 py-3 rounded-xl text-sm">Start Adding Listings</button>
      </div>
    );
  }

  // Normal KYC flow
  return (
    <div className="min-h-screen">
      <div className="bg-[#1E3A8A]/90 backdrop-blur-lg px-4 pt-8 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          {step > 1 && step < 5 && (
            <button onClick={() => setStep(s => (s - 1) as Step)} className="p-2 rounded-full hover:bg-white/20">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Provider Verification
            </h1>
            <p className="text-white/70 text-sm">Step {Math.min(step, 4)} of 4</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1,2,3,4].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${step >= s ? "bg-[#10B981]" : "bg-white/20"}`} />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {["Terms", "Documents", "Assessment", "Submit"].map((label, i) => (
            <span key={i} className={`text-xs ${step >= i + 1 ? "text-[#10B981]" : "text-white/40"}`}>{label}</span>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6 pb-10">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 border border-white/30">
              <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1E3A8A]" />Terms & Code of Conduct
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2 max-h-48 overflow-y-auto mb-4">
                <p className="font-medium text-gray-700">LeaseUs Provider Code of Conduct</p>
                <p>1. You must provide services as described in your listings with professionalism and care.</p>
                <p>2. You must not discriminate against clients based on protected characteristics.</p>
                <p>3. You must maintain appropriate professional qualifications for regulated services.</p>
                <p>4. You must respond to booking requests within 24 hours.</p>
                <p>5. You must not solicit off-platform payments from clients.</p>
                <p>6. You consent to LeaseUs verifying your identity and qualifications.</p>
                <p>7. Fraudulent activity will result in immediate account termination and legal action.</p>
                <p>8. You agree to LeaseUs platform Terms of Service and Privacy Policy.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#10B981]" />
                <span className="text-sm text-gray-700">I have read and agree to the LeaseUs Provider Terms, Code of Conduct and Privacy Policy.</span>
              </label>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 border border-white/30 space-y-4">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-[#1E3A8A]" />Your Professional Profile
              </h2>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Primary Service Category *</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] appearance-none">
                  <option value="">Select your category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Qualifications & Experience *</label>
                <textarea value={qualifications} onChange={e => setQualifications(e.target.value)}
                  placeholder="Describe your qualifications, certifications, years of experience and any relevant training..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />Service Area *
                </label>
                <input value={serviceArea} onChange={e => setServiceArea(e.target.value)}
                  placeholder="e.g. London, Manchester, Birmingham (radius 20 miles)"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />Availability *
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY_OPTIONS.map(opt => (
                    <button key={opt} type="button" onClick={() => setAvailability(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-colors ${availability === opt ? "bg-[#1E3A8A] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nationality *</label>
                <select value={nationality} onChange={e => setNationality(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]">
                  <option value="">Select nationality</option>
                  <option value="UK">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="France">France</option>
                  <option value="Germany">Germany</option>
                  <option value="Spain">Spain</option>
                  <option value="Italy">Italy</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Poland">Poland</option>
                  <option value="Romania">Romania</option>
                  <option value="India">India</option>
                  <option value="Pakistan">Pakistan</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Ghana">Ghana</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Mexico">Mexico</option>
                  <option value="China">China</option>
                  <option value="Japan">Japan</option>
                  <option value="South Korea">South Korea</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 border border-white/30">
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#1E3A8A]" />DBS Background Check
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                LeaseUs requires all providers to consent to a Disclosure and Barring Service (DBS) check. This ensures the safety of our clients and maintains trust on the platform.
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={dbsConsent} onChange={e => setDbsConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#10B981]" />
                <span className="text-sm text-gray-700">I consent to LeaseUs conducting a DBS background check and understand this is required to become a verified provider.</span>
              </label>
            </div>

            <button onClick={handleSaveStep1} disabled={saving}
              className="w-full bg-[#1E3A8A] text-white py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <>Continue to Documents <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 border border-blue-200">
              <p className="font-medium mb-1">📋 Document Requirements</p>
              <p>All documents must be clear, readable and not expired. Files must be JPG, PNG or PDF under 10MB.</p>
            </div>

            <DocumentUploadCard
              label="Government ID *"
              sublabel="Passport, National ID or Driver's Licence"
              required
              file={identityFile}
              preview={identityPreview}
              existingUrl={existingKyc?.identity_doc_url}
              onSelect={(f: File) => handleFileSelect(f, setIdentityFile, setIdentityPreview)}
              inputRef={identityRef}
              icon="🪪"
            />
            <DocumentUploadCard
              label="Right to Work *"
              sublabel="Visa, work permit, or settlement status"
              required
              file={rightToWorkFile}
              preview={rightToWorkPreview}
              existingUrl={existingKyc?.right_to_work_url}
              onSelect={(f: File) => handleFileSelect(f, setRightToWorkFile, setRightToWorkPreview)}
              inputRef={rightToWorkRef}
              icon="📄"
            />
            <DocumentUploadCard
              label="Proof of Address *"
              sublabel="Utility bill or bank statement (within 3 months)"
              required
              file={addressFile}
              preview={addressPreview}
              existingUrl={existingKyc?.proof_of_address_url}
              onSelect={(f: File) => handleFileSelect(f, setAddressFile, setAddressPreview)}
              inputRef={addressRef}
              icon="🏠"
            />
            <DocumentUploadCard
              label="Professional Certifications"
              sublabel="Trade certificates, qualifications (optional)"
              required={false}
              file={credentialsFile}
              preview={credentialsPreview}
              existingUrl={existingKyc?.credentials_url}
              onSelect={(f: File) => handleFileSelect(f, setCredentialsFile, setCredentialsPreview)}
              inputRef={credentialsRef}
              icon="📜"
            />
            <DocumentUploadCard
              label="Video Selfie with ID *"
              sublabel="Hold your ID next to your face"
              required
              file={videoSelfieFile}
              preview={videoSelfiePreview}
              existingUrl={existingKyc?.video_selfie_url}
              onSelect={(f: File) => handleFileSelect(f, setVideoSelfieFile, setVideoSelfiePreview)}
              inputRef={videoSelfieRef}
              icon="🤳"
            />

            <button onClick={handleSaveStep2} disabled={saving}
              className="w-full bg-[#1E3A8A] text-white py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <>Continue to Assessment <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/30 text-center">
              <div className="w-16 h-16 bg-[#1E3A8A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-8 h-8 text-[#1E3A8A]" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Skills Assessment</h2>
              <p className="text-sm text-gray-600 mb-4">
                You'll now complete a dynamic skills assessment tailored specifically to <strong>{category}</strong> providers. Our AI assessor will ask you a series of questions to verify your expertise.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
                <p className="text-xs font-medium text-gray-700">What to expect:</p>
                <p className="text-xs text-gray-600">✅ 8-12 questions specific to your category</p>
                <p className="text-xs text-gray-600">✅ Conversational — the AI may ask follow-ups</p>
                <p className="text-xs text-gray-600">✅ Takes approximately 10-15 minutes</p>
                <p className="text-xs text-gray-600">✅ Your answers are reviewed by our team</p>
                <p className="text-xs text-gray-600">⚠️ Answer honestly — vague answers may delay approval</p>
              </div>
              {existingKyc?.assessment_status === "completed" ? (
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-[#10B981] mx-auto mb-2" />
                  <p className="text-sm text-green-700 font-medium">Assessment completed!</p>
                  <p className="text-xs text-green-600">Score: {existingKyc.assessment_score}/100</p>
                </div>
              ) : (
                <button onClick={() => navigate(`/home/kyc/assessment?kycId=${kycId}&category=${encodeURIComponent(category)}`)}
                  className="w-full bg-[#10B981] text-white py-3.5 rounded-xl text-sm flex items-center justify-center gap-2">
                  <ClipboardList className="w-4 h-4" />Start Skills Assessment
                </button>
              )}
            </div>
            {existingKyc?.assessment_status === "completed" && (
              <button onClick={() => setStep(4)}
                className="w-full bg-[#1E3A8A] text-white py-3.5 rounded-xl text-sm flex items-center justify-center gap-2">
                Continue to Submit <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {!existingKyc?.assessment_status && (
              <button onClick={() => setStep(2)}
                className="w-full border border-gray-300 text-gray-600 py-3 rounded-xl text-sm">
                Back to Documents
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/30">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#1E3A8A]" />Review & Submit
              </h2>
              <div className="space-y-3">
                {[
                  { label: "Terms agreed", done: termsAgreed },
                  { label: "Category selected", done: !!category },
                  { label: "Qualifications declared", done: !!qualifications },
                  { label: "Service area set", done: !!serviceArea },
                  { label: "DBS consent given", done: dbsConsent },
                  { label: "Nationality selected", done: !!nationality },
                  { label: "Government ID uploaded", done: !!identityFile || !!existingKyc?.identity_doc_url },
                  { label: "Right to work uploaded", done: !!rightToWorkFile || !!existingKyc?.right_to_work_url },
                  { label: "Proof of address uploaded", done: !!addressFile || !!existingKyc?.proof_of_address_url },
                  { label: "Video selfie uploaded", done: !!videoSelfieFile || !!existingKyc?.video_selfie_url },
                  { label: "Skills assessment completed", done: existingKyc?.assessment_status === "completed" },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <CheckCircle className={`w-5 h-5 flex-shrink-0 ${done ? "text-[#10B981]" : "text-red-400"}`} />
                    <span className={done ? "text-gray-700" : "text-red-500"}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-xs text-amber-700">
                <strong>⏱ Review time:</strong> Our team will review your application within 2-3 business days. You'll receive an email notification when your account is approved or if additional information is required.
              </p>
            </div>
            <button onClick={handleSubmit} disabled={saving ||
              !termsAgreed || !category || !qualifications || !serviceArea || !dbsConsent || !nationality ||
              (!identityFile && !existingKyc?.identity_doc_url) ||
              (!rightToWorkFile && !existingKyc?.right_to_work_url) ||
              (!addressFile && !existingKyc?.proof_of_address_url) ||
              (!videoSelfieFile && !existingKyc?.video_selfie_url) ||
              existingKyc?.assessment_status !== "completed"}
              className="w-full bg-[#10B981] text-white py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <>Submit KYC Application <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-[#10B981]" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Application Submitted!</h2>
            <p className="text-gray-500 text-sm">
              Your KYC application has been submitted. Our team will review everything and get back to you within 2-3 business days.
            </p>
            <button onClick={() => navigate("/home")}
              className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl text-sm">Back to Home</button>
          </div>
        )}
      </div>
    </div>
  );
}
