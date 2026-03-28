import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { Loader2, ChevronRight, Building, User } from 'lucide-react';
import { fetchAuthBootstrap, resolvePostAuthDestination } from '../../lib/authBootstrap';

const CATEGORIES = [
  "Cleaning", "Plumbing", "Car Wash", "Hair & Beauty", "Painting",
  "Photography", "IT Services", "Healthcare", "Tutoring / Education",
  "Legal Services", "Accounting / Finance", "Moving / Removals",
  "Pest Control", "Electrical", "Gardening / Landscaping",
  "Personal Training", "Catering / Events", "Pet Care / Grooming",
  "Security Services", "Laundry / Ironing", "Other",
];

export function ProviderOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    category: '',
    businessType: 'individual', // 'individual' or 'company'
    companyName: '',
    companyRegNumber: '',
    yearsExperience: 0,
    bio: '',
  });

  // Check if user already has a KYC record – if yes, skip onboarding
  useEffect(() => {
    const checkExistingKyc = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        navigate('/signup');
        return;
      }

      if (profile.role !== 'provider' && profile.role !== 'local_business') {
        navigate('/home');
        return;
      }

      const { data: kyc } = await supabase
        .from('provider_kyc')
        .select('id, status')
        .eq('provider_id', user.id)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);
      if (kyc?.[0]) {
        const bootstrap = await fetchAuthBootstrap(user.id);
        navigate(resolvePostAuthDestination(bootstrap), { replace: true });
        return;
      }

      if (profile.status === 'active') {
        navigate('/home');
        return;
      }
      if (profile.status === 'rejected') {
        navigate('/kyc-rejected');
      }
    };
    checkExistingKyc();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Validate required fields
      if (!formData.category) throw new Error('Please select a service category');
      if (formData.businessType === 'company' && !formData.companyName) {
        throw new Error('Please enter company name');
      }

      const payload = {
        provider_id: user.id,
        category: formData.category,
        business_type: formData.businessType,
        company_name: formData.businessType === 'company' ? formData.companyName : null,
        company_reg_number: formData.businessType === 'company' ? formData.companyRegNumber : null,
        years_experience: formData.yearsExperience,
        bio: formData.bio,
        status: 'pending',
        current_step: 1,
        updated_at: new Date().toISOString(),
      };

      const { data: existingKyc } = await supabase
        .from('provider_kyc')
        .select('id')
        .eq('provider_id', user.id)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      const latestKyc = existingKyc?.[0];

      const kycResult = await (latestKyc
        ? supabase.from('provider_kyc').update(payload).eq('id', latestKyc.id).select('id').single()
        : supabase.from('provider_kyc').insert({
            ...payload,
            created_at: new Date().toISOString(),
          }).select('id').single());

      if (kycResult.error) throw kycResult.error;

      // Redirect to the main KYC form (which will now see this record and continue)
      navigate('/home/kyc', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Provider Onboarding</h1>
        <p className="text-sm text-gray-500 mb-6">Tell us about your business to get started.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:outline-none"
              required
            >
              <option value="">Select a category</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Business Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Type *</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, businessType: 'individual' })}
                className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold ${
                  formData.businessType === 'individual'
                    ? 'border-[#10B981] bg-[#10B981]/10 text-[#10B981]'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                <User className="w-4 h-4 inline mr-1" /> Individual
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, businessType: 'company' })}
                className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold ${
                  formData.businessType === 'company'
                    ? 'border-[#10B981] bg-[#10B981]/10 text-[#10B981]'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                <Building className="w-4 h-4 inline mr-1" /> Company
              </button>
            </div>
          </div>

          {/* Company fields (conditional) */}
          {formData.businessType === 'company' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration Number</label>
                <input
                  type="text"
                  value={formData.companyRegNumber}
                  onChange={(e) => setFormData({ ...formData, companyRegNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Years of Experience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
            <input
              type="number"
              min="0"
              value={formData.yearsExperience}
              onChange={(e) => setFormData({ ...formData, yearsExperience: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:outline-none"
            />
          </div>

          {/* Bio / Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Short Bio (optional)</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell clients a bit about yourself and your services..."
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#10B981] text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue to KYC'}
            {!loading && <ChevronRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
