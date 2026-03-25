import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setAllowed(Boolean(session));
      setCheckingSession(false);
      if (!session) {
        setError("Your reset link is missing or has expired. Please request a new one.");
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setAllowed(true);
        setError("");
      }
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!password || password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated. You can sign in with your new password now.");
    setTimeout(() => navigate("/login"), 1200);
  };

  return (
    <div className="leaseus-auth-screen min-h-screen flex items-center justify-center px-6 max-w-md mx-auto">
      <div className="leaseus-auth-overlay absolute inset-0" />

      <div className="leaseus-auth-card w-full rounded-2xl p-6 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#1E3A8A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A8A]">Reset Password</h1>
            <p className="text-sm text-gray-600">Choose a new password for your account.</p>
          </div>
        </div>

        {checkingSession ? (
          <div className="py-12 flex items-center justify-center text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                {message}
              </div>
            )}

            {allowed && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter a new password"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl text-sm disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : "Update Password"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
