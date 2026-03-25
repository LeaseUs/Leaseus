import { useNavigate } from 'react-router';
import { XCircle, Mail } from 'lucide-react';

export function KYCRejected() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Application Rejected</h1>
        <p className="text-gray-500 text-sm mb-6">
          Unfortunately, your KYC application was not approved. You can contact support for more details.
        </p>
        <div className="bg-red-50 rounded-xl p-4 text-left space-y-2 mb-6">
          <p className="text-xs font-medium text-red-700">Possible reasons:</p>
          <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1">
            <li>Incomplete or unclear documents</li>
            <li>Insufficient qualifications for selected services</li>
            <li>Failed identity verification</li>
          </ul>
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