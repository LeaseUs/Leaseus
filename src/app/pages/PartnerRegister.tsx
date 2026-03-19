import { useState } from "react";
import { useNavigate } from "react-router";
import { MapPin, Phone, Globe, Building2, Loader2, CheckCircle, ChevronDown } from "lucide-react";
import { supabase } from "../../lib/supabase";

const CATEGORIES = [
  "Food & Drink",
  "Retail",
  "Health & Beauty",
  "Entertainment",
  "Professional Services",
  "Fitness & Wellness",
  "Electronics & Repair",
  "Cleaning & Laundry",
  "Other",
];

export function PartnerRegister() {
  const navigate = useNavigate();
  const [step, setStep]       = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState({
    name:        "",
    category:    "",
    address:     "",
    city:        "",
    postcode:    "",
    phone:       "",
    website:     "",
    description: "",
    contact_name:  "",
    contact_email: "",
    latitude:    "",
    longitude:   "",
  });

  const update = (key: string, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  // Auto-detect location
  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        update("latitude",  coords.latitude.toString());
        update("longitude", coords.longitude.toString());
        setLocating(false);
      },
      () => {
        setError("Could not detect location. Please enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      if (!form.name || !form.category || !form.address || !form.contact_email) {
        setError("Please fill in all required fields.");
        setLoading(false);
        return;
      }

      if (!form.latitude || !form.longitude) {
        setError("Please provide your business location coordinates.");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("partner_applications")
        .insert({
          name:          form.name,
          category:      form.category,
          address:       `${form.address}, ${form.city} ${form.postcode}`.trim(),
          phone:         form.phone || null,
          website:       form.website || null,
          description:   form.description || null,
          contact_name:  form.contact_name,
          contact_email: form.contact_email,
          latitude:      parseFloat(form.latitude),
          longitude:     parseFloat(form.longitude),
          status:        "pending",
          accepts_leus:  true,
        });

      if (insertError) throw insertError;

      setStep(3);
    } catch (err: any) {
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1E3A8A] px-4 pt-8 pb-8 rounded-b-3xl">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "Syne, sans-serif" }}>
            Become a <span className="text-[#10B981]">LEUS Partner</span>
          </h1>
          <p className="text-white/80 text-sm">
            Accept LEUS payments, gain new customers, and appear on the LeaseUs map.
          </p>

          {/* Benefits */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: "💸", label: "1% fees" },
              { icon: "🗺️", label: "Map listing" },
              { icon: "⚡", label: "Instant pay" },
            ].map((b, i) => (
              <div key={i} className="bg-white/15 rounded-xl p-2 text-center">
                <p className="text-lg">{b.icon}</p>
                <p className="text-white/90 text-xs mt-0.5">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 pb-10">

        {/* Step indicators */}
        {step < 3 && (
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${step >= s ? "bg-[#1E3A8A] text-white" : "bg-gray-200 text-gray-500"}`}>
                  {s}
                </div>
                <span className={`text-xs ${step >= s ? "text-[#1E3A8A]" : "text-gray-400"}`}>
                  {s === 1 ? "Business Info" : "Location & Contact"}
                </span>
                {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? "bg-[#1E3A8A]" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* ── STEP 1: Business Info ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Business Information</h2>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Business Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.name} onChange={e => update("name", e.target.value)}
                  placeholder="e.g. Green Cafe"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Category *</label>
              <div className="relative">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select value={form.category} onChange={e => update("category", e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm appearance-none">
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Street Address *</label>
              <input value={form.address} onChange={e => update("address", e.target.value)}
                placeholder="123 High Street"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">City *</label>
                <input value={form.city} onChange={e => update("city", e.target.value)}
                  placeholder="London"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Postcode</label>
                <input value={form.postcode} onChange={e => update("postcode", e.target.value)}
                  placeholder="SW1A 1AA"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => update("description", e.target.value)}
                placeholder="Tell customers about your business..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm resize-none" />
            </div>

            <button onClick={() => {
              if (!form.name || !form.category || !form.address || !form.city) {
                setError("Please fill in all required fields.");
                return;
              }
              setError("");
              setStep(2);
            }}
              className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors text-sm font-medium">
              Next → Contact & Location
            </button>
          </div>
        )}

        {/* ── STEP 2: Contact & Location ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Contact & Location</h2>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Contact Name *</label>
              <input value={form.contact_name} onChange={e => update("contact_name", e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Contact Email *</label>
              <input type="email" value={form.contact_email} onChange={e => update("contact_email", e.target.value)}
                placeholder="you@business.com"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.phone} onChange={e => update("phone", e.target.value)}
                  placeholder="+44 7700 000000"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.website} onChange={e => update("website", e.target.value)}
                  placeholder="https://yourbusiness.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">Business Location *</label>
              <button onClick={detectLocation} disabled={locating}
                className="w-full flex items-center justify-center gap-2 border-2 border-[#10B981] text-[#10B981] py-3 rounded-xl hover:bg-[#10B981]/10 transition-colors text-sm mb-3 disabled:opacity-70">
                {locating
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Detecting...</>
                  : <><MapPin className="w-4 h-4" />Use My Current Location</>}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                  <input value={form.latitude} onChange={e => update("latitude", e.target.value)}
                    placeholder="51.5074"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                  <input value={form.longitude} onChange={e => update("longitude", e.target.value)}
                    placeholder="-0.1276"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Or find coordinates at maps.google.com → right-click → "What's here?"
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setError(""); setStep(1); }}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl text-sm">
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-[#10B981] text-white py-3 rounded-xl hover:bg-[#0d9668] transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : "Submit Application"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success ── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-[#10B981]" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Application Submitted!</h2>
            <p className="text-gray-600 text-sm mb-2">
              Thank you, <strong>{form.contact_name}</strong>! We've received your application for <strong>{form.name}</strong>.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Our team will review your application within 2-3 business days and contact you at <strong>{form.contact_email}</strong>.
            </p>
            <div className="bg-[#10B981]/10 rounded-xl p-4 mb-6 text-left space-y-2">
              <p className="text-sm font-medium text-[#10B981]">What happens next:</p>
              <p className="text-xs text-gray-600">✅ Application reviewed by LeaseUs team</p>
              <p className="text-xs text-gray-600">✅ Approval email sent to {form.contact_email}</p>
              <p className="text-xs text-gray-600">✅ Business appears on LeaseUs map</p>
              <p className="text-xs text-gray-600">✅ Start accepting LEUS payments</p>
            </div>
            <button onClick={() => navigate("/")}
              className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors text-sm">
              Back to LeaseUs
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


