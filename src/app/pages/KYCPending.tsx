import { useNavigate } from 'react-router';
import { Shield, Clock, Mail } from 'lucide-react';

export function KYCPending() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-10 h-10 text-[#1E3A8A]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Application Under Review</h1>
        <p className="text-gray-500 text-sm mb-6">
          Your KYC application has been submitted and is being reviewed by our team. We'll notify you via email within 2-3 business days.
        </p>
        <div className="bg-blue-50 rounded-xl p-4 text-left space-y-2 mb-6">
          <p className="text-xs font-medium text-[#1E3A8A]">What's next?</p>
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <Clock className="w-4 h-4 text-[#1E3A8A]" />
            <span>Review takes 2-3 business days</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <Mail className="w-4 h-4 text-[#1E3A8A]" />
            <span>You'll receive an email once approved</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl text-sm"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}